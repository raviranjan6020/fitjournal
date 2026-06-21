# FitJournal — LLD: Nutrition Module

**Path:** `app/modules/nutrition/`

---

## Responsibility

- Daily protein, water, calories (optional) logging
- 7-day averages for analytics
- Status vs user's protein/water targets

Intentionally minimal. No food DB, no barcode scanner, no recipe engine.

---

## Files

```
nutrition/
├── router.py
├── service.py
├── models.py
└── schemas.py
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/nutrition` | List logs (date range) |
| `POST` | `/nutrition` | Upsert daily log |
| `GET` | `/nutrition/{date}` | Get log for date |
| `PATCH` | `/nutrition/{date}` | Update log |
| `DELETE` | `/nutrition/{date}` | Delete log |
| `GET` | `/nutrition/summary` | 7-day averages + status |

---

## Service Logic

### `upsert_log(user_id, date, data)` → NutritionLog

```
INSERT ... ON CONFLICT (user_id, date) DO UPDATE
```

### `get_summary(user_id, days=7)` → NutritionSummary

```python
def get_summary(user_id, days=7):
    logs = fetch_last_n_days(user_id, days)

    protein_entries = [l.protein_g for l in logs if l.protein_g is not None]
    water_entries   = [l.water_l   for l in logs if l.water_l   is not None]

    protein_avg = mean(protein_entries) if protein_entries else None
    water_avg   = mean(water_entries)   if water_entries   else None

    prefs = get_user_preferences(user_id)

    protein_status = classify_protein(protein_avg, prefs.protein_target_g)
    water_status   = classify_water(water_avg, prefs.water_target_l)

    return NutritionSummary(
        protein_avg_g=protein_avg,
        protein_target_g=prefs.protein_target_g,
        protein_status=protein_status,
        water_avg_l=water_avg,
        water_target_l=prefs.water_target_l,
        water_status=water_status,
        days_logged=len(protein_entries),
        days_in_period=days
    )
```

### `classify_protein(avg_g, target_g)` → str

```
None             → 'no_data'
avg >= target    → 'adequate'
avg >= target*0.875  → 'low'       (within 12.5% of target)
else             → 'very_low'
```

### `classify_water(avg_l, target_l)` → str

```
None             → 'no_data'
avg >= target    → 'adequate'
else             → 'low'
```

---

## Schemas

### `NutritionUpsert` (request)

```python
date: date
protein_g: int | None = None
water_l: float | None = None
calories: int | None = None
notes: str | None = None
```

### `NutritionLog` (response)

```python
date: date
protein_g: int | None
water_l: float | None
calories: int | None
notes: str | None
protein_status: str   # vs target for this day
```

### `NutritionSummary` (response)

```python
protein_avg_g: float | None
protein_target_g: int
protein_status: str       # 'adequate' | 'low' | 'very_low' | 'no_data'
water_avg_l: float | None
water_target_l: float
water_status: str         # 'adequate' | 'low' | 'no_data'
days_logged: int
days_in_period: int
```

---

## Protein Target Default

Computed on goal set:

```
target_g = round(1.6 * current_weight_kg)
```

User can override in preferences. Used as baseline for status classification.

---

## Business Rules

- One log per user per date — upsert pattern
- All fields optional per entry (can log only protein, skip water)
- Calories optional — not used in V1 analytics. Stored for future
- No validation of protein/calories against each other
