# FitJournal — LLD: Body Metrics Module

**Path:** `app/modules/body_metrics/`

---

## Responsibility

- Daily check-in: bodyweight, optional measurements
- Sleep tracking
- Weight trend computation (7-day and 3-week rolling avg)
- Data used by Analytics for goal progress assessment

---

## Files

```
body_metrics/
├── router.py
├── service.py
├── models.py
├── schemas.py
└── trend.py     # rolling avg, trend computation
```

---

## API Endpoints

### Body Metrics

| Method | Path | Description |
|---|---|---|
| `GET` | `/body-metrics` | List entries (date range filter) |
| `POST` | `/body-metrics` | Create or upsert daily entry |
| `GET` | `/body-metrics/{date}` | Get entry for specific date |
| `PATCH` | `/body-metrics/{date}` | Update entry |
| `DELETE` | `/body-metrics/{date}` | Delete entry |
| `GET` | `/body-metrics/trend` | Get weight trend stats |

### Sleep

| Method | Path | Description |
|---|---|---|
| `GET` | `/sleep` | List sleep logs (date range) |
| `POST` | `/sleep` | Upsert sleep log |
| `GET` | `/sleep/{date}` | Get sleep for date |
| `PATCH` | `/sleep/{date}` | Update sleep |

### Daily Check-In (composite)

| Method | Path | Description |
|---|---|---|
| `POST` | `/checkin` | Upsert weight + protein + water + sleep in ONE transaction |
| `GET` | `/checkin/{date}` | Get combined check-in data for a date |

The UI check-in screen writes three tables (`body_metrics`, `nutrition_logs`,
`sleep_logs`). `POST /checkin` wraps all three upserts in a single DB transaction —
all succeed or all roll back. Avoids partial-save state (e.g. weight saved but
protein lost). Request body:

```python
class CheckinUpsert(BaseModel):
    date: date
    # body
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    # nutrition
    protein_g: int | None = None
    water_l: float | None = None
    calories: int | None = None
    # sleep
    sleep_hours: float | None = None
    sleep_quality: int | None = None
    notes: str | None = None
```

Service fans out to `body_metrics.upsert`, `nutrition.upsert`, `sleep.upsert`
within one transaction. Empty sub-sections skipped (no row written for that table).

---

## Service Logic

### `upsert_metrics(user_id, date, data)` → BodyMetrics

```
1. INSERT ... ON CONFLICT (user_id, date) DO UPDATE
2. Return updated record
```

### `get_weight_trend(user_id, days=21)` → TrendResult

**File:** `trend.py`

```python
# Requirement (single source of truth):
#   - data spans ≥ 14 calendar days (first→last weigh-in)
#   - ≥ 8 weigh-ins total
#   - both the recent window and the baseline window are non-empty
# This matches the 14-day cold-start gate. Below it → 'no_data'.

def compute_weight_trend(entries: list[BodyMetrics], goal) -> TrendResult:
    weighed = [e for e in entries if e.weight_kg]      # ignore null/0
    if len(weighed) < 8:
        return TrendResult(status='no_data', data_points=len(weighed))

    weighed.sort(key=lambda e: e.date)
    span_days = (weighed[-1].date - weighed[0].date).days
    if span_days < 14:
        return TrendResult(status='no_data', data_points=len(weighed))

    today = weighed[-1].date

    # Date-anchored windows (sparse-logging safe — no list-index slicing):
    recent   = [e.weight_kg for e in weighed if e.date >  today - timedelta(days=7)]
    baseline = [e.weight_kg for e in weighed if today - timedelta(days=21) < e.date <= today - timedelta(days=14)]

    if not recent or not baseline:
        return TrendResult(status='no_data', data_points=len(weighed))

    recent_avg   = mean(recent)
    baseline_avg = mean(baseline)

    # Window centers are ~2 weeks apart → divide by 2 to get per-week rate.
    kg_per_week  = (recent_avg - baseline_avg) / 2
    pct_per_week = kg_per_week / baseline_avg * 100

    return TrendResult(
        recent_avg_kg=recent_avg,
        kg_per_week=kg_per_week,
        pct_per_week=pct_per_week,
        data_points=len(weighed),
        status=classify_trend(kg_per_week, pct_per_week, goal)
    )
```

### `classify_trend(kg_per_week, pct_per_week, goal)` → str

```
fat_loss:
    > +0.1%/wk     → 'gaining'     (wrong direction)
    -0.25–+0.1%    → 'too_slow'
    -1.0– -0.25%   → 'on_track'
    < -1.2%/wk     → 'too_fast'    (muscle loss risk)

lean_bulk:
    < 0.1%/wk      → 'too_slow'
    0.1–0.5%/wk    → 'on_track'
    > 0.5%/wk      → 'too_fast'    (fat gain risk)

maintain:
    ±0.2%/wk       → 'on_track'
    else            → 'drifting'

muscle_gain / strength_gain / recomposition:
    use lean_bulk thresholds as proxy
```

---

## Schemas

### `BodyMetricsUpsert` (request)

```python
date: date
weight_kg: float | None = None
body_fat_pct: float | None = None
waist_cm: float | None = None
chest_cm: float | None = None
left_arm_cm: float | None = None
right_arm_cm: float | None = None
notes: str | None = None
```

### `BodyMetricsResponse` (response)

```python
date: date
weight_kg: float | None
body_fat_pct: float | None
waist_cm: float | None
chest_cm: float | None
left_arm_cm: float | None
right_arm_cm: float | None
notes: str | None
```

### `TrendResult` (response)

```python
status: str          # 'on_track' | 'too_fast' | 'too_slow' | 'gaining' | 'drifting' | 'no_data'
recent_avg_kg: float | None
kg_per_week: float | None
pct_per_week: float | None
data_points: int
message: str         # human-readable: "Losing 0.4kg/week — on track for fat loss"
```

### `SleepUpsert` (request)

```python
date: date
hours: float         # 0.0–24.0
quality: int | None  # 1–5
```

---

## Data Quality Rules

- Weight = 0 or null → ignore in trend calculation
- Outlier filter: weight ±15% from 7-day rolling avg → flag but don't auto-exclude (could be real)
- Min 8 weigh-ins spanning ≥ 14 calendar days before trend shown (matches cold-start gate)
- Sleep hours validated: 0 < hours ≤ 16 (reject >16 as likely error)

---

## Dashboard Data

`GET /body-metrics/trend` returns enough for dashboard card:

```json
{
  "current_weight_kg": 84.2,
  "goal_weight_kg": 80.0,
  "kg_to_go": 4.2,
  "trend_status": "on_track",
  "kg_per_week": -0.38,
  "estimated_weeks_to_goal": 11,
  "data_points": 18
}
```

`estimated_weeks_to_goal` = `kg_to_go / abs(kg_per_week)`. Null if trend wrong direction or insufficient data.
