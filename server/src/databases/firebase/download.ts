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
  if (!client) return;
  const dataBase = client.database;
  const snapshot = await dataBase?.ref("/").once("value");
  if (!snapshot?.exists()) return;
  const data = snapshot.toJSON();
  if (!data) return;
  archive.append(JSON.stringify(data), {
    name: `${dataBase?.app.name}.json`,
  });
  return await archive.finalize();
};

const downloadFirestore = async (
  client: IInitializeApp, archive: archiver.Archiver,
) => {
  const traverse = async (path = "") => {
    const collections = await client.firestore?.listCollections();
    const items = [];
    if (!collections) return;

    for (const col of collections) {
      const colPath = path ? `${path}/${col.id}` : col.id;

      const snapshot = await col.get();

      for (const doc of snapshot.docs) {
        const docPath = `${colPath}/${doc.id}`;
        items.push({
          documentId: doc.id,
          data: doc.data(),
        });
      }

      const collectionData = {
        collectionId: col.id,
        data: items,
      };

      archive.append(JSON.stringify(collectionData), {
        name: `${col.id}.json`,
      });
    }
  };

  await traverse("");
  await archive.finalize();
};
