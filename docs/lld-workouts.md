# FitJournal — LLD: Workouts Module

**Path:** `app/modules/workouts/`

---

## Responsibility

- Log workout sessions
- Track exercises, sets, reps, weight per session
- Manage exercise library (system + user-created)
- Detect personal records (PRs) automatically

---

## Files

```
workouts/
├── router.py
├── service.py
├── models.py
├── schemas.py
└── pr_detector.py   # PR detection logic
```

---

## API Endpoints

### Sessions

| Method | Path | Description |
|---|---|---|
| `GET` | `/workouts/sessions` | List sessions (paginated, date-filtered) |
| `POST` | `/workouts/sessions` | Create session |
| `GET` | `/workouts/sessions/{id}` | Get session with full exercise detail |
| `PATCH` | `/workouts/sessions/{id}` | Update session metadata |
| `DELETE` | `/workouts/sessions/{id}` | Delete session |

### Exercises within session

| Method | Path | Description |
|---|---|---|
| `POST` | `/workouts/sessions/{id}/exercises` | Add exercise to session |
| `PATCH` | `/workouts/sessions/{id}/exercises/{log_id}` | Update exercise log |
| `DELETE` | `/workouts/sessions/{id}/exercises/{log_id}` | Remove exercise from session |

### Sets

| Method | Path | Description |
|---|---|---|
| `POST` | `/workouts/sessions/{id}/exercises/{log_id}/sets` | Add set |
| `PATCH` | `/workouts/sessions/{id}/exercises/{log_id}/sets/{set_id}` | Edit set |
| `DELETE` | `/workouts/sessions/{id}/exercises/{log_id}/sets/{set_id}` | Delete set |

### Exercise Library

| Method | Path | Description |
|---|---|---|
| `GET` | `/exercises` | Search exercise library |
| `POST` | `/exercises` | Create custom exercise |
| `GET` | `/exercises/{id}/history` | User's history for one exercise |

### PRs

| Method | Path | Description |
|---|---|---|
| `GET` | `/workouts/prs` | All PRs for current user |
| `GET` | `/workouts/prs/{exercise_id}` | PR history for one exercise |

---

## Service Logic

### `create_session(user_id, data)` → Session

```
1. Insert workout_sessions row
2. Return session (empty exercises list)
```

### `add_exercise(session_id, exercise_id)` → ExerciseLog

```
1. Validate session belongs to user
2. Set order_index = current max + 1
3. Insert workout_exercise_logs row
4. Return log
```

### `add_set(exercise_log_id, set_data)` → Set

```
1. Validate log belongs to user
2. Run pr_detector.check against EXISTING history (before insert)
3. Insert workout_sets row (carry is_pr flag from step 2)
4. Return set + pr_flag
```

PR check MUST run before the new set is persisted (or exclude it by id) — otherwise
the new set is in history and can never beat itself.

### `delete_set(set_id)` → void

```
1. Validate ownership
2. Delete set
3. Re-run PR check for that exercise (in background)
```

---

## PR Detection

**File:** `pr_detector.py`

PR = new max weight for any rep count (not just 1RM).

### Algorithm

```python
def check_pr(user_id, exercise_id, weight_kg, reps, exclude_set_id=None) -> PR | None:
    # Load non-warmup history EXCLUDING the set being evaluated.
    # Critical: never include the candidate set, else it cannot beat itself.
    history = get_sets_history(user_id, exercise_id, exclude_set_id=exclude_set_id)

    # For this rep count: is new weight > previous best?
    prev_best = max((s.weight_kg for s in history if s.reps == reps), default=0)
    if weight_kg > prev_best:
        return PR(exercise_id, weight_kg, reps, type='rep_pr')

    # Check estimated 1RM PR: Epley formula weight * (1 + reps/30)
    new_e1rm = weight_kg * (1 + reps / 30)
    prev_e1rm = max((s.weight_kg * (1 + s.reps / 30) for s in history), default=0)
    if new_e1rm > prev_e1rm:
        return PR(exercise_id, weight_kg, reps, type='estimated_1rm_pr')

    return None
```

PRs stored in `analytics_snapshots.new_prs` JSONB (not a separate table — recalculated on snapshot rebuild).

---

## Workout Session Completion

Session considered "complete" when user navigates away or explicitly taps Done. No auto-complete. Duration = `updated_at - created_at` if not manually set.

---

## Schemas

### `SessionCreate` (request)

```python
date: date
workout_type: str
name: str | None = None
notes: str | None = None
```

### `SessionDetail` (response)

```python
id: UUID
date: date
workout_type: str
name: str | None
duration_min: int | None
notes: str | None
exercises: list[ExerciseLogDetail]
total_sets: int
total_volume_kg: float   # sum(weight * reps) across all working sets
```

### `SetCreate` (request)

```python
weight_kg: float
reps: int
rpe: float | None = None
is_warmup: bool = False
```

### `SetResponse` (response)

```python
id: UUID
set_number: int
weight_kg: float
reps: int
rpe: float | None
is_warmup: bool
is_pr: bool           # flagged by pr_detector
```

---

## Query Patterns

### Last session for exercise (for pre-fill)

```sql
SELECT ws.*
FROM workout_sets ws
JOIN workout_exercise_logs wel ON ws.exercise_log_id = wel.id
JOIN workout_sessions wses ON wel.session_id = wses.id
WHERE wses.user_id = :user_id
  AND wel.exercise_id = :exercise_id
  AND ws.is_warmup = false
ORDER BY wses.date DESC, ws.set_number ASC
LIMIT 20;
```

Used to pre-fill last session's weights when user adds an exercise.

### Weekly volume per muscle group

```sql
SELECT
    unnest(el.muscle_groups) AS muscle_group,
    COUNT(ws.id) AS set_count
FROM workout_sets ws
JOIN workout_exercise_logs wel ON ws.exercise_log_id = wel.id
JOIN workout_sessions wses ON wel.session_id = wses.id
JOIN exercise_library el ON wel.exercise_id = el.id
WHERE wses.user_id = :user_id
  AND wses.date >= :week_start
  AND ws.is_warmup = false
GROUP BY muscle_group;
```

---

## Exercise Library Seed

Core compound lifts pre-seeded:

```
Bench Press         [chest, triceps, shoulders]     barbell
Incline Bench       [chest, triceps, shoulders]     barbell
Squat               [quads, glutes, hamstrings]     barbell
Deadlift            [hamstrings, glutes, back]      barbell
Romanian Deadlift   [hamstrings, glutes]            barbell
Overhead Press      [shoulders, triceps]            barbell
Pull-up             [back, biceps]                  bodyweight
Barbell Row         [back, biceps]                  barbell
Dumbbell Row        [back, biceps]                  dumbbell
Lat Pulldown        [back, biceps]                  cable
Cable Row           [back, biceps]                  cable
Dip                 [chest, triceps]                bodyweight
Dumbbell Curl       [biceps]                        dumbbell
Tricep Pushdown     [triceps]                       cable
Leg Press           [quads, glutes]                 machine
Leg Curl            [hamstrings]                    machine
Calf Raise          [calves]                        machine
... (~60 total)
```

---

## Business Rules

- Warmup sets excluded from volume / overload calculations
- Max 20 exercises per session (UI constraint)
- Max 10 sets per exercise (UI constraint)
- Custom exercises scoped to user; not visible to others
- RPE optional — analytics use it only if present
