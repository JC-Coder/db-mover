// Connection strings for the containers in docker-compose.test.yml. Host ports are
// off-default so they never collide with an engine already running on the machine.

export const TEST_CONNECTIONS = {
  postgres: {
    source: "postgresql://dbmover:dbmover@localhost:5442/source_db",
    target: "postgresql://dbmover:dbmover@localhost:5443/target_db",
  },
  mysql: {
    source: "mysql://root:dbmover@localhost:3316/source_db",
    target: "mysql://root:dbmover@localhost:3317/target_db",
  },
  mongo: {
    source: "mongodb://localhost:27027",
    target: "mongodb://localhost:27028",
  },
  redis: {
    source: "redis://localhost:6389",
    target: "redis://localhost:6390",
  },
  // The RTDB emulator separates databases by ?ns=; Firestore separates them by the
  // project id in the service account, so both pairs share one emulator instance.
  firebase: {
    source: "http://localhost:9009/?ns=emu-source",
    target: "http://localhost:9009/?ns=emu-target",
  },
} as const;

export const FIREBASE_EMULATOR = {
  databaseHost: "localhost:9009",
  firestoreHost: "localhost:8088",
  sourceProjectId: "emu-source",
  targetProjectId: "emu-target",
};

if (require.main === module) {
  for (const [engine, pair] of Object.entries(TEST_CONNECTIONS)) {
    console.log(`${engine}:`);
    console.log(`  source  ${pair.source}`);
    console.log(`  target  ${pair.target}`);
  }
}
