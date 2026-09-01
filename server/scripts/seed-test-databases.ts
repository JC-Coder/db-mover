import fs from "fs";
import path from "path";
import { generateKeyPairSync } from "crypto";
import { Client } from "pg";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import Redis from "ioredis";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { FIREBASE_EMULATOR, TEST_CONNECTIONS } from "./test-connections";

// Fixtures for the containers in docker-compose.test.yml. They are shaped to exercise
// the paths that selective transfer makes risky: foreign keys that may point at an
// excluded table, a non-public Postgres schema, collections whose names repeat across
// MongoDB databases, and enough Redis keys to span several key groups.

const seedPostgres = async () => {
  const client = new Client({ connectionString: TEST_CONNECTIONS.postgres.source });
  await client.connect();
  try {
    await client.query(`
      DROP SCHEMA IF EXISTS audit CASCADE;
      DROP TABLE IF EXISTS orders, products, users CASCADE;

      CREATE TABLE users (
        id serial PRIMARY KEY,
        email text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE products (
        id serial PRIMARY KEY,
        title text NOT NULL,
        price numeric(10,2) NOT NULL DEFAULT 0
      );
      -- orders references both, so excluding either one exercises the FK-skip path
      CREATE TABLE orders (
        id serial PRIMARY KEY,
        user_id int REFERENCES users(id) ON DELETE CASCADE,
        product_id int REFERENCES products(id),
        quantity int NOT NULL DEFAULT 1
      );

      -- migration is public-only, so this stays visible in the browser but unselectable
      CREATE SCHEMA audit;
      CREATE TABLE audit.log (id serial PRIMARY KEY, message text);

      INSERT INTO users(email) SELECT 'user' || g || '@example.com' FROM generate_series(1, 50) g;
      INSERT INTO products(title, price) SELECT 'Product ' || g, g * 9.99 FROM generate_series(1, 20) g;
      INSERT INTO orders(user_id, product_id, quantity)
        SELECT (g % 50) + 1, (g % 20) + 1, (g % 5) + 1 FROM generate_series(1, 200) g;
      INSERT INTO audit.log(message) SELECT 'event ' || g FROM generate_series(1, 10) g;
    `);
    console.log("postgres  source seeded: users(50) products(20) orders(200) audit.log(10)");
  } finally {
    await client.end();
  }
};

