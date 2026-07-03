import mysql from "mysql2/promise";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

const SYSTEM_SCHEMAS = ["information_schema", "mysql", "performance_schema", "sys"];

export const listBrowserObjects = async (
  connection: IBrowserConnection,
): Promise<IBrowserObject[]> => {
  const client = await mysql.createConnection(connection.sourceUri);

  try {
    const [rows] = await client.query<mysql.RowDataPacket[]>(
      `
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM information_schema.tables
        WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA = COALESCE(DATABASE(), TABLE_SCHEMA)
        AND TABLE_SCHEMA NOT IN (?, ?, ?, ?)
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `,
      SYSTEM_SCHEMAS,
    );

    return rows.map((row) => ({
      database: String(row.TABLE_SCHEMA),
      schema: String(row.TABLE_SCHEMA),
      name: String(row.TABLE_NAME),
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
  const client = await mysql.createConnection(connection.sourceUri);
  const startedAt = Date.now();

  try {
    // MySQL does not parameterize identifiers, so escape schema and table names before interpolation.
    const tableRef = request.database
      ? `${mysql.escapeId(request.database)}.${mysql.escapeId(request.objectName)}`
      : mysql.escapeId(request.objectName);
    const [rows] = await client.query<mysql.RowDataPacket[]>(
      `SELECT * FROM ${tableRef} LIMIT ? OFFSET ?`,
      [request.limit, request.offset],
    );
    const records = rows.map((row) => ({ ...row })) as Record<string, unknown>[];
    const columns = Array.from(new Set(records.flatMap((row) => Object.keys(row))));

    return {
      rows: records,
      columns,
      limit: request.limit,
      offset: request.offset,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    await client.end();
  }
};
