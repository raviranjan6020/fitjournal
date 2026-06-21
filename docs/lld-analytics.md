# FitJournal — LLD: Analytics Module

**Path:** `app/modules/analytics/`

---

## Responsibility

The product differentiator. Deterministic, no AI, no side effects.

Takes raw user data → produces structured analytics JSON snapshot.
This JSON is consumed by Reporting and AI Coach.

---

## Files

```
analytics/
├── router.py
├── service.py           # orchestrates all engines, writes snapshot
├── models.py
├── schemas.py
├── engines/
│   ├── overload.py      # progressive overload per exercise
│   ├── volume.py        # weekly sets per muscle group
│   ├── consistency.py   # workout frequency + streak
│   ├── goal_progress.py # weight trend vs goal targets
│   ├── plateau.py       # stalled exercises detection
│   └── nutrition.py     # protein/sleep status
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/snapshot` | Get latest snapshot (or trigger compute if stale) |
| `POST` | `/analytics/snapshot/refresh` | Force recompute snapshot |
| `GET` | `/analytics/strength/{exercise_id}` | Strength history for one exercise |
| `GET` | `/analytics/volume` | Volume per muscle group (weekly) |

---

## Snapshot Lifecycle

1. Built weekly as step 1 of report generation (user's report_day, before report build)
2. Can be force-refreshed by user (rate-limited: once/6hr)
3. Snapshot valid for 7 days — stale if `snapshot_date < today - 7`
4. On `GET /analytics/snapshot`: return latest if fresh, else trigger async recompute + return last

---

## Engine Specifications

### 1. Progressive Overload Engine (`overload.py`)

Input: last 6 sessions for each exercise (per user).

```python
def analyze_exercise(sessions: list[WorkoutSession], exercise_id: UUID) -> OverloadSignal:
    # Extract working sets (non-warmup) grouped by session, latest first
    session_sets = group_sets_by_session(sessions, exercise_id)

    if len(session_sets) < 2:
        return OverloadSignal(status='no_data')

    # Best set per session = max(weight * reps) — volume proxy
    best_per_session = [max(s, key=lambda x: x.weight_kg * x.reps) for s in session_sets]

    # Compare last session vs 2 sessions ago
    last  = best_per_session[0]
    prior = best_per_session[1]

    weight_delta = last.weight_kg - prior.weight_kg
    rep_delta    = last.reps - prior.reps

    if weight_delta > 0 or rep_delta > 0:
        status = 'improving'
    elif weight_delta == 0 and rep_delta == 0:
        status = 'stalled'        # check plateau engine for duration
    else:
        status = 'regressed'

    return OverloadSignal(
        exercise_id=exercise_id,
        status=status,
        weight_delta_kg=weight_delta,
        rep_delta=rep_delta,
        last_weight_kg=last.weight_kg,
        last_reps=last.reps
    )
```

Run for top 5 tracked compound exercises per user (by session frequency).

---

### 2. Volume Engine (`volume.py`)

Input: all working sets in current week (Mon–Sun).

```python
def compute_weekly_volume(user_id, week_start) -> dict[str, VolumeSignal]:
    # Sets grouped by muscle group
    sets_by_muscle = query_weekly_sets_by_muscle(user_id, week_start)

    result = {}
    for muscle, set_count in sets_by_muscle.items():
        if set_count >= 10:
            status = 'adequate'
        elif set_count >= 6:
            status = 'moderate'
        else:
            status = 'low'
        result[muscle] = VolumeSignal(sets=set_count, status=status)

    return result
```

Thresholds: adequate ≥ 10 sets/muscle/week, low < 6.

---

### 3. Consistency Engine (`consistency.py`)

```python
def compute_consistency(user_id, today) -> ConsistencySignal:
    # This week (Mon–today)
    this_week = count_workouts(user_id, week_start(today), today)

    # Last 4 weeks avg
    last_4_weeks_avg = count_workouts_avg(user_id, today - 28, today)

    # Streak: consecutive days with ≥ 1 workout
    streak = compute_streak(user_id, today)

    target = get_user_target(user_id)  # from preferences

    return ConsistencySignal(
        workouts_this_week=this_week,
        avg_per_week_last_4w=last_4_weeks_avg,
        streak_days=streak,
        target_per_week=target,
        status='good' if last_4_weeks_avg >= target * 0.75 else 'low'
    )
```

---

### 4. Goal Progress Engine (`goal_progress.py`)

Delegates to `body_metrics.trend.compute_weight_trend()`. Classifies vs goal-specific thresholds.

```python
def assess_goal_progress(user_id) -> GoalProgressSignal:
    goal    = get_active_goal(user_id)
    trend   = compute_weight_trend(user_id)

    if trend.status == 'no_data':          # cold start / sparse data
        return GoalProgressSignal(status='no_data', message='Need 2+ weeks weight data')

    return GoalProgressSignal(
        goal_type=goal.goal_type,
        weight_status=trend.status,            # 'on_track' | 'too_fast' | 'too_slow' | ...
        recent_avg_kg=trend.recent_avg_kg,     # exposed so Reporting can compute week-over-week delta
        kg_per_week=trend.kg_per_week,
        kg_to_goal=abs(goal.target_weight_kg - trend.recent_avg_kg),   # always positive distance
        message=build_message(goal.goal_type, trend)
    )
```

Notes:
- `kg_to_goal` is an absolute distance (always ≥ 0). Direction is conveyed by
  `weight_status` + `kg_per_week`, not by the sign of `kg_to_goal`.
- `recent_avg_kg` is included in the signal AND in the snapshot `goal` block — Reporting
  reads `goal.recent_avg_kg` from the current and previous snapshot to compute the
  weekly weight delta.

---

### 5. Plateau Engine (`plateau.py`)

Identifies exercises stalled for 2+ consecutive weeks.

Works for low-frequency training (even 1 session/exercise/week). Does NOT call
`analyze_exercise` per week (that needs 2 sessions inside one week and would always
return `no_data` for once-weekly lifts). Instead it builds a per-week
"best effort" series and compares week-over-week.

```python
def detect_plateaus(user_id) -> list[PlateauSignal]:
    plateaus = []

    for exercise_id in get_tracked_exercises(user_id):
        # One representative value per week = best working set that week (max weight*reps),
        # reduced to estimated 1RM so weight and rep changes both count.
        weekly_best = [
            best_e1rm_in_week(user_id, exercise_id, week)   # None if no session that week
            for week in last_6_weeks()                       # oldest → newest
        ]

        # Drop weeks with no training (None) — compare only weeks actually trained
        trained = [w for w in weekly_best if w is not None]
        if len(trained) < 3:
            continue   # not enough trained weeks to judge a plateau

        # Count trailing weeks with no improvement vs the prior trained week
        stalled_streak = 0
        for i in range(len(trained) - 1, 0, -1):
            if trained[i] <= trained[i - 1] * 1.005:   # ≤0.5% gain = no real progress
                stalled_streak += 1
            else:
                break

        if stalled_streak >= 2:
            plateaus.append(PlateauSignal(
                exercise_id=exercise_id,
                weeks_stalled=stalled_streak,
                last_weight_kg=latest_top_set_weight(user_id, exercise_id)
            ))

    return plateaus
```

`best_e1rm_in_week` = `max(weight_kg * (1 + reps/30))` over that week's working sets;
returns `None` for untrained weeks. Comparing trained weeks (skipping gaps) makes
plateau detection robust to once-weekly schedules and missed weeks.

---

## Analytics Snapshot Output

`analytics_snapshots.content` JSONB shape:

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
  "sleep": {
    "avg_hours": 6.8,
    "status": "low"
  },
  "consistency": {
    "workouts_this_week": 4,
    "avg_per_week_4w": 3.8,
    "streak_days": 12,
    "status": "good"
  },
  "strength": [
    { "exercise": "bench_press", "name": "Bench Press", "status": "improving", "change_kg": 2.5, "last_weight_kg": 90 },
    { "exercise": "squat",       "name": "Squat",       "status": "stalled",   "change_kg": 0,   "last_weight_kg": 120 }
  ],
  "volume": {
    "chest":    { "sets": 14, "status": "adequate" },
    "back":     { "sets": 16, "status": "adequate" },
    "legs":     { "sets": 8,  "status": "moderate" },
    "shoulders":{ "sets": 4,  "status": "low" }
  },
  "plateaus": [
    { "exercise": "squat", "name": "Squat", "weeks_stalled": 3, "last_weight_kg": 120 }
  ],
  "new_prs": [
    { "exercise": "bench_press", "name": "Bench Press", "weight_kg": 92.5, "reps": 3, "type": "rep_pr" }
  ]
}
```

This JSON = direct input to AI Coach prompt builder.

---

## Thresholds Reference

| Signal | Threshold | Source |
|---|---|---|
| Strength improving | +weight or +reps vs prior session | overload.py |
| Strength stalled | No delta vs prior session | overload.py |
| Plateau | Stalled 2+ consecutive weeks | plateau.py |
| Volume adequate | ≥ 10 sets/muscle/week | volume.py |
| Volume low | < 6 sets/muscle/week | volume.py |
| Bulk too fast | > 0.5% BW/week gain | goal_progress.py |
| Fat loss on track | 0.25–1.0% BW/week loss | goal_progress.py |
| Fat loss too fast | > 1.2% BW/week loss | goal_progress.py |
| Protein adequate | ≥ 1.6g/kg BW (7d avg) | nutrition.py |
| Sleep good | ≥ 7h avg | nutrition.py |
| Consistency good | ≥ 75% of weekly target (4w avg) | consistency.py |
| Cold start | < 14 days weight data | goal_progress.py |

---

## Business Rules

- All engines = pure functions (input → output, no DB writes)
- Service layer calls all engines, assembles result, writes snapshot
- Cold start: if `< 14 days weight data`, skip goal/plateau engines, return `no_data` for those signals
- Snapshot written atomically — partial snapshot never persisted
