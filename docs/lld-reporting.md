# FitJournal — LLD: Reporting Module

**Path:** `app/modules/reporting/`

---

## Responsibility

Build weekly (and future monthly) report objects from analytics snapshots.
Reporting does not deliver reports — that's Delivery's job.

---

## Files

```
reporting/
├── router.py
├── service.py
├── builder.py      # builds report content from snapshot
├── models.py
└── schemas.py
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/reports` | List user's reports (paginated) |
| `GET` | `/reports/latest` | Get most recent weekly report |
| `GET` | `/reports/{id}` | Get specific report |
| `PATCH` | `/reports/{id}/read` | Mark report as read |

---

## Report Generation Flow

Week = **Monday–Sunday**. Report runs after the week closes.

**Cron schedule: Monday 02:00 UTC** (`0 2 * * 1`).
- Fires once per week — within Vercel Hobby free tier (limit: 1 run/day).
- 02:00 UTC chosen so Sunday data from all major timezones (UTC-12 → UTC+14) is fully captured.
- All users processed in one run. No per-timezone complexity.

```
vercel.json cron: "0 2 * * 1"
    │
    ▼
GET /api/cron/weekly-report   (Authorization: Bearer CRON_SECRET)
    │
    ├─ period_end   = last Sunday (today - 1 day)
    ├─ period_start = period_end - 6 days  (Monday)
    │
    └─ for each active user:
        ├─ 1. build analytics snapshot for [period_start, period_end]
        ├─ 2. build report (reporting/builder.ts)
        ├─ 3. upsert reports table — idempotent via UNIQUE (user_id, type, period_end)
        └─ 4. trigger delivery (email + push + in-app)
```

Idempotent: re-running the cron (or a retry) never creates duplicate reports.
`CRON_SECRET` env var — Vercel injects it automatically as Bearer token.

---

## Report Builder

### `build_weekly_report(user_id, snapshot)` → ReportContent

```python
def build_weekly_report(user_id: UUID, snapshot: AnalyticsSnapshot) -> ReportContent:
    s   = snapshot.content
    prv = get_previous_snapshot(user_id)  # last week's snapshot for deltas

    weight_start = prv.content['goal'].get('recent_avg_kg') if prv else None
    weight_end   = s['goal'].get('recent_avg_kg')

    return ReportContent(
        period_label=f"Week of {snapshot.period_start.strftime('%b %d')}",
        headline=build_headline(s),

        weight=WeightSection(
            start_kg=weight_start,
            end_kg=weight_end,
            delta_kg=round(weight_end - weight_start, 2) if weight_start and weight_end else None,
            trend_status=s['goal']['weight_status'],
            message=s['goal']['message']
        ),

        nutrition=NutritionSection(
            protein_avg_g=s['nutrition']['protein_avg_g'],
            protein_target_g=s['nutrition']['protein_target_g'],
            protein_status=s['nutrition']['protein_status'],
            water_avg_l=s['nutrition']['water_avg_l']
        ),

        sleep=SleepSection(
            avg_hours=s['sleep']['avg_hours'],
            status=s['sleep']['status']
        ),

        workouts=WorkoutSection(
            count=s['consistency']['workouts_this_week'],
            streak=s['consistency']['streak_days'],
            status=s['consistency']['status']
        ),

        strength_highlights=build_strength_highlights(s['strength'], s['plateaus']),

        new_prs=s['new_prs'],

        volume_summary=build_volume_summary(s['volume']),

        recommendation=build_recommendation(s),

        alerts=build_alerts(s)
    )
```

### `build_headline(s)` → str

Returns top-line summary sentence. Priority:
1. New PR → "New PR on Bench Press this week! 🎉"
2. Goal on track + good consistency → "Solid week — on track for fat loss."
3. Plateau detected → "Squat has been stalled for 3 weeks. Needs attention."
4. Low protein → "Protein was below target 5/7 days."
5. Default → "Here's your weekly summary."

### `build_recommendation(s)` → str

Single actionable recommendation. One per report. Priority order:

```
1. Plateau detected → "Change rep range or add weight to [exercise]."
2. Bulk too fast    → "Reduce calories slightly. Aim for 0.25–0.4% gain/week."
3. Fat loss stalled → "Slight deficit increase or add one cardio session."
4. Protein very low → "Hit protein target 5/7 days. Aim for {target}g/day."
5. Low volume muscle group → "[muscle] volume low. Add 2–4 sets next week."
6. Low consistency → "You missed your workout target. Aim for {target}/week."
7. On track, good  → "Keep it up. Same plan next week."
```

### `build_alerts(s)` → list[str]

All notable flags (not just top 1). Used in detailed report view.

```python
alerts = []
if s['goal']['weight_status'] == 'too_fast':
    alerts.append("Weight gaining too fast — risk of excess fat.")
if s['nutrition']['protein_status'] == 'very_low':
    alerts.append(f"Protein very low ({s['nutrition']['protein_avg_g']}g vs {s['nutrition']['protein_target_g']}g target).")
if s['sleep']['status'] == 'low':
    alerts.append(f"Average sleep {s['sleep']['avg_hours']}h — below 7h target. May impact recovery.")
for p in s['plateaus']:
    alerts.append(f"{p['name']} stalled {p['weeks_stalled']} weeks.")
return alerts
```

---

## Report Content Schema (stored as JSONB in `reports.content`)

```json
{
  "period_label": "Week of Jun 16",
  "headline": "New PR on Bench Press this week!",
  "weight": {
    "start_kg": 84.0,
    "end_kg": 83.6,
    "delta_kg": -0.4,
    "trend_status": "on_track",
    "message": "Losing 0.4kg/week — on track for fat loss"
  },
  "nutrition": {
    "protein_avg_g": 148,
    "protein_target_g": 134,
    "protein_status": "adequate",
    "water_avg_l": 2.2
  },
  "sleep": {
    "avg_hours": 6.8,
    "status": "low"
  },
  "workouts": {
    "count": 5,
    "streak": 14,
    "status": "good"
  },
  "strength_highlights": [
    { "exercise": "bench_press", "name": "Bench Press", "status": "improving", "change_kg": 2.5 },
    { "exercise": "squat",       "name": "Squat",       "status": "stalled",   "weeks_stalled": 2 }
  ],
  "new_prs": [
    { "exercise": "bench_press", "name": "Bench Press", "weight_kg": 92.5, "reps": 3 }
  ],
  "volume_summary": {
    "adequate": ["chest", "back"],
    "moderate": ["legs", "biceps"],
    "low": ["shoulders"]
  },
  "recommendation": "Squat has stalled — try a rep range change (e.g., 5×5 → 4×8).",
  "alerts": [
    "Average sleep 6.8h — below 7h target. May impact recovery.",
    "Squat stalled 2 weeks."
  ]
}
```

---

## Schemas

### `ReportSummary` (list response)

```python
id: UUID
report_type: str
period_label: str
headline: str
period_end: date
is_read: bool
created_at: datetime
```

### `ReportDetail` (full response)

```python
id: UUID
report_type: str
period_label: str
period_start: date
period_end: date
is_read: bool
content: ReportContent   # full JSONB parsed
created_at: datetime
```

---

## Business Rules

- If user has < 5 data points in week → skip weight/goal sections, report workouts + nutrition only
- Report generated even if partial data — partial > none
- Report generation idempotent: `UNIQUE (user_id, report_type, period_end)` — cron can re-run safely
- Monthly reports: V2. Schema + builder wired but not triggered in V1.
