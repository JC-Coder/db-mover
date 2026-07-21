# DB Mover

<div align="center">
  <img src="./assets/landing.png" alt="DB Mover Landing Page" width="100%" />
</div>
Database migration without the CLI maze.

## Overview

DB Mover gives you a visual interface to copy, back up, or browse your databases. Instead of remembering `pg_dump` flags or `mongodump` arguments, you paste your connection strings, hit run, and watch live logs confirm every step. No terminal, no docs rabbit hole, just a straightforward tool that moves data from A to B.


## Architecture

```mermaid
flowchart LR
    Client["Web Client (React)"]
    Server["Hono API Server"]
    Adapters["Database Adapters"]
    MongoDB[("MongoDB")]
    PostgreSQL[("PostgreSQL")]
    MySQL[("MySQL")]
    Redis[("Redis")]
    Firebase[("Firebase")]

    Client --> Server
    Server --> Adapters
    Adapters --> MongoDB
    Adapters --> PostgreSQL
    Adapters --> MySQL
    Adapters --> Redis
    Adapters --> Firebase

    style Client fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
    style Server fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
    style Adapters fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
    style MongoDB fill:#022c22,stroke:#10b981,stroke-width:2px,color:#fff
    style PostgreSQL fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style MySQL fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style Redis fill:#4c0519,stroke:#ef4444,stroke-width:2px,color:#fff
    style Firebase fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff
```

## Features

### Copy source to target in one flow

Move data between two databases of the same engine. The UI guides you through pasting both URIs, then handles the dump, transfer, and restore while streaming live progress.

```mermaid
sequenceDiagram
    actor User
    participant Client as Web App
    participant Server as Hono API
    participant Migration as Migration Service
    participant SourceDB as Source Database
    participant TargetDB as Target Database

    User->>Client: Enter source & target URIs
    Client->>Server: Start copy migration
    Server->>Migration: Create job
    Migration->>SourceDB: Connect & read data
    Migration->>TargetDB: Insert records
    loop While data remains
        Migration->>Server: Update progress & logs (SSE)
        Server->>Client: Stream status
        Client->>User: Show live logs
    end
    Migration->>Server: Mark job completed
    Server->>Client: Completion notification
    Client->>User: Display success
```

### Instant backup download

Grab a compressed zip of your entire database with one click. The app streams the file directly to your browser, no intermediate storage needed.

```mermaid
sequenceDiagram
    actor User
    participant Client as Web App
    participant Server as Hono API
    participant Adapter as DB Adapter
    participant SourceDB as Source Database

    User->>Client: Request backup download
    Client->>Server: POST /download
    Server->>Adapter: Run download
    Adapter->>SourceDB: Dump all data
    Adapter->>Server: Pipe zip archive
    Server->>Client: Stream ZIP file
    Client->>User: Browser download prompt
```

### Live data browser

Explore your database schema and preview up to 100 rows per table or collection, right in the browser. Read‑only by design; no accidental writes.

```mermaid
sequenceDiagram
    actor User
    participant Client as Web App
    participant Server as Hono API
    participant Browser as Browser Service
    participant DB as Connected Database

    User->>Client: Select Browse mode
    Client->>Server: Request schema
    Server->>Browser: List objects
    Browser->>DB: Fetch collections/tables
    DB->>Browser: Object list
    Browser->>Server: Return objects
    Server->>Client: Display schema tree
    User->>Client: Click a table/collection
    Client->>Server: Preview object data
    Server->>Browser: Query preview
    Browser->>DB: Paginated data
    DB->>Browser: Rows
    Browser->>Server: Preview result
    Server->>Client: Show data grid
```

### Multi‑engine support

Same clean workflow for MongoDB, PostgreSQL, MySQL, Redis, and Firebase (Realtime Database & Firestore). The UI adapts to what each engine expects.

### Live migration dashboard

Real‑time progress bar, streaming logs with timestamps, and key stats like collections processed and documents moved. When it finishes, confetti confirms success.

### Session‑safe credentials

Connection strings and service‑account keys stay in your browser’s session storage and are cleared when you close the tab.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/samueltuoyo15/db-mover.git
   ```
2. Install dependencies (root, client, and server):
   ```bash
   cd db-mover
   npm install
   ```
3. Start the development servers:
   ```bash
   npm run dev
   ```
   This runs both the Vite frontend (on port 5173, proxying API to 3000) and the Hono backend (on port 3000).

To run in production, build the client (`npm run build --workspace=client`), build the server (`npm run build --workspace=server`), then start the server with `node server/dist/index.js`. The built client assets will be served from the `public` folder.

## Usage

- Visit the landing page and click **Launch App**.
- Pick your database engine (MongoDB, PostgreSQL, MySQL, Redis, or Firebase).
- Choose a mode: **Copy** (source → target), **Download** (backup zip), or **Browse** (explore data).
- Paste your connection strings. For Firebase, you’ll also upload a service‑account JSON.
- Click **Start migration**, **Download backup**, or **Open Data Browser**.
- For copy jobs, you’ll be taken to a live dashboard that shows progress, logs, and final stats.
- For downloads, a zip file will begin downloading immediately.
- The browser mode lets you expand a schema tree, click any table/collection, and inspect rows with a built‑in JSON viewer.

## Technologies Used

| Technology | Link |
|------------|------|
| TypeScript | [typescriptlang.org](https://www.typescriptlang.org/) |
| React 18 | [react.dev](https://react.dev/) |
| Vite | [vitejs.dev](https://vitejs.dev/) |
| Tailwind CSS | [tailwindcss.com](https://tailwindcss.com/) |
| Hono | [hono.dev](https://hono.dev/) |
| MongoDB driver | [mongodb.com](https://www.mongodb.com/docs/drivers/node/) |
| pg (PostgreSQL) | [node-postgres.com](https://node-postgres.com/) |
| mysql2 | [github.com/sidorares/node-mysql2](https://github.com/sidorares/node-mysql2) |
| ioredis | [github.com/redis/ioredis](https://github.com/redis/ioredis) |
| Firebase Admin | [firebase.google.com](https://firebase.google.com/docs/admin/setup) |
| Framer Motion | [framer.com/motion](https://www.framer.com/motion/) |
| Recharts | [recharts.org](https://recharts.org/) |
| Archiver | [archiverjs.com](https://www.archiverjs.com/) |

## Deployment

Quickly spin up the mover using Docker:
```bash
docker build -t db-mover .
docker run -p 3000:3000 db-mover
```

## License
This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

## Contributing

We welcome contributions! Whether it's adding a new database adapter or improving the UI, please see our [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

**Joseph**

- [LinkedIn](https://linkedin.com/in/jc-coder)
- [X (Twitter)](https://x.com/jc_coder1)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Hono](https://img.shields.io/badge/Hono-000000?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=recharts&logoColor=white)](https://recharts.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![GitHub stars](https://img.shields.io/github/stars/JC-Coder/db-mover?style=social)](https://github.com/JC-Coder/db-mover)
[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://dokugen.samueltuoyo.com)
