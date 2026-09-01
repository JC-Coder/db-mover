import Redis from "ioredis";
import { addLog, updateJob } from "../../lib/jobManager";

const getKeyGroup = (key: string) => {
  return key.includes(":") ? key.split(":")[0] : "ungrouped";
};

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
  selectedObjects?: string[],
) => {
  const source = new Redis(sourceUri);
  const target = new Redis(targetUri);
  const selectedSet = selectedObjects && selectedObjects.length > 0 ? new Set(selectedObjects) : null;

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Connected to source and target Redis instances");

    if (selectedSet) {
      addLog(jobId, `Selective migration enabled (${selectedSet.size} key groups selected)`);
    }

    let cursor = "0";
    let totalKeys = 0;

    // First count to estimate progress (optional, but good for UX)
    // Note: dbsize is fast but might not be 100% accurate if keys are expiring, but good enough
    const dbsize = await source.dbsize();
    addLog(jobId, `Estimated total keys: ${dbsize}`);

    let processedKeys = 0;
    // Progress is measured against the whole keyspace, so it has to count every key
    // scanned rather than only the ones a selection kept.
    let scannedKeys = 0;

    do {
      const result = await source.scan(cursor, "MATCH", "*", "COUNT", 100);
      cursor = result[0];
      let keys = result[1];
      scannedKeys += keys.length;

      if (selectedSet) {
        keys = keys.filter((key) => selectedSet.has(getKeyGroup(key)));
      }

      if (keys.length > 0) {
        const pipeline = source.pipeline();
        keys.forEach((key) => {
          addLog(jobId, `Copying key: ${key}`);
          pipeline.dumpBuffer(key);
          pipeline.pttl(key);
        });

        const dumpResults = await pipeline.exec();

        if (dumpResults) {
          const targetPipeline = target.pipeline();

          for (let i = 0; i < dumpResults.length; i += 2) {
            const [dumpErr, dumpVal] = dumpResults[i];
            const [pttlErr, pttlVal] = dumpResults[i + 1];
            const key = keys[i / 2];

            if (dumpErr || pttlErr) {
              addLog(
                jobId,
                `Error getting data for key ${key}: ${dumpErr || pttlErr}`,
              );
              continue;
            }

            if (dumpVal === null) {
              // Key might have expired or been deleted
              continue;
            }

            // TTL: If -1, no expiry (use 0 for restore command).
            // Restore command expects ttl in ms. 0 means no ttl.
            const ttl =
              typeof pttlVal === "number" && pttlVal > 0 ? pttlVal : 0;

            // RESTORE key ttl serialized-value [REPLACE]
            // We use REPLACE to overwrite if exists
            targetPipeline.restore(key, ttl, dumpVal as Buffer, "REPLACE");
          }

          const targetResults = await targetPipeline.exec();
          if (targetResults) {
            targetResults.forEach(([err], idx) => {
              if (err) {
                addLog(jobId, `Error restoring key: ${err.message}`);
              }
            });
          }

          processedKeys += keys.length;

          // Update progress and stats
          const progress = Math.min(
            Math.round((scannedKeys / dbsize) * 100),
            99,
          );
          updateJob(jobId, {
            progress,
            stats: {
              documents: processedKeys,
              keys: processedKeys,
              totalDocuments: dbsize,
            },
          });
        }
      }
    } while (cursor !== "0");

    if (selectedSet && processedKeys === 0) {
      // An explicit selection that matches nothing means the selection is stale
      // (usually saved against a different source). Completing here would report
      // success for a migration that moved no data at all.
      throw new Error(
        "None of the selected key groups exist in the source database. Re-open the selection and choose key groups from this source.",
      );
    }

    addLog(jobId, `Migration completed. Processed ${processedKeys} keys.`);
    updateJob(jobId, { status: "completed", progress: 100 });
  } catch (error) {
    console.error("Redis migration failed:", error);
    addLog(jobId, `Migration failed: ${error}`);
    updateJob(jobId, { status: "failed" });
    throw error;
  } finally {
    source.disconnect();
    target.disconnect();
  }
};
