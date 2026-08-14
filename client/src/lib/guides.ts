/**
 * Guide content is data rather than JSX so the same source feeds three consumers: the rendered
 * page, the prerendered HTML, and the FAQ structured data. Adding a guide here automatically adds
 * it to the sitemap and the prerender list via `seo.ts`.
 */

export interface IGuideSection {
  heading: string;
  body: string[];
  steps?: string[];
  code?: { label: string; value: string };
}

export interface IGuideFaq {
  question: string;
  answer: string;
}

export interface IGuide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  /** Shown as the breadcrumb leaf and on the guide card. */
  engineLabel: string;
  /**
   * Deep-links the guide CTA into the config screen for this engine. Omitted on guides that are
   * not about one engine, whose CTA points at the engine picker instead.
   */
  engineId?: string;
  /** Overrides the engine-derived CTA heading where that phrasing would not read naturally. */
  ctaHeading?: string;
  readMinutes: number;
  updated: string;
  sections: IGuideSection[];
  faqs: IGuideFaq[];
}

const LAST_UPDATED = "2026-08-14";

export const GUIDES: IGuide[] = [
  {
    slug: "migrate-mongodb-database",
    title: "How to Migrate a MongoDB Database Without mongodump | DB Mover",
    h1: "How to migrate a MongoDB database without mongodump",
    description:
      "Copy a MongoDB database from one cluster to another in three steps — paste both connection strings, watch live logs, done. No mongodump or mongorestore flags.",
    intro:
      "Moving a MongoDB database between clusters normally means installing the database tools, remembering the right mongodump and mongorestore flag combination, and hoping the URI quoting survives your shell. DB Mover does the same copy through a form: source URI, target URI, run.",
    engineLabel: "MongoDB",
    engineId: "mongodb",
    readMinutes: 4,
    updated: LAST_UPDATED,
    sections: [
      {
        heading: "What you need before you start",
        body: [
          "Two MongoDB connection strings — one for the database you are copying from, one for the database you are copying to. Both need to be reachable from wherever DB Mover is running, which for the hosted app means they must accept connections from the public internet.",
          "If your cluster is on MongoDB Atlas, add the relevant IP to the Atlas network access list first, or self-host DB Mover inside your own network.",
        ],
        code: {
          label: "A MongoDB connection string looks like this",
          value: "mongodb+srv://user:password@cluster0.abc123.mongodb.net/mydatabase",
        },
      },
      {
        heading: "Copy the database step by step",
        body: [
          "The whole flow is three screens. Nothing is stored between sessions — credentials live only in the browser tab for the length of the job.",
        ],
        steps: [
          "Open DB Mover and pick MongoDB as your engine.",
          "Paste your source connection string, then your target connection string.",
          "Choose Copy, then start the job.",
          "Start the job and watch the streaming log until it reports completed.",
        ],
      },
      {
        heading: "Take a backup first instead",
        body: [
          "If you only want a snapshot before a risky schema change, skip the target URI entirely. Choose Download on the same screen and DB Mover streams a compressed archive of the source data straight to your machine.",
          "This is the fastest way to get a rollback point when you are about to run a migration script you are not fully sure about.",
        ],
      },
      {
        heading: "What gets copied",
        body: [
          "Collections and their documents are copied to the target database with their structure intact. DB Mover copies between databases of the same engine — MongoDB to MongoDB — rather than translating between engines.",
          "Large collections stream rather than loading into memory, so the limiting factor is usually network throughput between the two clusters rather than the size of the data.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need to install mongodump or the MongoDB database tools?",
        answer:
          "No. DB Mover handles the read and write through the connection strings you paste, so nothing needs to be installed locally.",
      },
      {
        question: "Are my MongoDB credentials stored anywhere?",
        answer:
          "Connection strings are used for the duration of the job and are not persisted to a database. If you would rather they never leave your infrastructure at all, DB Mover is open source and can be self-hosted with Docker.",
      },
      {
        question: "Can I migrate MongoDB to PostgreSQL with this?",
        answer:
          "No. DB Mover copies between databases of the same engine. Cross-engine conversion requires schema mapping decisions that a generic tool cannot make safely on your behalf.",
      },
    ],
  },
  {
    slug: "migrate-postgresql-database",
    title: "Migrate a PostgreSQL Database Without pg_dump | DB Mover",
    h1: "How to migrate a PostgreSQL database without pg_dump",
    description:
      "Copy a PostgreSQL database between servers through a browser form. Schema preserved, live progress logs, no pg_dump or pg_restore flags to look up.",
    intro:
      "pg_dump is excellent and also genuinely hard to remember. Custom format or plain? Does the version of pg_restore on this machine match the server? DB Mover skips the question — paste a source URI, paste a target URI, and watch the copy run.",
    engineLabel: "PostgreSQL",
    engineId: "postgres",
    readMinutes: 4,
    updated: LAST_UPDATED,
    sections: [
      {
        heading: "What you need before you start",
        body: [
          "A PostgreSQL connection URI for the source database, and a second one for the target. The target database should already exist — DB Mover writes into it rather than creating the server-side database for you.",
          "Managed providers such as Neon, Supabase, and Amazon RDS all hand you a URI in this shape. If yours requires TLS, keep the sslmode parameter on the end of the string.",
        ],
        code: {
          label: "A PostgreSQL connection URI looks like this",
          value: "postgresql://user:password@db.example.com:5432/mydatabase?sslmode=require",
        },
      },
      {
        heading: "Copy the database step by step",
        body: [
          "The form checks the shape of each URI before it submits, so an obviously malformed string is caught up front. A URI that is well-formed but wrong — bad password, unreachable host — surfaces as an error in the live log once the job starts.",
        ],
        steps: [
          "Open DB Mover and pick PostgreSQL as your engine.",
          "Paste the source URI, then the target URI.",
          "Choose Copy, then start the job.",
          "Start the job and follow the live log output until it completes.",
        ],
      },
      {
        heading: "Version mismatches",
        body: [
          "The classic pg_dump failure is a client-server version mismatch — your local client is version 14, the server is 16, and the restore refuses to run. Because DB Mover connects directly rather than shelling out to a locally installed client, that particular class of failure does not apply.",
          "What still matters is compatibility between the two servers themselves. Copying from a newer PostgreSQL into a meaningfully older one can still fail on syntax the older server does not recognise.",
        ],
      },
      {
        heading: "Backups before schema changes",
        body: [
          "Leave the target URI blank and pick Download instead of Copy to get a compressed archive of the source database. It is the one-click equivalent of taking a dump before you run a migration, and it is the cheapest insurance available before a destructive change.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does this preserve my schema, indexes, and constraints?",
        answer:
          "The copy reproduces the database structure alongside the data rather than moving rows into an empty schema you have to define yourself.",
      },
      {
        question: "Do I need pg_dump or pg_restore installed?",
        answer:
          "No. Nothing needs to be installed locally — DB Mover connects to both databases directly from the connection strings you provide.",
      },
      {
        question: "Can I copy from a production database safely?",
        answer:
          "The source is only read from, never written to. Even so, run large copies during a low-traffic window, since a full read still puts load on the source server.",
      },
    ],
  },
  {
    slug: "migrate-mysql-database",
    title: "How to Migrate a MySQL Database Without mysqldump | DB Mover",
    h1: "How to migrate a MySQL database without mysqldump",
    description:
      "Move a MySQL database between servers using a browser form instead of mysqldump. Paste two connection strings, watch the live log, done.",
    intro:
      "mysqldump piped into a mysql client works, right up until the character set is wrong, the pipe silently truncates, or you cannot tell whether it actually finished. DB Mover gives the same operation a progress bar and a log you can read.",
    engineLabel: "MySQL",
    engineId: "mysql",
    readMinutes: 4,
    updated: LAST_UPDATED,
    sections: [
      {
        heading: "What you need before you start",
        body: [
          "Connection strings for both the source and the target MySQL server, each including the database name. The user on the source side needs read access; the user on the target side needs permission to create tables and insert rows.",
          "PlanetScale, Amazon RDS, and most managed MySQL hosts provide a URI in this format directly in their dashboard.",
        ],
        code: {
          label: "A MySQL connection string looks like this",
          value: "mysql://user:password@db.example.com:3306/mydatabase",
        },
      },
      {
        heading: "Copy the database step by step",
        body: [
          "The flow is identical to every other engine in DB Mover, which is the point — you do not relearn a tool each time you change database.",
        ],
        steps: [
          "Open DB Mover and pick MySQL as your engine.",
          "Paste the source connection string, then the target connection string.",
          "Choose Copy, then start the job.",
          "Start the job and watch the streaming log until it reports completed.",
        ],
      },
      {
        heading: "Character sets and collations",
        body: [
          "Most mysqldump corruption stories are really character set stories — a dump taken as latin1 and restored as utf8mb4 turns every accented character into noise. Copying over a direct connection avoids the intermediate file where that mismatch usually happens.",
          "If the source and target servers are configured with different default collations, set the target to match the source before you run the copy.",
        ],
      },
      {
        heading: "Download a backup instead",
        body: [
          "Skip the target URI and choose Download to pull a compressed archive of the source database to your machine. Useful before a schema migration, and useful for handing a dataset to a teammate who does not have database access.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need mysqldump installed locally?",
        answer:
          "No. DB Mover connects to both servers directly, so there is no local client to install or keep in sync with your server version.",
      },
      {
        question: "Will this work with MariaDB?",
        answer:
          "MariaDB speaks the MySQL wire protocol, so standard connection strings generally work. Test against a non-production database first.",
      },
      {
        question: "How long does a MySQL copy take?",
        answer:
          "It depends almost entirely on data volume and the network path between the two servers. The live log shows progress as it runs, so you are never guessing.",
      },
    ],
  },
  {
    slug: "migrate-redis-database",
    title: "How to Copy a Redis Database Between Servers | DB Mover",
    h1: "How to copy a Redis database between servers",
    description:
      "Move Redis keys from one instance to another through a browser form. No redis-cli, no RDB file juggling, no DUMP and RESTORE scripting.",
    intro:
      "Copying Redis data usually means either shipping an RDB file around or scripting DUMP and RESTORE over a key scan. Both work. Neither is something you want to write from memory at 2am during a cutover.",
    engineLabel: "Redis",
    engineId: "redis",
    readMinutes: 3,
    updated: LAST_UPDATED,
    sections: [
      {
        heading: "What you need before you start",
        body: [
          "A Redis connection URI for the source instance and one for the target. Managed Redis providers such as Upstash, Redis Cloud, and Amazon ElastiCache all expose a URI in this shape.",
          "Use the rediss:// scheme rather than redis:// when the instance requires TLS, which most managed providers do.",
        ],
        code: {
          label: "A Redis connection URI looks like this",
          value: "rediss://default:password@redis.example.com:6379",
        },
      },
      {
        heading: "Copy the instance step by step",
        body: [
          "Redis has no schema to preserve, so the copy is a straight key-space transfer.",
        ],
        steps: [
          "Open DB Mover and pick Redis as your engine.",
          "Paste the source URI, then the target URI.",
          "Choose Copy, then start the job.",
          "Start the job and watch the log until it completes.",
        ],
      },
      {
        heading: "Inspect keys before you move them",
        body: [
          "DB Mover includes a read-only browser view, so you can look at what is actually in an instance before copying it anywhere. It is a quick way to confirm you pointed at the right database — particularly easy to get wrong when staging and production URIs differ by one character.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does this preserve key expiry times?",
        answer:
          "Yes. Each key's remaining time-to-live is read and reapplied on the target, so a key with four hours left still has roughly four hours left after the copy. Keys with no expiry stay persistent.",
      },
      {
        question: "Can I copy between different Redis providers?",
        answer:
          "Yes. As long as both endpoints speak the Redis protocol and are reachable, the provider on either side does not matter.",
      },
      {
        question: "Is redis-cli required?",
        answer:
          "No. Everything runs through the connection strings you paste into the form.",
      },
    ],
  },
  {
    slug: "export-firebase-data",
    title: "How to Export Firebase Data to a File | DB Mover",
    h1: "How to export Firebase data to a file",
    description:
      "Export Firebase Realtime Database or Firestore data to a downloadable archive from your browser — no gcloud CLI and no Cloud Storage bucket needed.",
    intro:
      "The official Firebase export path routes through a Cloud Storage bucket and the gcloud CLI, which is a lot of moving parts when all you wanted was a copy of your data on your laptop. DB Mover gives you the file directly.",
    engineLabel: "Firebase",
    engineId: "firebase",
    readMinutes: 3,
    updated: LAST_UPDATED,
    sections: [
      {
        heading: "What you need before you start",
        body: [
          "Firebase service account credentials for the project you want to export. In the Firebase console, open Project settings, then Service accounts, and generate a new private key — you get a JSON file.",
          "Treat that JSON file the way you would treat a root password. It grants broad access to the project, so avoid committing it or pasting it anywhere it will be retained.",
        ],
      },
      {
        heading: "Export step by step",
        body: [
          "The credentials are used for the duration of the job and are not persisted to a database.",
        ],
        steps: [
          "Open DB Mover and pick Firebase as your engine.",
          "Choose Realtime Database or Firestore, whichever holds the data you want.",
          "Upload your service account JSON on the config screen.",
          "Choose Download to produce an archive rather than copying into another database.",
          "Start the job and save the archive when it finishes.",
        ],
      },
      {
        heading: "Realtime Database and Firestore",
        body: [
          "Both are supported, and you pick which one on the config screen. They are genuinely different products — Realtime Database is one large JSON tree, Firestore is collections of documents — so an export of one is not interchangeable with the other.",
          "Check which one your app actually writes to before exporting. Projects that have been around a while often have data sitting in both.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need the gcloud or Firebase CLI installed?",
        answer:
          "No. The export runs through the service account credentials you provide in the browser.",
      },
      {
        question: "Is a Cloud Storage bucket required?",
        answer:
          "No. Unlike the official managed export, the archive is streamed straight to you rather than written to a bucket you have to create and then clean up.",
      },
      {
        question: "Why export at all?",
        answer:
          "Three reasons come up repeatedly: an offline snapshot before a large data model change, an audit or data portability request, and seeding a local development environment with realistic data instead of fixtures.",
      },
      {
        question: "How should I handle the service account key safely?",
        answer:
          "Generate a dedicated key for the export, use it, then revoke it in the Firebase console afterwards. If you would rather the key never leave your own infrastructure, self-host DB Mover with Docker.",
      },
    ],
  },
  {
    slug: "backup-database-without-cli",
    title: "How to Back Up a Database Without the Command Line | DB Mover",
    h1: "How to back up a database without the command line",
    description:
      "Take a downloadable snapshot of MongoDB, PostgreSQL, MySQL, Redis, or Firebase from a browser form — no CLI tools to install, no flags to look up.",
    intro:
      "Every database engine has its own backup command, its own flags, and its own way of failing quietly. If you work across more than one engine, that is a lot of syntax to keep loaded in your head for something you might do twice a month.",
    engineLabel: "All engines",
    ctaHeading: "Back up your own database",
    readMinutes: 4,
    updated: LAST_UPDATED,
    sections: [
      {
        heading: "One flow for five engines",
        body: [
          "DB Mover supports MongoDB, PostgreSQL, MySQL, Redis, and Firebase behind a single interface. The screens are the same regardless of which one you pick, so the thing you learn once applies everywhere.",
          "For a backup, fill in the source details, choose Download, and you get a compressed archive of the source data.",
        ],
      },
      {
        heading: "Take a backup step by step",
        body: [
          "This is the fastest path from an idle browser tab to a snapshot sitting on your machine.",
        ],
        steps: [
          "Open DB Mover and pick your database engine.",
          "Paste the connection string for the database you want to back up.",
          "Choose Download rather than Copy.",
          "Start the job and save the archive when the log reports completion.",
        ],
      },
      {
        heading: "When a manual backup is the right tool",
        body: [
          "A manual snapshot is not a replacement for scheduled, automated, tested backups — if you are running anything in production, you need those regardless.",
          "What a manual snapshot is good for is the moment right before you do something irreversible: a schema migration, a bulk update script, a data cleanup, or a handoff to another team. It takes under a minute and it is the difference between a bad afternoon and a very bad week.",
        ],
      },
      {
        heading: "Self-host if credentials cannot leave your network",
        body: [
          "DB Mover is open source and MIT licensed. If your database is not reachable from the public internet, or your policy is that credentials never touch third-party infrastructure, run it yourself with Docker and point it at your internal network.",
        ],
      },
    ],
    faqs: [
      {
        question: "Which databases can I back up this way?",
        answer:
          "MongoDB, PostgreSQL, MySQL, Redis, and Firebase are all supported through the same interface.",
      },
      {
        question: "Is this a replacement for automated backups?",
        answer:
          "No. It covers on-demand snapshots before risky changes. Scheduled, monitored, restore-tested backups are still required for anything in production.",
      },
      {
        question: "Does DB Mover keep a copy of my data?",
        answer:
          "The archive is streamed to you rather than retained. If you would prefer the data never transits third-party infrastructure at all, self-host the project.",
      },
    ],
  },
];

export const getGuideBySlug = (slug: string | undefined): IGuide | undefined =>
  GUIDES.find((guide) => guide.slug === slug);
