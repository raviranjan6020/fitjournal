# FitJournal

**Track. Improve. Transform.**

AI-powered fitness journal. Not a workout logger — answers "Is my fitness plan working?"

## Stack

- **Next.js 14** (App Router) — frontend + backend + cron in one repo
- **Drizzle ORM + Neon Postgres** — type-safe queries, serverless
- **NextAuth v5** — Google OAuth
- **OpenAI gpt-4o-mini** — AI Coach (on-demand only)
- **Resend** — email delivery
- **Vercel** — hosting, serverless functions, cron

## Setup

```bash
cp .env.example .env.local
# fill in all env vars

npm install
npm run db:push        # push schema to Neon
npm run dev
```

## Docs

See `/fitjournal/docs/` in the planning repo:
- `hld.md` — architecture, deployment, infra
- `data-model.md` — full DB schema
- `lld-*.md` — module-level design
- `ui-spec.md` — all screens

## Issues

All work tracked at https://github.com/raviranjan6020/fitjournal/issues

EPICs #1–9, Stories + Tasks #10–51.

## Deploy

Push to `main` → Vercel auto-deploys.
Set env vars in Vercel dashboard (see `.env.example`).
Cron: `vercel.json` → `0 2 * * 1` (Monday 02:00 UTC).

## K8s path

See `k8s/manifests.yaml` — zero app changes needed to run on GCP/K8s.
