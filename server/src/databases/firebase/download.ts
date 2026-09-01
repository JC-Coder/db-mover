import { ServiceAccount } from "firebase-admin/app";
import archiver from "archiver";
import { FirebaseMode, IInitializeApp, initializer } from "./helper";

export const runDownload = async (
  sourceUri: string,
  credent: ServiceAccount,
  type: string,
  archive: archiver.Archiver,
  selectedObjects?: string[],
) => {
  // An unrecognised mode used to initialise neither client, and the download then
  // returned without finalising the archive, leaving the job running forever.
  if (type !== "rtdb" && type !== "firestore") {
    throw new Error(`Unsupported Firebase mode "${type}". Expected "rtdb" or "firestore".`);
  }

  const client = initializer({
    url: sourceUri,
    credential: credent,
    type: type as FirebaseMode,
    name: `firebaseDefault${Date.now()}`,
  });

  try {
    if (type === "rtdb") {
      await downloadRealTimeDatabase(client, archive, selectedObjects);
    } else {
      await downloadFirestore(client, archive, selectedObjects);
    }
  } catch (error) {
    console.log("Error during download:", error);
    throw error;
  } finally {
    if (type === "rtdb") {
      await client.database?.app.delete();
    } else {
      await client.firestore?.terminate();
    }
  }
};

const downloadRealTimeDatabase = async (
  client: IInitializeApp,
  archive: archiver.Archiver,
  selectedObjects?: string[],
) => {
  if (!client || !client.database) {
    throw new Error("Realtime Database client was not initialised.");
  }
  const dataBase = client.database;
  const rootRef = dataBase.ref("/");
  const selectedSet = selectedObjects && selectedObjects.length > 0 ? new Set(selectedObjects) : null;

  let lastKey: string | null = null;
  let exported = 0;
  const BATCH_SIZE = 500;

  while (true) {
    let query = rootRef.orderByKey().limitToFirst(BATCH_SIZE);
    if (lastKey) {
      query = query.startAfter(lastKey);
    }

    const snapshot = await query.once("value");
    if (!snapshot.exists()) break;

    snapshot.forEach((child) => {
      const key = child.key;
      const data = child.val();
      if (key) {
        // Only advance the cursor on a real key; a null one would restart paging.
        lastKey = key;
        if (selectedSet && !selectedSet.has(key)) return;
        archive.append(JSON.stringify({ [key]: data }), {
          name: `${key}.json`,
        });
        exported++;
      }
    });

    if (snapshot.numChildren() < BATCH_SIZE) break;
  }

  if (selectedSet && exported === 0) {
    throw new Error(
      "None of the selected paths exist in the source database. Re-open the selection and choose paths from this source.",
    );
  }

  return await archive.finalize();
};

const FIRESTORE_DOWNLOAD_MAX_DEPTH = 10;

const downloadFirestore = async (
  client: IInitializeApp,
  archive: archiver.Archiver,
  selectedObjects?: string[],
) => {
  const firestore = client.firestore;
  if (!firestore) {
    throw new Error("Firestore client was not initialised.");
  }

  const downloadCollection = async (col: any, path: string, depth: number) => {
    if (depth > FIRESTORE_DOWNLOAD_MAX_DEPTH) return;

    const snapshot = await col.get();
    const docs = [];

    for (const doc of snapshot.docs) {
      const docData = doc.data();
      const docPath = `${path}/${doc.id}`;

      docs.push({
        id: doc.id,
        data: docData,
      });

      // Check for sub-collections
      const subCollections = await doc.ref.listCollections();
      for (const sub of subCollections) {
        await downloadCollection(sub, `${docPath}/${sub.id}`, depth + 1);
      }
    }

    if (docs.length > 0) {
      archive.append(JSON.stringify(docs), {
        name: `${path.replace(/\//g, "_")}.json`,
      });
    }
  };

  let rootCollections = await firestore.listCollections();
  if (selectedObjects && selectedObjects.length > 0) {
    const selectedSet = new Set(selectedObjects);
    rootCollections = rootCollections.filter((col) => selectedSet.has(col.id));
    if (rootCollections.length === 0) {
      throw new Error(
        "None of the selected collections exist in the source database. Re-open the selection and choose collections from this source.",
      );
    }
  }

  for (const col of rootCollections) {
    await downloadCollection(col, col.id, 0);
  }

  await archive.finalize();
};
