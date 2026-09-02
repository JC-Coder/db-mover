import { MongoClient } from "mongodb";
import { addLog, updateJob } from "../../lib/jobManager";

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
  selectedObjects?: string[]
) => {
  let sourceClient: MongoClient | null = null;
  let targetClient: MongoClient | null = null;

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Starting migration...");

    // 1. Connect
    addLog(jobId, "Connecting to source database...");
    sourceClient = new MongoClient(sourceUri);
    await sourceClient.connect();
    addLog(jobId, "Connected to source.");

    addLog(jobId, "Connecting to target database...");
    targetClient = new MongoClient(targetUri);
    await targetClient.connect();
    addLog(jobId, "Connected to target.");

    const getDbName = (uri: string) => {
      try {
        const url = new URL(uri);
        return url.pathname.replace(/^\//, "").split("?")[0];
      } catch (e) {
        const parts = uri.split("/");
        return parts.length > 3 ? parts[3].split("?")[0] : "";
      }
    };

    const sourceDbName = getDbName(sourceUri);
    const targetDbName = getDbName(targetUri);

    const sourceDbNames: string[] = [];
    if (sourceDbName) {
      sourceDbNames.push(sourceDbName);
    } else {
      addLog(
        jobId,
        "No source database specified. Listing all user databases..."
      );
      const dbs = await sourceClient.db("admin").admin().listDatabases();
      sourceDbNames.push(
        ...dbs.databases
          .map((d) => d.name)
          .filter((name) => !["admin", "local", "config"].includes(name))
      );
    }

    addLog(
      jobId,
      `Found ${sourceDbNames.length} databases to migrate: ${sourceDbNames.join(
        ", "
      )}`
    );

    const selectedSet = selectedObjects && selectedObjects.length > 0 ? new Set(selectedObjects) : null;
    if (selectedSet) {
      addLog(
        jobId,
        `Selective migration enabled (${selectedSet.size} collections selected)`
      );
    }

    // Collection names are only unique within a database, and this loop can span
    // several, so a qualified "db.collection" entry has to match too.
    const isSelected = (dbName: string, colName: string) =>
      !selectedSet ||
      selectedSet.has(`${dbName}.${colName}`) ||
      selectedSet.has(colName);

    let totalDocsCopied = 0;
    let totalCollections = 0;

    // First pass to count collections
    for (const dbName of sourceDbNames) {
      const collections = await sourceClient
        .db(dbName)
        .listCollections()
        .toArray();
      totalCollections += collections.filter(
        (c) => !c.name.startsWith("system.") && isSelected(dbName, c.name)
      ).length;
    }

    if (selectedSet && totalCollections === 0) {
      // An explicit selection that matches nothing means the selection is stale
      // (usually saved against a different source). Completing here would report
      // success for a migration that moved no data at all.
      throw new Error(
        "None of the selected collections exist in the source database. Re-open the selection and choose collections from this source."
      );
    }

    let collectionsProcessed = 0;

    for (const dbName of sourceDbNames) {
      addLog(jobId, `Starting migration for database: ${dbName}`);
      const sourceDb = sourceClient.db(dbName);

      // If target had a DB name, we use that. If not, we use the source DB name on the target server.
      const currentTargetDbName = targetDbName || dbName;
      const targetDb = targetClient.db(currentTargetDbName);

      const collections = await sourceDb.listCollections().toArray();

      for (const colInfo of collections) {
        const colName = colInfo.name;
        if (colName.startsWith("system.")) continue;
        if (!isSelected(dbName, colName)) continue;

        addLog(
          jobId,
          `Processing [${dbName}.${colName}] -> [${currentTargetDbName}.${colName}]`
        );

        const sourceCol = sourceDb.collection(colName);
        const targetCol = targetDb.collection(colName);

        const cursor = sourceCol.find();
        let batch = [];
        const BATCH_SIZE = 1000;

        for await (const doc of cursor) {
          batch.push(doc);
          if (batch.length >= BATCH_SIZE) {
            await targetCol
              .insertMany(batch, { ordered: false })
              .catch((err) => {
                if (err.code !== 11000) console.error(err);
              });
            totalDocsCopied += batch.length;
            batch = [];

            updateJob(jobId, {
              stats: {
                collections: collectionsProcessed,
                documents: totalDocsCopied,
              },
            });
          }
        }

        if (batch.length > 0) {
          await targetCol.insertMany(batch, { ordered: false }).catch((err) => {
            if (err.code !== 11000) console.error(err);
          });
          totalDocsCopied += batch.length;
        }

        collectionsProcessed++;
        const progress = (collectionsProcessed / totalCollections) * 100;
        updateJob(jobId, {
          progress,
          stats: {
            collections: collectionsProcessed,
            documents: totalDocsCopied,
          },
        });
        addLog(jobId, `Finished collection: ${dbName}.${colName}`);
      }
    }

    addLog(jobId, "Migration completed successfully!");
    updateJob(jobId, { status: "completed", progress: 100 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", error);
    addLog(jobId, `Error: ${errorMessage}`);
    updateJob(jobId, { status: "failed", error: errorMessage });
  } finally {
    if (sourceClient) await sourceClient.close();
    if (targetClient) await targetClient.close();
  }
};
