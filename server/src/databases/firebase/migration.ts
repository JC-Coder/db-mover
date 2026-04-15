import { Firestore } from "firebase-admin/firestore";
import { addLog, updateJob } from "../../lib/jobManager";
import { FirebaseMode, IInitializeApp, initializer } from "./helper";
import { Database } from "firebase-admin/database";
import { ServiceAccount } from "firebase-admin";

async function migrateDatabase(
  sourceDb: Database,
  targetDb: Database,
  jobId: string,
) {
  const BATCH_SIZE = 100;
  let lastKey: string | null = null;
  let total = 0;

  while (true) {
    let query = sourceDb.ref("/").orderByKey().limitToFirst(BATCH_SIZE);

    if (lastKey) {
      query = sourceDb
        .ref("/")
        .orderByKey()
        .startAfter(lastKey)
        .limitToFirst(BATCH_SIZE);
    }

    const snap = await query.once("value");
    if (!snap.exists()) break;

    const updates: Record<string, any> = {};
    let count = 0;

    snap.forEach((child: any) => {
      updates[`/${child.key}`] = child.val();
      lastKey = child.key;
      count++;
      addLog(
        jobId,
        `Processing [${sourceDb.app.name}.${child.key}] -> [${targetDb.app.name}.${child.key}]`,
      );
    });

    await targetDb.ref("/").update(updates);

    total += count;
    addLog(jobId, `Migrated batch of ${count} nodes (total: ${total})`);
    updateJob(jobId, {
      stats: {
        collections: 1,
        documents: total,
      },
    });

    if (count < BATCH_SIZE) break;
  }
}
const MAX_DEPTH = 15;

async function migrateFirestore(
  sourceFirestore: Firestore,
  targetFirestore: Firestore,
  jobId: string,
) {
  const collections = await sourceFirestore.listCollections();
  let collectionCount = 0;
  const writer = targetFirestore.bulkWriter();

  writer.onWriteError((error) => {
    addLog(
      jobId,
      `Error writing document [${error.documentRef.path}]: ${error.message}`,
    );
    return false;
  });

  for (const col of collections) {
    addLog(
      jobId,
      `Processing [${sourceFirestore.databaseId}.${col.id}] -> [${targetFirestore.databaseId}.${col.id}]`,
    );
    collectionCount++;
    await migrateCollectionRecursive(
      sourceFirestore,
      targetFirestore,
      col.id,
      jobId,
      writer,
      collectionCount,
      0,
    );
    addLog(
      jobId,
      `Sent ${col.id} collection for storage (${collectionCount}/${collections.length})`,
    );
  }

  addLog(jobId, "Waiting for Firestore writes to complete...");
  await writer.close();
}

