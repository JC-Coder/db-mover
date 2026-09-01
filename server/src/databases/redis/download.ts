import Redis from "ioredis";
import { addLog, updateJob } from "../../lib/jobManager";

const getKeyGroup = (key: string) => {
  return key.includes(":") ? key.split(":")[0] : "ungrouped";
};

export const runDownload = async (
  jobId: string,
  sourceUri: string,
  archive: any,
  selectedObjects?: string[],
) => {
  const source = new Redis(sourceUri);
  const selectedSet = selectedObjects && selectedObjects.length > 0 ? new Set(selectedObjects) : null;
  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Connected to Redis instance");

    const dbsize = await source.dbsize();
    let cursor = "0";
    let processedKeys = 0;
    // Progress is measured against the whole keyspace, so it has to count every key
    // scanned rather than only the ones a selection kept.
    let scannedKeys = 0;

    const { PassThrough } = await import("stream");
    const pt = new PassThrough();

    archive.append(pt, { name: "redis_dump.jsonl" });

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
          pipeline.dumpBuffer(key);
          pipeline.pttl(key);
          pipeline.type(key);
        });

        const results = await pipeline.exec();
        let chunk = "";

        if (results) {
          for (let i = 0; i < results.length; i += 3) {
            const key = keys[i / 3];
            // [err, result]
            // pipeline.exec returns [[err, result], ...]

            const dumpRes = results[i];
            const pttlRes = results[i + 1];
            const typeRes = results[i + 2];

            const dumpVal = dumpRes[1];
            const pttlVal = pttlRes[1];
            const typeVal = typeRes[1];

            if (!dumpRes[0] && dumpVal !== null) {
              const record = {
                key,
                value: (dumpVal as Buffer).toString("base64"),
                ttl: pttlVal,
                type: typeVal,
              };
              chunk += JSON.stringify(record) + "\n";
            }
          }
        }

        if (chunk) {
          // Write to stream, respecting backpressure
          if (!pt.write(chunk)) {
            await new Promise((resolve) => pt.once("drain", resolve));
          }
        }

        processedKeys += keys.length;
        const progress = Math.min(
          Math.round((scannedKeys / dbsize) * 100),
          99,
        );
        updateJob(jobId, { progress });
      }
    } while (cursor !== "0");

    if (selectedSet && processedKeys === 0) {
      throw new Error(
        "None of the selected key groups exist in the source database. Re-open the selection and choose key groups from this source.",
      );
    }

    pt.end(); // End the stream

    await archive.finalize();

    updateJob(jobId, { progress: 100, stats: { keys: processedKeys } });
  } catch (e) {
    console.error("Redis download failed:", e);
    throw e;
  } finally {
    source.disconnect();
  }
};
