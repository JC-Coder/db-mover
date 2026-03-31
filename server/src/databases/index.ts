import { DatabaseType, IDatabaseAdapter } from "./types";
import { mongoAdapter } from "./mongo";
import { postgresAdapter } from "./postgres";
import { mysqlAdapter } from "./mysql";
import { redisAdapter } from "./redis";
import { firebaseAdapter } from "./firebase";

const adapters: Record<DatabaseType, IDatabaseAdapter> = {
  mongodb: mongoAdapter,
  postgres: postgresAdapter,
  mysql: mysqlAdapter,
  redis: redisAdapter,
  firebase: firebaseAdapter
};

export const getDatabaseAdapter = (dbType: DatabaseType): IDatabaseAdapter => {
  const adapter = adapters[dbType];
  if (!adapter) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
  return adapter;
};

export { DatabaseType } from "./types";
export type { IDatabaseAdapter } from "./types";
