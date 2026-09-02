import { MongoClient } from "mongodb";
import { Readable } from "stream";
import archiver from "archiver";

export const runDownload = async (
  sourceUri: string,
  archive: archiver.Archiver,
  selectedObjects?: string[]
) => {
  let client: MongoClient | null = null;
  const selectedSet = selectedObjects && selectedObjects.length > 0 ? new Set(selectedObjects) : null;

  try {
    client = new MongoClient(sourceUri);
    await client.connect();

    const dbNames: string[] = [];

    // Parse the URI carefully
    let uriDbName = "";
    try {
      const url = new URL(sourceUri);
      uriDbName = url.pathname.replace(/^\//, "").split("?")[0];
    } catch (e) {
      // Fallback for non-standard URIs if URL fails
      const parts = sourceUri.split("/");
      if (parts.length > 3) {
        uriDbName = parts[3].split("?")[0];
      }
    }

    if (uriDbName) {
      dbNames.push(uriDbName);
    } else {
      const dbs = await client.db("admin").admin().listDatabases();
      dbNames.push(
        ...dbs.databases
          .map((d) => d.name)
          .filter((name) => !["admin", "local", "config"].includes(name))
      );
    }

    // Collection names are only unique within a database, and this loop can span
    // several, so a qualified "db.collection" entry has to match too.
    const isSelected = (dbName: string, colName: string) =>
      !selectedSet ||
      selectedSet.has(`${dbName}.${colName}`) ||
      selectedSet.has(colName);

    let exportedCollections = 0;

    for (const dbName of dbNames) {
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();

      for (const colInfo of collections) {
        const colName = colInfo.name;
        if (colName.startsWith("system.")) continue;
        if (!isSelected(dbName, colName)) continue;
        exportedCollections++;

        const col = db.collection(colName);
        const cursor = col.find();

        const collectionStream = Readable.from(
          (async function* () {
            yield "[";
            let isFirst = true;
            for await (const doc of cursor) {
              if (!isFirst) yield ",";
              yield JSON.stringify(doc);
              isFirst = false;
            }
            yield "]";
          })()
        );

        // Use dbName in path to avoid name collisions between different DBs
        archive.append(collectionStream, {
          name: `${dbName}/${colName}.json`,
        });
      }
    }

    if (selectedSet && exportedCollections === 0) {
      throw new Error(
        "None of the selected collections exist in the source database. Re-open the selection and choose collections from this source."
      );
    }

    await archive.finalize();
  } catch (e) {
    console.error("Download error:", e);
    // Don't destroy archive here - let the adapter handle it
    // Just ensure client is closed
    throw e;
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors
        console.warn('Error closing client:', closeError);
      }
    }
  }
};
