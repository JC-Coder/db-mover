# Testing DB Mover

A migration needs a **source and a target**, so `docker-compose.test.yml` brings up a pair
of every supported engine. Firebase is included too, via the official emulators.

Requires Docker.

## Quick start

```bash
npm run db:up      # start the four engine pairs, wait until healthy
npm run db:seed    # load fixtures into the source databases
npm run db:urls    # print connection strings to paste into the UI
npm run dev        # run the app against them
```

When you're done:

```bash
npm run db:down    # stop everything and delete the volumes
npm run db:reset   # wipe and re-seed without stopping
```

## What's running

Host ports are deliberately off-default so they never collide with an engine already
installed on your machine.

| Engine     | Source           | Target           |
| ---------- | ---------------- | ---------------- |
| PostgreSQL | `localhost:5442` | `localhost:5443` |
| MySQL      | `localhost:3316` | `localhost:3317` |
| MongoDB    | `localhost:27027`| `localhost:27028`|
| Redis      | `localhost:6389` | `localhost:6390` |

Credentials are `dbmover` / `dbmover` (MySQL uses `root` / `dbmover`). `npm run db:urls`
prints the full strings.

## What the fixtures cover

They are shaped around the cases that are easy to break, not just to have data present.

**PostgreSQL and MySQL** — `orders` carries foreign keys to both `users` and `products`.
Migrating a subset therefore exercises constraint handling: a foreign key pointing at an
excluded table has to be dropped, not carried over. On MySQL a carried-over one produces a
table that looks fine and then rejects every write with errno 1452. Postgres additionally
gets an `audit` schema, which the Data Browser lists but transfers do not support.

**MongoDB** — `app_prod` and `analytics` both contain a `users` collection. Collection
names are only unique within a database, so selecting one must not pull in the other.

**Redis** — several key groups of a few hundred keys each, enough that a truncated
key-group listing is visible rather than silent.

**Firebase** — 130 RTDB root nodes, which clears the migration's 100-node page size, so a
selection landing only in the second page exercises pagination. Firestore gets two root
collections, each with a subcollection, since subcollections must ride along with the
parent collection that owns them.

## Firebase

Firebase is opt-in because it builds a JRE image, which is much slower than pulling the
other four.

```bash
npm run db:up:firebase   # everything above, plus the emulators
npm run db:seed firebase # seed the emulator and mint throwaway credentials
```

This needs **no real Firebase project and no billing account**. The Admin SDK routes to
the emulators purely off two environment variables, so the app's own code runs unmodified:

```bash
FIREBASE_DATABASE_EMULATOR_HOST=localhost:9009
FIRESTORE_EMULATOR_HOST=localhost:8088
```

Set those on the server process (`server/.env`) before `npm run dev`.

The emulator ignores credentials, but the Admin SDK still parses the private key, so the
seed script mints a throwaway RSA keypair and writes two service accounts to
`test/firebase/generated/`. That directory is gitignored — never commit a key, even a fake
one. Upload those JSON files in the UI where you would normally upload a real service
account.

One emulator instance hosts both sides. Realtime Database separates them by namespace
(`?ns=emu-source` / `?ns=emu-target`); Firestore separates them by the project id baked
into each service account.

### Testing against real Firebase projects

The emulator covers the migration logic. If you need to verify against real Firebase —
security rules, quotas, genuine network behaviour — create **two** throwaway Firebase
projects, enable Realtime Database and Firestore on both, and download a service account
key for each (Project Settings → Service Accounts → Generate new private key).

Keep those files outside the repo or somewhere gitignored, and point the source at one
project and the target at the other. Never run a migration into a project holding data you
care about: the target is written to, and a copy is not reversible.

`server/scripts/firebase-seed.ts` and `firebase-verify.ts` can populate and check a real
project:

```bash
npm run seed-firebase --workspace=server -- --cred ./service-account.json --url https://<project>-default-rtdb.firebaseio.com
```

## Running one engine

`npm run db:seed` takes an optional engine name:

```bash
npm run db:seed postgres
npm run db:seed firebase
```

Without one it seeds all four container engines, skipping Firebase since that needs the
opt-in emulator.

## Troubleshooting

**`db:seed` fails with a connection error.** The containers probably aren't up yet.
`npm run db:up` waits for health checks; the seed script names whichever engine failed.

**Port already in use.** Something else is bound to one of the ports above. Change the
host side of the mapping in `docker-compose.test.yml` and the matching entry in
`server/scripts/test-connections.ts`.

**Firebase emulator won't start.** The first `db:up:firebase` builds the image and can
take several minutes. `docker compose -f docker-compose.test.yml logs firebase-emulator`
shows progress.

**Stale data after switching branches.** `npm run db:reset` recreates the volumes from
scratch.
