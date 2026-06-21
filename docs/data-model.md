# FitJournal — Data Model

All tables in Postgres. UUID primary keys. `created_at` / `updated_at` on all tables.

---

## Schema Overview

```
users
users_goals
users_preferences
exercise_library
workout_sessions
workout_exercise_logs
workout_sets
body_metrics
nutrition_logs
sleep_logs
analytics_snapshots
reports
delivery_logs
```

---

## Users Domain

### `users`

```sql
id              UUID        PK
email           TEXT        UNIQUE NOT NULL
name            TEXT
avatar_url      TEXT
auth_provider   TEXT        -- 'google'
auth_provider_id TEXT       UNIQUE
height_cm       NUMERIC(5,1)
date_of_birth   DATE
gender          TEXT        -- 'male' | 'female' | 'other' | 'prefer_not_to_say'
timezone        TEXT        DEFAULT 'UTC'
is_active       BOOLEAN     DEFAULT true
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### `users_goals`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
goal_type       TEXT        -- 'fat_loss' | 'lean_bulk' | 'muscle_gain' | 'strength_gain' | 'recomposition' | 'maintain'
target_weight_kg NUMERIC(5,1)
start_weight_kg  NUMERIC(5,1)
start_date      DATE
target_date     DATE        NULLABLE
is_active       BOOLEAN     DEFAULT true
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

Only one active goal per user at a time. Enforce in app layer.

### `users_preferences`

```sql
id                      UUID        PK
user_id                 UUID        FK → users.id  UNIQUE
protein_target_g        INTEGER     -- default computed: 1.6 * bodyweight_kg
water_target_l          NUMERIC(3,1) DEFAULT 2.5
weekly_workout_target   INTEGER     DEFAULT 4
report_day              TEXT        DEFAULT 'sunday'
delivery_email          BOOLEAN     DEFAULT true
delivery_whatsapp       BOOLEAN     DEFAULT false
delivery_push           BOOLEAN     DEFAULT true
whatsapp_number         TEXT        NULLABLE
push_subscription       JSONB       NULLABLE   -- Web Push (VAPID) subscription object
coach_history           JSONB       DEFAULT '[]'  -- last 20 Q&A: [{question, answer, asked_at, snapshot_id}]
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

---

## Workout Domain

### `exercise_library`

```sql
id              UUID        PK
name            TEXT        UNIQUE NOT NULL
slug            TEXT        UNIQUE NOT NULL     -- 'bench_press', 'squat'
muscle_groups   TEXT[]      -- ['chest', 'triceps', 'shoulders']
equipment       TEXT        -- 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'machine'
is_compound     BOOLEAN
is_custom       BOOLEAN     DEFAULT false
created_by      UUID        NULLABLE FK → users.id  -- null = system exercise
created_at      TIMESTAMPTZ
```

Seed: ~60 common exercises. User can add custom.

### `workout_sessions`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
date            DATE        NOT NULL
workout_type    TEXT        -- 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'custom'
name            TEXT        NULLABLE    -- custom name
duration_min    INTEGER     NULLABLE
notes           TEXT        NULLABLE
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

Index: `(user_id, date DESC)`.

### `workout_exercise_logs`

```sql
id              UUID        PK
session_id      UUID        FK → workout_sessions.id
exercise_id     UUID        FK → exercise_library.id
order_index     INTEGER     -- exercise order in session
notes           TEXT        NULLABLE
created_at      TIMESTAMPTZ
```

### `workout_sets`

```sql
id              UUID        PK
exercise_log_id UUID        FK → workout_exercise_logs.id
set_number      INTEGER
weight_kg       NUMERIC(6,2)
reps            INTEGER
rpe             NUMERIC(3,1) NULLABLE   -- 6.0–10.0
is_warmup       BOOLEAN     DEFAULT false
created_at      TIMESTAMPTZ
```

---

## Body Metrics Domain

### `body_metrics`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
date            DATE        NOT NULL
weight_kg       NUMERIC(5,2) NULLABLE
body_fat_pct    NUMERIC(4,1) NULLABLE
waist_cm        NUMERIC(5,1) NULLABLE
chest_cm        NUMERIC(5,1) NULLABLE
left_arm_cm     NUMERIC(4,1) NULLABLE
right_arm_cm    NUMERIC(4,1) NULLABLE
notes           TEXT        NULLABLE
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE (user_id, date)
```

Index: `(user_id, date DESC)`.

### `sleep_logs`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
date            DATE        NOT NULL    -- the night of (e.g. 2024-01-15 = night of Jan 15)
hours           NUMERIC(3,1)            -- 0.0–24.0
quality         INTEGER     NULLABLE    -- 1–5 self-rated
created_at      TIMESTAMPTZ

UNIQUE (user_id, date)
```

---

## Nutrition Domain

### `nutrition_logs`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
date            DATE        NOT NULL
protein_g       INTEGER     NULLABLE
water_l         NUMERIC(3,1) NULLABLE
calories        INTEGER     NULLABLE
notes           TEXT        NULLABLE
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE (user_id, date)
```

Index: `(user_id, date DESC)`.

---

## Analytics Domain

### `analytics_snapshots`

Pre-computed analytics state. Rebuilt weekly (or on-demand). Used by AI Coach + Reporting.

Single `content` JSONB blob — schema-flexible, matches LLD consumer code (`snapshot.content['goal']...`). Only query/index fields promoted to columns.

```sql
id              UUID        PK
user_id         UUID        FK → users.id
snapshot_date   DATE        NOT NULL
period_start    DATE
period_end      DATE
content         JSONB       NOT NULL    -- full analytics object (shape below)
created_at      TIMESTAMPTZ