async function migrateDocWithSubs(
  sourceFirestore: Firestore,
  targetFirestore: Firestore,
  docPath: string,
  jobId: string,
  writer: ReturnType<typeof targetFirestore.bulkWriter>,
  depth: number,
) {
  if (depth >= MAX_DEPTH) {
    addLog(
      jobId,
      `Warning: Maximum depth reached at ${docPath}. Skipping deeper sub-collections.`,
    );
    return 0;
  }

  const sourceRef = sourceFirestore.doc(docPath);
  const targetRef = targetFirestore.doc(docPath);

  const snap = await sourceRef.get();
  if (!snap.exists) return 0;

  try {
    writer.set(targetRef, snap.data() || {});
  } catch (e) {
    addLog(
      jobId,
      `Failed to queue write for ${docPath}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const subCollections = await sourceRef.listCollections();

  for (const sub of subCollections) {
    await migrateCollectionRecursive(
      sourceFirestore,
      targetFirestore,
      `${docPath}/${sub.id}`,
      jobId,
      writer,
      1,
      depth + 1,
    );
  }

  return subCollections.length;
}

async function migrateCollectionRecursive(
  sourceFirestore: Firestore,
  targetFirestore: Firestore,
  collectionPath: string,
  jobId: string,
  writer: ReturnType<typeof targetFirestore.bulkWriter>,
  colCount: number = 1,
  depth: number = 0,
) {
  let lastDoc: any = null;
  const BATCH = 100;
  const id = "__name__";
  let docTotal = 0;

  if (depth >= MAX_DEPTH) {
    return;
  }

  while (true) {
    let query = sourceFirestore
      .collection(collectionPath)
      .orderBy(id)
      .limit(BATCH);

    if (lastDoc) {
      query = sourceFirestore
        .collection(collectionPath)
        .orderBy(id)
        .startAfter(lastDoc)
        .limit(BATCH);
    }

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const path = `${collectionPath}/${doc.id}`;
      const targetRef = targetFirestore.doc(path);

      try {
        writer.set(targetRef, doc.data());
        docTotal++;
        await migrateDocWithSubs(
          sourceFirestore,
          targetFirestore,
          path,
          jobId,
          writer,
          depth,
        );
      } catch (e) {
        addLog(
          jobId,
          `Failed to queue write for ${path}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      lastDoc = doc;
    }

    updateJob(jobId, {
      stats: {
        collections: colCount,
        documents: docTotal,
      },
    });
    if (snap.size < BATCH) break;
  }
}

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
  sourceCredent: ServiceAccount,
  targetCredent: ServiceAccount,
  type: string,
) => {
  let sourceClient: IInitializeApp | null = null;
  let targetClient: IInitializeApp | null = null;

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Starting migration...");

    // 1. Connect
    if (type === "rtdb") {
      addLog(jobId, "Connecting to source database...");
      sourceClient = initializer({
        url: sourceUri,
        type: type as FirebaseMode,
        credential: sourceCredent,
        name: `source_app-${Date.now()}`,
      });
      sourceClient.database?.goOnline();
      const sourceDb = sourceClient.database;
      if (!sourceDb) throw new Error("DB not initialized");
      addLog(jobId, "Connected to source."); 
      addLog(jobId, "Connecting to target database...");
      targetClient = initializer({
        url: targetUri,
        type: type as FirebaseMode,
        credential: targetCredent,
        name: `target_app-${Date.now()}`,
      });
      targetClient.database?.goOnline();
      const targetDb = targetClient.database;
      if (!targetDb) throw new Error("DB not initialized");
      addLog(jobId, "Connected to target.");
      await migrateDatabase(sourceDb, targetDb, jobId);
      addLog(jobId, "Migration completed successfully!");
      updateJob(jobId, { status: "completed", progress: 100 });
    } else {
      addLog(jobId, "Connecting to source database...");
      sourceClient = initializer({
        url: sourceUri,
        type: type as FirebaseMode,
        credential: sourceCredent,
        name: `source_app-${Date.now()}`,
      });
      const sourceFirestore = sourceClient.firestore;
      if (!sourceFirestore) throw new Error("DB not initialized");
      addLog(jobId, "Connected to source.");
      addLog(jobId, "Connecting to target database...");
      targetClient = initializer({
        url: targetUri,
        type: type as FirebaseMode,
        credential: targetCredent,
        name: `target_app-${Date.now()}`,
      });
      const targetFirestore = targetClient.firestore;
      if (!targetFirestore) throw new Error("DB not initialized");
      addLog(jobId, "Connected to target.");
      await migrateFirestore(sourceFirestore, targetFirestore, jobId);
      addLog(jobId, "Migration completed successfully!");
      updateJob(jobId, { status: "completed", progress: 100 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", error);
    addLog(jobId, `Error: ${errorMessage}`);
    updateJob(jobId, { status: "failed", error: errorMessage });
  } finally {
    if (sourceClient) {
      if (sourceClient.database) sourceClient.database.goOffline();
      else if (sourceClient.firestore) sourceClient.firestore.terminate();
    }
    if (targetClient) {
      if (targetClient.database) targetClient.database.goOffline();
      else if (targetClient.firestore) targetClient.firestore.terminate();
    }
  }
};
