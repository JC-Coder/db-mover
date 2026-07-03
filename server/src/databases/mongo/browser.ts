import { Document, MongoClient } from "mongodb";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

const SYSTEM_DATABASES = new Set(["admin", "local", "config"]);

const getDatabaseFromUri = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, "").split("?")[0];
  } catch {
    const parts = uri.split("/");
    return parts.length > 3 ? parts[3].split("?")[0] : "";
  }
};

const toJsonRecord = (doc: Document): Record<string, unknown> => {
  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
};

export const listBrowserObjects = async (
  connection: IBrowserConnection,
): Promise<IBrowserObject[]> => {
  const client = new MongoClient(connection.sourceUri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();

    const uriDatabase = getDatabaseFromUri(connection.sourceUri);
    const databases = uriDatabase
      ? [uriDatabase]
      : (await client.db("admin").admin().listDatabases()).databases
          .map((database) => database.name)
          .filter((database) => !SYSTEM_DATABASES.has(database));

    const objects: IBrowserObject[] = [];
    for (const database of databases) {
      const collections = await client.db(database).listCollections().toArray();
      for (const collection of collections) {
        if (!collection.name.startsWith("system.")) {
          objects.push({
            database,
            name: collection.name,
            type: "collection",
          });
        }
      }
    }

    return objects;
  } finally {
    await client.close();
  }
};

export const previewBrowserObject = async (
  connection: IBrowserConnection,
  request: IBrowserPreviewRequest,
): Promise<IBrowserPreview> => {
  const client = new MongoClient(connection.sourceUri, { serverSelectionTimeoutMS: 5000 });
  const startedAt = Date.now();

  try {
    await client.connect();

    const database = request.database || getDatabaseFromUri(connection.sourceUri);
    if (!database) {
      throw new Error("Database name is required");
    }

    const collection = client.db(database).collection(request.objectName);
    const docs = await collection
      .find({})
      .skip(request.offset)
      .limit(request.limit)
      .toArray();
    const rows = docs.map(toJsonRecord);
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const total = await collection.estimatedDocumentCount();

    return {
      rows,
      columns,
      total,
      limit: request.limit,
      offset: request.offset,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    await client.close();
  }
};
