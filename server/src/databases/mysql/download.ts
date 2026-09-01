import mysql from "mysql2/promise";
import archiver from "archiver";

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, "").split("?")[0];
  } catch (e) {
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : "";
  }
};

import { Readable } from "stream";

interface IMysqlStreamableConnection {
  connection: {
    query: (sql: string) => { stream: (options?: object) => Readable };
  };
}

export const runDownload = async (
  sourceUri: string,
  archive: archiver.Archiver,
  selectedObjects?: string[],
) => {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(sourceUri);

    const sourceDbName = getDbName(sourceUri);
    if (sourceDbName) {
      await connection.query(`USE ${mysql.escapeId(sourceDbName)}`);
    }

    // Get list of tables
    const [tables] =
      await connection.query<mysql.RowDataPacket[]>("SHOW TABLES");

    const tableKey = `Tables_in_${sourceDbName || "database"}`;
    let tablesList = tables.map((row) => row[tableKey] as string);

    if (selectedObjects && selectedObjects.length > 0) {
      const selectedSet = new Set(selectedObjects);
      tablesList = tablesList.filter((t) => selectedSet.has(t));
      if (tablesList.length === 0) {
        throw new Error(
          "None of the selected tables exist in the source database. Re-open the selection and choose tables from this source."
        );
      }
    }

    if (tablesList.length === 0) {
      // Create empty manifest if no tables
      archive.append(Buffer.from(JSON.stringify({ tables: [] }, null, 2)), {
        name: "_manifest.json",
      });
    }

    for (const tableName of tablesList) {
      const streamable = connection as unknown as IMysqlStreamableConnection;
      const queryStream = streamable.connection
        .query(`SELECT * FROM ${mysql.escapeId(tableName)}`)
        .stream();

      const tableStream = Readable.from(
        (async function* () {
          yield "[\n";
          let isFirst = true;
          for await (const row of queryStream) {
            if (!isFirst) yield ",\n";
            yield JSON.stringify(row);
            isFirst = false;
          }
          yield "\n]";
        })(),
      );

      archive.append(tableStream, {
        name: `${tableName}.json`,
      });
    }

    await archive.finalize();
  } catch (e) {
    console.error("Download error:", e);
    // Don't destroy archive here - let the adapter handle it
    // Just ensure connection is closed
    throw e;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        // Ignore close errors
        console.warn("Error closing connection:", closeError);
      }
    }
  }
};
