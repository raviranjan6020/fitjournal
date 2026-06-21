# FitJournal — LLD: Users Module

**Path:** `app/modules/users/`

---

## Responsibility

- Authentication via Google OAuth
- User profile (height, DOB, gender)
- Active fitness goal management
- User preferences (notifications, targets)

---

## Files

```
users/
├── router.py       # HTTP routes
├── service.py      # business logic
├── models.py       # SQLAlchemy ORM models
├── schemas.py      # Pydantic request/response schemas
└── deps.py         # get_current_user dependency
```

---

## API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/google` | Redirect to Google OAuth consent |
| `GET` | `/auth/google/callback` | Handle OAuth callback, issue JWT |
| `POST` | `/auth/logout` | Clear session / revoke token |
| `GET` | `/auth/me` | Get current authenticated user |

### Profile

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me` | Get full profile |
| `PATCH` | `/users/me` | Update profile fields |
| `DELETE` | `/users/me` | Soft-delete account |

### Goals

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me/goal` | Get active goal |
| `POST` | `/users/me/goal` | Create/replace active goal |
| `PATCH` | `/users/me/goal` | Update goal target |

### Preferences

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me/preferences` | Get preferences |
| `PATCH` | `/users/me/preferences` | Update preferences |

---

## Service Logic

### `create_or_update_user_from_oauth(token_data)`

```
1. Decode Google ID token
2. Lookup user by auth_provider_id
3. If not found → create user record
4. If found → update name/avatar if changed
5. Upsert users_preferences with defaults
6. Return (user, is_new_user)
```

### `set_active_goal(user_id, goal_data)`

```
1. Set is_active=false on current active goal (if any)
2. Insert new goal with is_active=true
3. Recompute protein_target in preferences: 1.6 * current_weight_kg
4. Return new goal
```

### `get_onboarding_status(user_id)`

Returns:
```json
{
  "profile_complete": true,
  "goal_set": true,
  "first_workout_logged": false,
  "first_checkin_logged": false,
  "ready_for_insights": false   // true when ≥ 14 days data
}
```

---

## Schemas

### `UserProfile` (response)

```python
id: UUID
email: str
name: str
avatar_url: str | None
height_cm: float | None
date_of_birth: date | None
gender: str | None
timezone: str
created_at: datetime
goal: GoalSummary | None
preferences: UserPreferences
onboarding: OnboardingStatus
```

### `GoalCreate` (request)

```python
goal_type: Literal['fat_loss','lean_bulk','muscle_gain','strength_gain','recomposition','maintain']
target_weight_kg: float | None
start_weight_kg: float
target_date: date | None
```

### `UserPreferencesUpdate` (request)

```python
protein_target_g: int | None
water_target_l: float | None
weekly_workout_target: int | None
report_day: str | None
delivery_email: bool | None
delivery_whatsapp: bool | None
delivery_push: bool | None
whatsapp_number: str | None
```

---

## Auth Flow

```
Client                   FastAPI              Google
  │                          │                   │
  │  GET /auth/google        │                   │
  │─────────────────────────>│                   │
  │  302 → Google consent    │                   │
  │<─────────────────────────│                   │
  │  [user authorizes]       │                   │
  │──────────────────────────────────────────────>│
  │  callback?code=xxx       │                   │
  │─────────────────────────>│                   │
  │                          │ exchange code      │
  │                          │───────────────────>│
  │                          │ id_token + profile │
  │                          │<───────────────────│
  │                          │ upsert user        │
  │  JWT (httpOnly cookie)   │                   │
  │<─────────────────────────│                   │
```

JWT payload:
```json
{ "sub": "<user_uuid>", "email": "...", "exp": <unix_ts> }
```

### Cookie security (required)

Session JWT stored in a cookie with ALL of:
```
HttpOnly                 # no JS access — XSS-safe
Secure                   # HTTPS only
SameSite=Lax             # CSRF mitigation for top-level nav; blocks cross-site POST
Path=/
Max-Age=2592000          # 30 days
```

- `SameSite=Lax` covers most CSRF. For any state-changing endpoint reachable via
  cross-site requests, add a CSRF token (double-submit cookie or per-session token
  in a custom header checked server-side).
- JWT expiry: 30 days. No refresh token in V1 — re-auth on expiry.

### OAuth flow security (required)

The Google OAuth authorization-code flow MUST include:
- **`state`** — random per-request value, stored server-side / in a short-lived cookie,
  verified on callback. Prevents CSRF on the OAuth redirect.
- **`nonce`** — random value sent in the auth request, echoed in the ID token, verified
  on return. Prevents ID-token replay.
- **PKCE** (`code_challenge` / `code_verifier`, S256) — protects the code exchange.
- Verify ID token signature, `iss`, `aud`, and `exp` before trusting claims.

---

## Business Rules

- One active goal per user at any time
- Goal change resets analytics window but preserves history
- Deleting account = `is_active = false`, data retained 30 days then purged (GDPR)
- `protein_target_g` auto-computed on goal set; user can override

---

## Error Responses

| Code | Scenario |
|---|---|
| `401` | Missing or invalid JWT |
| `403` | Acting on another user's resource |
| `404` | User/goal/preferences not found |
| `422` | Validation failure |
