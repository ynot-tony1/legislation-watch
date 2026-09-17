# Legislation Watch

Live: https://legislation-watch.vercel.app

Plain-language tracking of bills moving through the UK Parliament, sourced from
the official [Bills API](https://bills-api.parliament.uk) (no auth required).
Named "Legislation Watch" rather than "UK Bill Tracker" so it can extend to other
countries' legislatures later without a rebrand.

## Architecture

- **`web/`** — Next.js 16 (App Router, TypeScript, Tailwind, shadcn/ui) dashboard, deployed on Vercel. Reads directly from CockroachDB via Drizzle ORM.
- **`scraper/`** — Python sync job that pulls bills for the current Parliament session and their full stage history, upserts each bill's current status, and appends any stage instance not already recorded to an event log — a run never rewrites history, it only detects and logs what's new since the last run, generating a plain-language narrative for each new stage. Runs every 6 hours via a GitHub Actions cron workflow (`.github/workflows/sync.yml`).
- **`db/schema.sql`** — canonical schema (`bills`, `bill_stage_events`), applied once against CockroachDB.

Bill status changes are event-driven (a bill can move stage on any sitting day,
not on a fixed schedule), which is why this syncs a few times a day rather than
once nightly, and why `bill_stage_events` is an append-only log keyed on the
API's own stage-instance ID rather than a single mutable "current status" row.

This project shares a CockroachDB cluster with the
[Economic Indicators Dashboard](../economicIndicators) — it uses a separate
database (`legislative_tracker`) within that same free-tier cluster rather than
provisioning a new one.

## One-time setup

### 1. Create the database

Within the existing CockroachDB cluster:

```sql
CREATE DATABASE IF NOT EXISTS legislative_tracker;
```

### 2. Apply the schema

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

(`DATABASE_URL` here should point at the `legislative_tracker` database.)

### 3. Set `DATABASE_URL` in three places

| Where | Purpose | How |
|---|---|---|
| `web/.env.local` | local dev | copy `web/.env.example` to `web/.env.local` and paste the string |
| GitHub repo secret `DATABASE_URL` | sync job (GitHub Actions) | repo **Settings → Secrets and variables → Actions → New repository secret** |
| Vercel project env var `DATABASE_URL` | production site | project **Settings → Environment Variables** |

### 4. Run the sync once to seed data

```bash
cd scraper
pip install -r requirements.txt
export DATABASE_URL=postgresql://...
python scrape.py
```

## Local development (web)

```bash
cd web
npm install
npm run dev
```

Without `DATABASE_URL` set, pages render a "Database not configured" state instead of failing.

## Deploying

Vercel project root directory: `web/`. Framework preset: Next.js. Set the
`DATABASE_URL` environment variable in the Vercel project before deploying so
build-time static generation can read real data.
