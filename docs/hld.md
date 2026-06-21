# FitJournal — High Level Design

> Track. Improve. Transform.
> *Your fitness journey, intelligently analyzed.*

---

## Vision

FitJournal is an AI-powered Fitness Journal. Not a workout logger.

Most apps answer: **What workout did I do?**
FitJournal answers: **Is my fitness plan working?**

---

## Core Philosophy

- Analytics engine is the moat — AI is used sparingly and only to narrate data already computed
- Simple inputs (weight, protein, sets/reps) → deep insights via deterministic rules
- Weekly report = the product. Retention = user excited to read Sunday report

---

## Product Scope

### V1 (Launch)

Track:
- Workouts (exercises, sets, reps, weight)
- Body weight + body metrics
- Protein intake + water
- Sleep
- Fitness goals

Generate:
- Progressive overload insights
- Plateau detection
- Weekly progress reports
- AI coaching (on-demand)

### V2 (Post-validation)

- Progress photos
- Monthly reports
- Physique analysis
- Workout recommendations
- Recovery score
- Muscle group balance analysis

### Explicitly Won't Build (Year 1)

- Food database / barcode scanner
- Social network / community / reels
- Trainer marketplace
- Apple Health / Garmin / smartwatch integrations
- Calories burned tracking

---

## Architecture

```
┌──────────────────────────────────────────┐
│         Vercel (single deploy)           │
│                                          │
│  Next.js App Router                      │
│  ├── pages / SSR  ──────────► CDN edge   │
│  ├── src/app/api/* ─────────► Serverless │
│  └── cron 0 2 * * 1 ────────► Mon 02UTC  │
│                                          │
│  Modules (TypeScript):                   │
│  users · workouts · body-metrics         │
│  nutrition · analytics · ai-coach        │
│  reporting · delivery                    │
└──────────────────┬───────────────────────┘
                   │ SQL/TLS
                   ▼
        Neon (serverless Postgres)

        External APIs called from fns:
        OpenAI · Resend · Meta (deferred)
```

Object Storage (Cloudflare R2) → V2 only (progress photos).

### Key architecture decisions

| Decision | Choice | Reason |
|---|---|---|
| Stack | Next.js 14 fullstack (App Router) | Single repo, single deploy, frontend + backend + cron together |
| Language | TypeScript throughout | One language, no context-switch, same types front-to-back |
| DB ORM | Drizzle + Neon Postgres | Type-safe queries, serverless-friendly, free tier |
| Auth | NextAuth v5 (Google OAuth) | Handles OAuth flow, session cookies, PKCE/state/nonce |
| App structure | Monolith modules (`src/modules/`) | No microservices overhead. Split only if load demands |
| AI usage | On-demand only (`/api/coach/ask`) | Minimize token cost. AI narrates pre-computed JSON |
| Cron | Vercel Cron `0 2 * * 1` | Once/week — within free Hobby limit. Monday 02:00 UTC |
| Email | Resend free tier | 3k emails/mo free, simple API |
| K8s path | Add `Dockerfile` + `k8s/` when needed | Zero app changes — same build, different infra target |

---

## Domain Architecture

```
app/
├── core/              # config, db session, auth, deps
├── modules/
│   ├── users/         # profile, goals, preferences
│   ├── workouts/      # sessions, exercises, sets
│   ├── body_metrics/  # weight, measurements, sleep
│   ├── nutrition/     # protein, water, calories
│   ├── analytics/     # overload, volume, plateau, goal engines
│   ├── ai_coach/      # LLM calls, prompt builder
│   ├── reporting/     # weekly/monthly report builder
│   └── delivery/      # email, whatsapp, push, in-app
├── workers/           # scheduled tasks
└── main.py
```

Rule: each module = `router.py` + `service.py` + `models.py` + `schemas.py`. No cross-module imports except `core/`.

---

## Domains

### User Domain
Manages authentication, profile, goals, preferences.
- Google OAuth (V1). Email fallback (V2).
- Goal types: Fat Loss, Lean Bulk, Muscle Gain, Strength Gain, Body Recomposition, Maintain.

### Workout Domain
Core data input. Hierarchy: Session → ExerciseLog → Set.
- Predefined exercise library + custom exercises.
- Workout types: Push, Pull, Legs, Upper, Lower, Full Body, Custom.

### Body Metrics Domain
Daily check-in data. Weight time-series + optional measurements.
- Metrics: weight, body fat %, waist, chest, arms, sleep hours.
- Sleep lives here (not separate domain).

### Nutrition Domain
Intentionally minimal. No food DB, no barcode scanner.
- Daily: protein (g), water (L), calories (optional).

### Analytics Domain
The product differentiator. Pure functions, no AI, no side effects.
- Engines: Progressive Overload, Volume, Consistency, Goal Progress, Plateau.
- Outputs structured JSON consumed by Reporting + AI Coach.

### AI Coach Domain
LLM called only on user request ("Ask Coach").
- Input: pre-computed analytics JSON snapshot.
- Output: plain-language coaching advice.
- Model: GPT-4o-mini (cost-efficient). Fallback: GPT-3.5-turbo.

### Reporting Domain
Builds weekly/monthly report objects from analytics data.
- Weekly: every Sunday via cron.
- Monthly: V2.

### Delivery Domain
Ships reports via channels. Decoupled from Reporting.
- Pull: in-app report screen.
- Push: email (Resend), WhatsApp (Meta API), PWA push notification.
- Channel config per user preference.

---

