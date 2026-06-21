# FitJournal — LLD: AI Coach Module

**Path:** `app/modules/ai_coach/`

---

## Responsibility

On-demand coaching via LLM. AI is called only when user explicitly asks.
Never auto-called on every log action.

AI narrates pre-computed analytics data. It does not re-derive insights — the analytics engine already did that.

---

## Files

```
ai_coach/
├── router.py
├── service.py
├── prompt_builder.py    # builds system + user prompt from snapshot JSON
├── models.py
└── schemas.py
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/coach/ask` | Ask a question; returns AI answer |
| `GET` | `/coach/history` | Recent Q&A history for user (last 20) |

---

## Service Logic

### `ask(user_id, question)` → CoachResponse

```python
def ask(user_id: UUID, question: str) -> CoachResponse:
    # 1. Load latest analytics snapshot (must be fresh ≤ 7 days)
    snapshot = get_latest_snapshot(user_id)
    if not snapshot:
        return CoachResponse(
            answer="I don't have enough data yet. Log workouts and check-ins for 1–2 weeks first.",
            has_data=False
        )

    # 2. Build prompt
    system_prompt = build_system_prompt(snapshot)
    user_prompt   = question

    # 3. Call LLM
    response = call_llm(system_prompt, user_prompt)

    # 4. Store Q&A (for history)
    store_qa(user_id, question, response.answer, snapshot.id)

    return CoachResponse(answer=response.answer, tokens_used=response.usage)
```

---

## Prompt Builder

### System Prompt Template

```python
def build_system_prompt(snapshot: AnalyticsSnapshot) -> str:
    s = snapshot.content  # the JSONB dict

    return f"""You are FitJournal Coach — a direct, data-driven fitness advisor.

The user's analytics data for the past week:

GOAL: {s['goal']['type']} — Status: {s['goal']['weight_status']}
Weight trend: {s['goal'].get('kg_per_week', 'N/A')} kg/week
Message: {s['goal'].get('message', '')}

NUTRITION (7-day avg):
- Protein: {s['nutrition']['protein_avg_g']}g (target: {s['nutrition']['protein_target_g']}g) — {s['nutrition']['protein_status']}
- Water: {s['nutrition']['water_avg_l']}L — {s['nutrition']['water_status']}

SLEEP (7-day avg): {s['sleep']['avg_hours']}h — {s['sleep']['status']}

CONSISTENCY:
- This week: {s['consistency']['workouts_this_week']} workouts
- Last 4 weeks avg: {s['consistency']['avg_per_week_4w']}/week
- Streak: {s['consistency']['streak_days']} days
- Status: {s['consistency']['status']}

STRENGTH (key lifts):
{format_strength(s['strength'])}

VOLUME (sets/muscle/week):
{format_volume(s['volume'])}

PLATEAUS:
{format_plateaus(s['plateaus']) if s['plateaus'] else 'None detected.'}

NEW PRs THIS WEEK:
{format_prs(s['new_prs']) if s['new_prs'] else 'None.'}

---
Rules:
- Answer ONLY based on the data above. Do not hallucinate trends not in the data.
- Be direct. 2–4 sentences max unless the answer requires more.
- If you need more data to answer, say so clearly.
- If the question is outside fitness/health scope, politely decline.
"""
```

---

## LLM Configuration

| Setting | Value |
|---|---|
| Model (primary) | `gpt-4o-mini` |
| Model (fallback) | `gpt-3.5-turbo` |
| Max input tokens | ~800 (system prompt + question) |
| Max output tokens | 300 |
| Temperature | 0.4 (focused, not creative) |
| Timeout | 10s |
| Retry | 2x on 5xx, exponential backoff |

Why `gpt-4o-mini`: cost ~$0.00015/1K input tokens. A Q&A exchange ≈ 1K tokens ≈ $0.00015. Affordable for personal use.

---

## Fallback Behavior

```
LLM unavailable (timeout / API down):
  → Return: "Coach is temporarily unavailable. Your analytics data is still ready — check your dashboard."

No snapshot / cold start:
  → Return: "Need 1–2 weeks of data first. Keep logging!"

Question out of scope:
  → LLM instructed to decline (prompt-level guardrail)
```

---

## Token Cost Control

- System prompt ≈ 400–500 tokens (fixed)
- User question ≈ 50–100 tokens
- Response capped at 300 tokens
- Total per ask ≈ 800–900 tokens
- At $0.00015/1K input + $0.0006/1K output: ~$0.0003/ask
- 100 asks/month ≈ $0.03

No streaming in V1. Simple request-response.

---

## Q&A Storage

Last 20 Q&As per user stored as JSONB in `users_preferences.coach_history`
(see data-model). No separate table in V1.

```sql
coach_history JSONB DEFAULT '[]'
-- [{question, answer, asked_at, snapshot_id}, ...]
-- keep last 20, pop oldest on insert
```

---

## Schemas

### `CoachAskRequest` (request)

```python
question: str    # max 500 chars
```

### `CoachResponse` (response)

```python
answer: str
has_data: bool
tokens_used: int | None
asked_at: datetime
```

### `CoachHistoryItem`

```python
question: str
answer: str
asked_at: datetime
```

---

## Suggested Questions (UI)

Pre-fill chips shown to user to lower friction:

```
"Why is my [exercise] stalled?"
"Am I eating enough protein?"
"Is my bulk going too fast?"
"Why am I not losing weight?"
"How's my training volume?"
"What should I focus on this week?"
```

---

## Business Rules

- Rate limit: 10 asks/day per user (prevent runaway cost)
- Question min length: 5 chars, max 500 chars
- No conversation history passed to LLM (stateless per ask — keeps tokens low)
- Each ask gets fresh snapshot context — no stale coaching
