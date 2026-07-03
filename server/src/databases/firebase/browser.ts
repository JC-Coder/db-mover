import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";
import { FirebaseMode, initializer } from "./helper";
import { Query } from "firebase-admin/database";
import { deleteApp } from "firebase-admin/app";

const toJsonValue = (value: unknown): unknown => {
  const serialized = JSON.stringify(value);
  return serialized ? JSON.parse(serialized) as unknown : null;
};

const toJsonRecord = (value: unknown): Record<string, unknown> => {
  const normalized = toJsonValue(value);
  return typeof normalized === "object" && normalized !== null && !Array.isArray(normalized)
    ? normalized as Record<string, unknown>
    : { value: normalized };
};

const getFirebaseMode = (connection: IBrowserConnection): FirebaseMode => {
  return connection.type === "firestore" ? "firestore" : "rtdb";
};

const createBrowserAppName = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const listBrowserObjects = async (
  connection: IBrowserConnection,
): Promise<IBrowserObject[]> => {
  if (!connection.credent) {
    throw new Error("Firebase credentials are required");
  }

  const mode = getFirebaseMode(connection);
  const client = initializer({
    url: connection.sourceUri,
    credential: connection.credent,
    type: mode,
    name: createBrowserAppName("browser"),
  });

  try {
    if (mode === "firestore") {
      const collections = await client.firestore?.listCollections();
      return (collections ?? []).map((collection) => ({
        database: "Firestore",
        name: collection.id,
        type: "collection",
      }));
    }

    const snapshot = await client.database?.ref("/").limitToFirst(100).once("value");
    if (!snapshot?.exists()) return [];

    const objects: IBrowserObject[] = [];
    snapshot.forEach((child) => {
      if (child.key) {
        objects.push({
          database: "Realtime Database",
          name: child.key,
          type: "path",
        });
      }
    });

    return objects.length > 0
      ? objects
      : [{ database: "Realtime Database", name: "/", type: "path" }];
  } finally {
    if (client.firestore) await client.firestore.terminate();
    await deleteApp(client.app);
  }
};

export const previewBrowserObject = async (
  connection: IBrowserConnection,
  request: IBrowserPreviewRequest,
): Promise<IBrowserPreview> => {
  if (!connection.credent) {
    throw new Error("Firebase credentials are required");
  }

  const mode = getFirebaseMode(connection);
  const client = initializer({
    url: connection.sourceUri,
    credential: connection.credent,
    type: mode,
    name: createBrowserAppName("browser-preview"),
  });
  const startedAt = Date.now();

  try {
    if (mode === "firestore") {
      const snapshot = await client.firestore
        ?.collection(request.objectName)
        .offset(request.offset)
        .limit(request.limit)
        .get();
      const rows = (snapshot?.docs ?? []).map((doc) => ({
        id: doc.id,
        ...toJsonRecord(doc.data()),
      }));
      const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

      return {
        rows,
        columns,
        limit: request.limit,
        offset: request.offset,
        elapsedMs: Date.now() - startedAt,
      };
    }

    const path = request.objectName === "/" ? "/" : `/${request.objectName}`;
    let query: Query = client.database!.ref(path).orderByKey();
    if (request.cursor) {
      query = query.startAt(request.cursor);
    }
    const snapshot = await query.limitToFirst(request.limit + (request.cursor ? 1 : 0)).once("value");
    const rows: Record<string, unknown>[] = [];
    let nextCursor: string | undefined;

    if (snapshot.exists() && !snapshot.hasChildren()) {
      rows.push({
        key: request.objectName,
        value: toJsonValue(snapshot.val()),
      });
    } else if (snapshot.exists()) {
      snapshot.forEach((child) => {
        if (!child.key || child.key === request.cursor) return false;

        rows.push({
          key: child.key,
          value: toJsonValue(child.val()),
        });
        nextCursor = child.key;
        return rows.length >= request.limit;
      });
    }

    return {
      rows,
      columns: ["key", "value"],
      limit: request.limit,
      offset: request.offset,
      nextCursor: rows.length === request.limit ? nextCursor : undefined,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    if (client.firestore) await client.firestore.terminate();
    await deleteApp(client.app);
  }
};
