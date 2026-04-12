import { ServiceAccount } from "firebase-admin/app";
import archiver from "archiver";
import { FirebaseMode, IInitializeApp, initializer } from "./helper";

export const runDownload = async (
  sourceUri: string, credent: ServiceAccount, type: string, archive: archiver.Archiver,
) => {
  const client = initializer({
    url: sourceUri,
    credential: credent,
    type: type as FirebaseMode,
    name: `firebaseDefault${Date.now()}`,
  });

  try {
    if (type === "rtdb") {
      await downloadRealTimeDatabase(client, archive);
    } else {
      await downloadFirestore(client, archive);
    }
  } catch (error) {
    console.log("Error during download:", error);
  } finally {
    if (type === "rtdb") {
      await client.database?.app.delete();
    } else {
      await client.firestore?.terminate();
    }
  }
};

const downloadRealTimeDatabase = async (
  client: IInitializeApp, archive: archiver.Archiver,
) => {
  if (!client || !client.database) return;
  const dataBase = client.database;
  const rootRef = dataBase.ref("/");

  let lastKey: string | null = null;
  const BATCH_SIZE = 500;

  while (true) {
    let query = rootRef.orderByKey().limitToFirst(BATCH_SIZE);
    if (lastKey) {
      query = query.startAfter(lastKey);
    }

    const snapshot = await query.once("value");
    if (!snapshot.exists()) break;

    let count = 0;
    snapshot.forEach((child) => {
      const key = child.key;
      const data = child.val();
      if (key) {
        archive.append(JSON.stringify({ [key]: data }), {
          name: `${key}.json`,
        });
        lastKey = key;
        count++;
      }
    });

    if (count < BATCH_SIZE) break;
  }

  return await archive.finalize();
};

const FIRESTORE_DOWNLOAD_MAX_DEPTH = 10;

const downloadFirestore = async (
  client: IInitializeApp, archive: archiver.Archiver,
) => {
  const firestore = client.firestore;
  if (!firestore) return;

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

  const rootCollections = await firestore.listCollections();
  for (const col of rootCollections) {
    await downloadCollection(col, col.id, 0);
  }

  await archive.finalize();
};