const seedMysql = async () => {
  const connection = await mysql.createConnection({
    uri: TEST_CONNECTIONS.mysql.source,
    multipleStatements: true,
  });
  try {
    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS orders, products, users;
      SET FOREIGN_KEY_CHECKS = 1;

      CREATE TABLE users (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email varchar(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB;
      CREATE TABLE products (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title varchar(255) NOT NULL
      ) ENGINE=InnoDB;
      CREATE TABLE orders (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id int DEFAULT NULL,
        product_id int DEFAULT NULL,
        KEY user_id (user_id),
        KEY product_id (product_id),
        CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT orders_product_fk FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB;
    `);

    const users = Array.from({ length: 50 }, (_, i) => [`user${i + 1}@example.com`]);
    await connection.query("INSERT INTO users(email) VALUES ?", [users]);
    const products = Array.from({ length: 20 }, (_, i) => [`Product ${i + 1}`]);
    await connection.query("INSERT INTO products(title) VALUES ?", [products]);
    const orders = Array.from({ length: 200 }, (_, i) => [(i % 50) + 1, (i % 20) + 1]);
    await connection.query("INSERT INTO orders(user_id, product_id) VALUES ?", [orders]);

    console.log("mysql     source seeded: users(50) products(20) orders(200, 2 FKs)");
  } finally {
    await connection.end();
  }
};

const seedMongo = async () => {
  const client = new MongoClient(TEST_CONNECTIONS.mongo.source);
  await client.connect();
  try {
    // Same collection name in two databases: selecting one must not drag in the other.
    for (const dbName of ["app_prod", "analytics"]) {
      const db = client.db(dbName);
      await db.dropDatabase();
      await db.collection("users").insertMany(
        Array.from({ length: 30 }, (_, i) => ({
          _id: `${dbName}_user_${i + 1}` as unknown as never,
          email: `user${i + 1}@${dbName}.example.com`,
          source: dbName,
        })),
      );
      await db.collection("events").insertMany(
        Array.from({ length: 40 }, (_, i) => ({ name: `event_${i + 1}`, source: dbName })),
      );
    }
    console.log("mongo     source seeded: app_prod{users:30,events:40} analytics{users:30,events:40}");
  } finally {
    await client.close();
  }
};

const seedRedis = async () => {
  const redis = new Redis(TEST_CONNECTIONS.redis.source);
  try {
    await redis.flushdb();
    const pipeline = redis.pipeline();
    // More than one SCAN page per group, so a truncated listing would be visible.
    for (let i = 1; i <= 400; i += 1) {
      pipeline.set(`user:${i}`, JSON.stringify({ id: i }));
      pipeline.set(`session:${i}`, `token-${i}`);
      pipeline.set(`cache:${i}`, `cached-${i}`);
    }
    for (let i = 1; i <= 50; i += 1) pipeline.set(`rare_group:${i}`, `value-${i}`);
    pipeline.set("standalone_key", "no-prefix");
    await pipeline.exec();
    console.log("redis     source seeded: user(400) session(400) cache(400) rare_group(50) ungrouped(1)");
  } finally {
    redis.disconnect();
  }
};

const EMULATOR_CRED_DIR = path.join(__dirname, "..", "..", "test", "firebase", "generated");

// The emulator ignores credentials but the Admin SDK still parses the private key, so
// mint a throwaway pair rather than committing one that secret scanners would flag.
const writeEmulatorCredentials = () => {
  fs.mkdirSync(EMULATOR_CRED_DIR, { recursive: true });
  const written: Record<string, string> = {};

  for (const projectId of [FIREBASE_EMULATOR.sourceProjectId, FIREBASE_EMULATOR.targetProjectId]) {
    const file = path.join(EMULATOR_CRED_DIR, `${projectId}.json`);
    if (!fs.existsSync(file)) {
      const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            type: "service_account",
            project_id: projectId,
            private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
            client_email: `test@${projectId}.iam.gserviceaccount.com`,
            client_id: "000000000000000000000",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
          },
          null,
          2,
        ),
      );
    }
    written[projectId] = file;
  }

  return written;
};

const seedFirebase = async () => {
  // The Admin SDK routes to the emulators purely off these two variables.
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = FIREBASE_EMULATOR.databaseHost;
  process.env.FIRESTORE_EMULATOR_HOST = FIREBASE_EMULATOR.firestoreHost;

  const credentials = writeEmulatorCredentials();
  const sourceId = FIREBASE_EMULATOR.sourceProjectId;
  const account = JSON.parse(fs.readFileSync(credentials[sourceId], "utf8"));
  const app = initializeApp(
    {
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
      databaseURL: TEST_CONNECTIONS.firebase.source,
    },
    `seed-${Date.now()}`,
  );

  // 130 root nodes clears the migration's 100-node page size, so a selection landing
  // only in the second page exercises the pagination path.
  const updates: Record<string, unknown> = {};
  for (let i = 0; i < 130; i += 1) {
    updates[`/node_${String(i).padStart(3, "0")}`] = { idx: i, label: `node ${i}` };
  }
  await getDatabase(app).ref("/").update(updates);

  const firestore = getFirestore(app);
  for (const collection of ["alpha", "beta"]) {
    const batch = firestore.batch();
    for (let i = 0; i < 12; i += 1) {
      batch.set(firestore.collection(collection).doc(`doc_${i}`), { idx: i, collection });
    }
    await batch.commit();
    // a subcollection, which must ride along with its parent root collection
    await firestore.collection(collection).doc("doc_0").collection("children").doc("child_1").set({ nested: true });
  }

  console.log("firebase  emulator seeded: RTDB 130 root nodes, Firestore alpha(12+1) beta(12+1)");
  console.log("          service accounts: test/firebase/generated/ (upload these in the UI)");
  await deleteApp(app);
};

const main = async () => {
  const only = process.argv[2];
  const seeders: Record<string, () => Promise<void>> = {
    postgres: seedPostgres,
    mysql: seedMysql,
    mongo: seedMongo,
    redis: seedRedis,
    firebase: seedFirebase,
  };

  if (only && !seeders[only]) {
    console.error(`Unknown engine "${only}". Expected one of: ${Object.keys(seeders).join(", ")}`);
    process.exit(1);
  }

  // Only seeded on request: it needs the opt-in emulator container.
  const selected = only ? [only] : Object.keys(seeders).filter((e) => e !== "firebase");
  const failures: string[] = [];

  for (const engine of selected) {
    try {
      await seeders[engine]();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${engine}: ${message}`);
      console.error(`${engine.padEnd(9)} FAILED: ${message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} of ${selected.length} engines failed to seed.`);
    console.error("Are the containers up? Try: npm run db:up");
    process.exit(1);
  }

  console.log("\nAll source databases seeded. Connection strings: npm run db:urls");
};

void main();
