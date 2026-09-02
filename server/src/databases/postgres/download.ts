import { Client } from 'pg';
import { Readable } from 'stream';
import archiver from 'archiver';

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, '').split('?')[0];
  } catch (e) {
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : '';
  }
};

import QueryStream from "pg-query-stream";

export const runDownload = async (
  sourceUri: string,
  archive: archiver.Archiver,
  selectedObjects?: string[]
) => {
  let client: Client | null = null;

  try {
    client = new Client({ connectionString: sourceUri });
    await client.connect();

    // Get list of tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let tables = tablesResult.rows.map((row) => row.table_name as string);
    if (selectedObjects && selectedObjects.length > 0) {
      const selectedSet = new Set(selectedObjects);
      tables = tables.filter((t) => selectedSet.has(t));
      if (tables.length === 0) {
        throw new Error(
          "None of the selected tables exist in the source database. Re-open the selection and choose tables from this source."
        );
      }
    }

    for (const tableName of tables) {
      const query = new QueryStream(`SELECT * FROM "${tableName}"`);
      const stream = client.query(query);

      const tableStream = Readable.from(
        (async function* () {
          yield "[\n";
          let isFirst = true;
          for await (const row of stream) {
            if (!isFirst) yield ",\n";
            yield JSON.stringify(row);
            isFirst = false;
          }
          yield "\n]";
        })()
      );

      archive.append(tableStream, {
        name: `${tableName}.json`,
      });
    }

    await archive.finalize();
  } catch (e) {
    console.error('Download error:', e);
    // Don't destroy archive here - let the adapter handle it
    // Just ensure client is closed
    throw e;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        // Ignore close errors
        console.warn('Error closing client:', closeError);
      }
    }
  }
};
