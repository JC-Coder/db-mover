import Redis from "ioredis";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

const SCAN_COUNT = 200;
const MAX_SCHEMA_KEYS = 1000;
const UNGROUPED = "ungrouped";

const createRedisClient = (uri: string) => {
  return new Redis(uri, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  });
};

const getKeyGroup = (key: string) => {
  return key.includes(":") ? key.split(":")[0] : UNGROUPED;
};

const truncateString = (value: string) => {
  return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
};

const readRedisValue = async (
  redis: Redis,
  key: string,
  type: string,
): Promise<unknown> => {
  if (type === "string") {
    const value = await redis.get(key);
    return typeof value === "string" ? truncateString(value) : value;
  }

  if (type === "hash") {
    const [, values] = await redis.hscan(key, "0", "COUNT", 50);
    const record: Record<string, string> = {};
    for (let index = 0; index < values.length; index += 2) {
      record[values[index]] = values[index + 1];
    }
    return record;
  }

  if (type === "list") {
    return redis.lrange(key, 0, 49);
  }

  if (type === "set") {
    const [, values] = await redis.sscan(key, "0", "COUNT", 50);
    return values;
  }

  if (type === "zset") {
    const [, values] = await redis.zscan(key, "0", "COUNT", 50);
    const entries: Record<string, string>[] = [];
    for (let index = 0; index < values.length; index += 2) {
      entries.push({ value: values[index], score: values[index + 1] });
    }
    return entries;
  }

  return null;
};

export const listBrowserObjects = async (
  connection: IBrowserConnection,
): Promise<IBrowserObject[]> => {
  const redis = createRedisClient(connection.sourceUri);
  const groups = new Map<string, number>();
  let cursor = "0";
  let scanned = 0;

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "*", "COUNT", SCAN_COUNT);
      cursor = nextCursor;
      scanned += keys.length;

      for (const key of keys) {
        const group = getKeyGroup(key);
        groups.set(group, (groups.get(group) ?? 0) + 1);
      }
    } while (cursor !== "0" && scanned < MAX_SCHEMA_KEYS);

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, count]) => ({
        database: "Redis",
        name,
        type: "keyspace",
        count,
      }));
  } finally {
    redis.disconnect();
  }
};

export const previewBrowserObject = async (
  connection: IBrowserConnection,
  request: IBrowserPreviewRequest,
): Promise<IBrowserPreview> => {
  const redis = createRedisClient(connection.sourceUri);
  const rows: Record<string, unknown>[] = [];
  const startedAt = Date.now();
  let cursor = "0";
  let matched = 0;
  let hasNextPage = false;

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "*", "COUNT", SCAN_COUNT);
      cursor = nextCursor;

      for (const key of keys) {
        if (getKeyGroup(key) !== request.objectName) continue;
        matched += 1;
        if (matched <= request.offset) continue;

        if (rows.length >= request.limit) {
          hasNextPage = true;
          break;
        }

        const type = await redis.type(key);
        const ttl = await redis.ttl(key);
        const value = await readRedisValue(redis, key, type);
        rows.push({ key, type, ttl, value });
      }
    } while (cursor !== "0" && !hasNextPage);

    return {
      rows,
      columns: ["key", "type", "ttl", "value"],
      limit: request.limit,
      offset: request.offset,
      nextCursor: hasNextPage ? String(request.offset + request.limit) : undefined,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    redis.disconnect();
  }
};
