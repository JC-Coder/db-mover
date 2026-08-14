# Agent Mode - DB Mover

This document outlines the architecture, patterns, and conventions of the DB Mover project to assist AI agents in understanding and contributing to the codebase.

## Project Overview

DB Mover is a full-stack application designed to facilitate the relocation of enterprise datasets across different cloud architectures. It supports multiple database ecosystems including MongoDB, PostgreSQL, BigQuery, and Redis.

## Tech Stack

### Frontend (`/client`)

- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**: Radix UI (base for shadcn/ui components)
- **Icons**: Lucide React
- **State Management**: React hooks
- **API Communication**: Axios

### Backend (`/server`)

- **Runtime**: Node.js
- **Framework**: Express (implied by `index.ts`)
- **Database**: MongoDB (for job management/metadata)
- **Language**: TypeScript

## Architecture & Patterns

### Frontend

- **Components**: Functional components using Tailwind for styling.
- **UI System**: Located in `client/src/components/ui`, following the shadcn/ui pattern.
- **Pages**: Main application logic starts in `App.tsx`, with `LandingPage.tsx` as the entry point.
- **SEO**: `client/src/lib/seo.ts` is the single registry for routes, page metadata, and JSON-LD. It
  drives the runtime `<Seo>` component, the prerendered `<head>`, `sitemap.xml`, and the route
  manifest the server uses for 404s — add a route there, not in four places.
- **Prerendering**: `npm run build` also runs an SSR build and `scripts/prerender.mjs`, which writes
  static HTML for every indexable route. Content routes must stay statically imported in `App.tsx`;
  only the app surfaces are `React.lazy`, since a lazy route would prerender as its fallback.
- **Styling Conventions**: Uses CSS variables for theming (`index.css`) and custom utility classes.
- **Naming Convention**: Interfaces start with `I` (e.g., `ILandingPageProps`). _Note: Currently some interfaces might not follow this, but new ones MUST._

### Backend

- **Services**: Business logic is encapsulated in service files (e.g., `server/src/services/migration.ts`).
- **Lib**: Shared utilities and library configurations (e.g., `server/src/lib/mongo.ts`, `server/src/lib/jobManager.ts`).
- **Entry Point**: `server/src/index.ts`.

## Coding Standards

- **TypeScript**: No `any` type allowed.
- **Interfaces**: All interfaces must start with `I` (e.g., `IUser`, `IDataSource`).
- **DRY Principle**: Check for existing helpers/utilities before implementing new ones.
- **State Management**: Keep it simple with hooks unless complexity requires more.

## Background & Styling

- **Theme**: Dark mode by default.
- **Backgrounds**: Uses a combination of grid patterns (`bg-grid`) and radial glows (`hero-glow`) defined in `index.css`.
- **Transitions**: Smooth animations using Framer Motion.

## Recent Changes & Focus

- Enhancing the visual appeal of the landing page with better background elements.
- Maintaining structural integrity during database migrations.