## Success Metric

Not: number of workouts logged.

**Yes: users who return weekly to read their progress report.**

If users ask "Why is my bench stalled?" → FitJournal is working.

---

## Analytics Thresholds (Canonical)

These define the product behavior. Hardcoded defaults, user-overridable.

| Signal | Threshold |
|---|---|
| Strength improving | +weight or +reps vs prior session (same exercise) |
| Strength stalled | No weight/rep gain vs prior session |
| Strength plateau | Stalled for 2+ consecutive weeks |
| Bulk too fast | Weight gain > 0.5% bodyweight/week (3-week avg) |
| Bulk too slow | Weight gain < 0.1% bodyweight/week (3-week avg) |
| Fat loss on track | 0.25–1.0% bodyweight/week loss (3-week avg) |
| Fat loss too slow | < 0.25% loss/week (3-week avg) |
| Fat loss too fast | > 1.2% loss/week (3-week avg) — muscle loss risk |
| Protein adequate | ≥ 1.6g/kg bodyweight (7-day avg) — equals default target |
| Protein low | ≥ 1.4g/kg but below target (87.5–100% of target) |
| Protein very low | < 1.4g/kg bodyweight (< 87.5% of target) |
| Volume adequate | ≥ 10 sets/muscle group/week |
| Volume moderate | 6–9 sets/muscle group/week |
| Volume low | < 6 sets/muscle group/week |
| Consistency good | ≥ 75% of weekly workout target (4-week avg) |
| Consistency low | < 75% of weekly workout target (4-week avg) |
| Cold start | < 14 days weight data → onboarding nudge, no goal/plateau insights |

---

## Deployment & Infrastructure

### Stack: Next.js fullstack on Vercel + Neon Postgres

Single repo. No separate backend server. `src/app/api/` routes = Vercel Serverless Functions.

### Where each piece lives

| What | Where | Cost | Notes |
|---|---|---|---|
| Frontend (pages, SSR) | Vercel CDN | Free | Auto-deployed on push to main |
| Backend (API routes) | Vercel Serverless Functions | Free tier | Same Next.js repo, no separate deploy |
| Cron — weekly report | Vercel Cron | Free (Hobby) | `0 2 * * 1` — once/week, within free limit |
| Postgres | Neon (serverless Postgres) | Free tier | 512MB storage, scale-to-zero |
| Email delivery | Resend | Free (3k/mo) | Weekly reports + transactional |
| Push notifications | VAPID via web-push | Free | Runs inside serverless fn, no extra service |
| WhatsApp | Meta Cloud API | Deferred | Activate after template approval |
| File storage | — | — | V2 only (progress photos). Cloudflare R2 when needed |
| **Total V1** | | **~$0/mo** | |

### Vercel free tier limits (Hobby plan, 2026)

| Resource | Free allowance | FitJournal estimate | Headroom |
|---|---|---|---|
| Function invocations | 1,000,000 / month | ~30,000 (100 DAU × 10 calls) | 33× |
| Edge requests | 1,000,000 / month | included in above | fine |
| Function max duration | 300 seconds | analytics build ~2-3s, AI call ~1s | fine |
| Cron jobs | 1 run/day max | 1 run/week (Mon 02:00 UTC) | fine |
| Deployments | 100 / day | 1-5 / day | fine |

**When to upgrade to Pro ($20/mo):** sustained 500+ DAU, or need hourly cron, or function timeouts.

### Request flow (Vercel)

```
User browser/PWA
       │ HTTPS
       ▼
Vercel Edge Network (CDN)
       │
       ├── Static assets (JS, CSS, images) → served from CDN edge, ~10ms
       │
       └── /api/* requests → Serverless Function (Node.js, ~50ms cold / ~5ms warm)
               │
               ├── Auth check (NextAuth session cookie)
               ├── Module service call (src/modules/*)
               │       └── Drizzle ORM query
               │               └── Neon Postgres (TLS, ~20ms)
               └── JSON response
```

Total p50 latency estimate: ~50-80ms (warm function + Neon query).

### Cron flow (weekly report)

```
Monday 02:00 UTC
       │
Vercel Cron → GET /api/cron/weekly-report
       │       (Authorization: Bearer CRON_SECRET — auto-injected by Vercel)
       │
       └── for each active user:
               ├── build analytics snapshot (src/modules/analytics/service.ts)
               ├── build report (src/modules/reporting/builder.ts)
               ├── upsert report row — UNIQUE(user_id, type, period_end) → idempotent
               └── deliver → email (Resend) + push (VAPID) + in-app flag
```

### Path to GCP / K8s (when Vercel limits hit)

Same repo, zero app code changes. Add infra files:

```
fitjournal/
├── Dockerfile          ← next build → node server.js
├── k8s/
│   ├── deployment.yaml  ← pods running same Docker image
│   ├── service.yaml     ← ClusterIP
│   ├── ingress.yaml     ← GCP LB + nginx-ingress + TLS
│   ├── hpa.yaml         ← auto-scale pods on CPU
│   └── cronjob.yaml     ← K8s CronJob, no Vercel limit
```

K8s request flow:
```
User → GCP Load Balancer (SSL) → nginx Ingress → K8s Service
     → Pod (next start :3000) → Neon / Cloud SQL → response
```

K8s wins over Vercel when: >1M calls/month, need hourly cron, need persistent workers.
Migrate only when limits actually hurt — not before.

### vercel.json (cron config)

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 2 * * 1"
    }
  ]
}
```