UNIQUE (user_id, snapshot_date)
```

`content` JSONB shape (canonical — single source of truth, consumed by Reporting + AI Coach):

```json
{
  "goal": {
    "type": "fat_loss",
    "weight_status": "on_track",
    "recent_avg_kg": 83.6,
    "kg_per_week": -0.38,
    "kg_to_goal": 4.2,
    "message": "Losing 0.38kg/week — on track"
  },
  "nutrition": {
    "protein_avg_g": 148,
    "protein_target_g": 134,
    "protein_status": "adequate",
    "water_avg_l": 2.3,
    "water_status": "adequate"
  },
  "sleep": { "avg_hours": 6.8, "status": "low" },
  "consistency": {
    "workouts_this_week": 4,
    "avg_per_week_4w": 3.8,
    "streak_days": 12,
    "status": "good"
  },
  "strength": [
    { "exercise": "bench_press", "name": "Bench Press", "status": "improving", "change_kg": 2.5, "last_weight_kg": 90 }
  ],
  "volume": {
    "chest": { "sets": 14, "status": "adequate" }
  },
  "plateaus": [
    { "exercise": "squat", "name": "Squat", "weeks_stalled": 3, "last_weight_kg": 120 }
  ],
  "new_prs": [
    { "exercise": "bench_press", "name": "Bench Press", "weight_kg": 92.5, "reps": 3, "type": "rep_pr" }
  ]
}
```

Note `goal.recent_avg_kg` — used by Reporting to compute week-over-week weight delta.

---

## Reporting Domain

### `reports`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
report_type     TEXT        -- 'weekly' | 'monthly'
period_start    DATE
period_end      DATE
snapshot_id     UUID        FK → analytics_snapshots.id
content         JSONB       -- full report object (see Reporting LLD)
is_read         BOOLEAN     DEFAULT false
created_at      TIMESTAMPTZ

UNIQUE (user_id, report_type, period_end)
```

Unique constraint makes weekly cron idempotent — safe to re-run.

Index: `(user_id, report_type, period_end DESC)`.

---

## Delivery Domain

### `delivery_logs`

```sql
id              UUID        PK
user_id         UUID        FK → users.id
report_id       UUID        FK → reports.id
channel         TEXT        -- 'email' | 'whatsapp' | 'push' | 'in_app'
status          TEXT        -- 'pending' | 'sent' | 'failed' | 'permanent_failure'
attempt_count   INTEGER     DEFAULT 0
last_attempt_at TIMESTAMPTZ NULLABLE
sent_at         TIMESTAMPTZ NULLABLE
error           TEXT        NULLABLE
created_at      TIMESTAMPTZ

UNIQUE (report_id, channel)
```

`UNIQUE (report_id, channel)` = one delivery record per channel per report.
Delivery worker upserts this row and checks `status` before sending — a `sent` row
is never re-sent, and `attempt_count` bounds retries. Makes fan-out idempotent across
cron re-runs and retries.

---

## Indexes Summary

```sql
-- Hot read paths
CREATE INDEX idx_workout_sessions_user_date    ON workout_sessions(user_id, date DESC);
CREATE INDEX idx_body_metrics_user_date        ON body_metrics(user_id, date DESC);
CREATE INDEX idx_nutrition_logs_user_date      ON nutrition_logs(user_id, date DESC);
CREATE INDEX idx_sleep_logs_user_date          ON sleep_logs(user_id, date DESC);
CREATE INDEX idx_analytics_snapshots_user_date ON analytics_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_reports_user_type             ON reports(user_id, report_type, period_end DESC);

-- Exercise lookup
CREATE INDEX idx_workout_sets_exercise_log     ON workout_sets(exercise_log_id);
CREATE INDEX idx_exercise_logs_session         ON workout_exercise_logs(session_id, order_index);
```

---

## Enum Values Reference

| Field | Values |
|---|---|
| `goal_type` | `fat_loss`, `lean_bulk`, `muscle_gain`, `strength_gain`, `recomposition`, `maintain` |
| `workout_type` | `push`, `pull`, `legs`, `upper`, `lower`, `full_body`, `custom` |
| `weight_status` | `on_track`, `too_fast`, `too_slow`, `gaining`, `drifting`, `no_data` |
| `protein_status` | `adequate`, `low`, `very_low`, `no_data` |
| `water_status` | `adequate`, `low`, `no_data` |
| `sleep_status` | `good`, `low`, `no_data` |
| `consistency_status` | `good`, `low` |
| `strength_status` | `improving`, `stalled`, `plateau`, `regressed`, `no_data` |
| `volume_status` | `adequate`, `moderate`, `low` |
| `delivery_channel` | `email`, `whatsapp`, `push`, `in_app` |
| `delivery_status` | `pending`, `sent`, `failed`, `permanent_failure` |
| `report_type` | `weekly`, `monthly` |

---

## Migration Strategy

- Use Alembic (FastAPI standard) for migrations
- No raw SQL in app code — use SQLAlchemy ORM models
- Never drop columns — soft-delete or nullable new columns
