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
# fill in DATABASE_URL from Neon dashboard
# fill in GOOGLE_CLIENT_ID/SECRET, NEXTAUTH_SECRET, OPENAI_API_KEY, RESEND_API_KEY

npm install

# Push schema to Neon (first time / after schema changes)
npm run db:push

# Seed exercise library (~48 exercises)
npm run db:seed

npm run dev
```

### Neon setup (one-time)
1. Create account at https://neon.tech
2. New project → copy connection string
3. Paste as `DATABASE_URL` in `.env.local`

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

### Vercel (one-time setup)

1. Go to https://vercel.com → New Project → Import `raviranjan6020/fitjournal`
2. Framework preset: **Next.js** (auto-detected)
3. Add all env vars from `.env.local` in the Vercel dashboard (Settings → Environment Variables):

```
DATABASE_URL          = <neon connection string>
NEXTAUTH_URL          = https://your-app.vercel.app
NEXTAUTH_SECRET       = <value from .env.local>
GOOGLE_CLIENT_ID      = <from Google Cloud Console>
GOOGLE_CLIENT_SECRET  = <from Google Cloud Console>
OPENAI_API_KEY        = <from OpenAI>
RESEND_API_KEY        = <from Resend>
RESEND_FROM_EMAIL     = reports@fitjournal.app
CRON_SECRET           = <value from .env.local>
NEXT_PUBLIC_APP_URL   = https://your-app.vercel.app
```

4. Add Google OAuth callback URL in Google Cloud Console:
   `https://your-app.vercel.app/api/auth/callback/google`

5. Deploy → Vercel auto-deploys on every push to `main`

Cron `vercel.json`: `0 2 * * 1` → Monday 02:00 UTC, weekly report.

## K8s path

See `k8s/manifests.yaml` — zero app changes needed to run on GCP/K8s.
