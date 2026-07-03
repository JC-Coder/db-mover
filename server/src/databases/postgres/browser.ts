import { Client } from "pg";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

const quoteIdentifier = (name: string): string => {
  return `"${name.replace(/"/g, '""')}"`;
};

export const listBrowserObjects = async (
  connection: IBrowserConnection,
): Promise<IBrowserObject[]> => {
  const client = new Client({
    connectionString: connection.sourceUri,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();

    const result = await client.query<{
      table_schema: string;
      table_name: string;
    }>(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);

    return result.rows.map((row) => ({
      database: row.table_schema,
      schema: row.table_schema,
      name: row.table_name,
      type: "table",
    }));
  } finally {
    await client.end();
  }
};

export const previewBrowserObject = async (
  connection: IBrowserConnection,
  request: IBrowserPreviewRequest,
): Promise<IBrowserPreview> => {
  const client = new Client({
    connectionString: connection.sourceUri,
    connectionTimeoutMillis: 5000,
  });
  const startedAt = Date.now();

  try {
    await client.connect();

    // Table names are selected from schema metadata, but SQL identifiers still need escaping.
    const schema = request.schema || request.database || "public";
    const tableRef = `${quoteIdentifier(schema)}.${quoteIdentifier(request.objectName)}`;
    const result = await client.query<Record<string, unknown>>(
      `SELECT * FROM ${tableRef} LIMIT $1 OFFSET $2`,
      [request.limit, request.offset],
    );
    const columns = result.fields.map((field) => field.name);

    return {
      rows: result.rows,
      columns,
      limit: request.limit,
      offset: request.offset,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    await client.end();
  }
};
