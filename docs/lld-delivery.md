# FitJournal — LLD: Delivery Module

**Path:** `app/modules/delivery/`

---

## Responsibility

Ship reports to users via configured channels.
Decoupled from Reporting — receives a report object, fans out to channels.

Two modes:
- **Push**: system-initiated (weekly cron)
- **Pull**: user-initiated (view report in app)

---

## Files

```
delivery/
├── router.py
├── service.py          # fan-out orchestration
├── models.py
├── schemas.py
└── channels/
    ├── base.py         # abstract Channel interface
    ├── email.py        # Resend API
    ├── whatsapp.py     # Meta Cloud API (stubbed in V1)
    └── push.py         # Web Push (PWA)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/delivery/status/{report_id}` | Delivery status per report |
| `POST` | `/delivery/test` | Send test notification (dev/debug) |

Pull delivery = just reading reports via Reporting endpoints. No separate endpoint needed.

---

## Service Logic

### `deliver_report(report_id)` → list[DeliveryResult]

Called by weekly cron after report is built.

```python
def deliver_report(report_id: UUID) -> list[DeliveryResult]:
    report = get_report(report_id)
    prefs  = get_user_preferences(report.user_id)

    channels = []
    if prefs.delivery_email:
        channels.append(EmailChannel())
    if prefs.delivery_whatsapp and prefs.whatsapp_number:
        channels.append(WhatsAppChannel())
    if prefs.delivery_push:
        channels.append(PushChannel())

    results = []
    for channel in channels:
        # Idempotency: one delivery_logs row per (report_id, channel).
        log = upsert_delivery_log(report_id, channel.name)  # creates if absent

        # Never re-send an already-sent or permanently-failed channel.
        if log.status in ('sent', 'permanent_failure'):
            results.append(DeliveryResult(channel=channel.name, status=log.status))
            continue

        # Bound retries: max 2 attempts, then permanent_failure.
        if log.attempt_count >= 2:
            mark_delivery(report_id, channel.name, 'permanent_failure')
            results.append(DeliveryResult(channel=channel.name, status='permanent_failure'))
            continue

        try:
            result = channel.send(report, prefs)
            mark_delivery(report_id, channel.name, 'sent', increment_attempt=True)
            results.append(result)
        except DeliveryError as e:
            new_status = 'permanent_failure' if log.attempt_count + 1 >= 2 else 'failed'
            mark_delivery(report_id, channel.name, new_status, error=str(e), increment_attempt=True)
            results.append(DeliveryResult(channel=channel.name, status=new_status, error=str(e)))

    return results
```

`mark_delivery` updates the unique `(report_id, channel)` row: sets status, bumps
`attempt_count`, stamps `last_attempt_at`/`sent_at`. Because the row is unique,
cron re-runs and retries converge — a `sent` channel is never sent twice.

Fan-out is sequential in V1 (simple). Async parallel if volume grows.

---

## Channel Implementations

### Base Interface

```python
class Channel:
    name: str

    def send(self, report: Report, prefs: UserPreferences) -> DeliveryResult:
        raise NotImplementedError
```

### Email Channel (`email.py`)

Provider: **Resend** (free tier: 3,000 emails/month).

```python
class EmailChannel(Channel):
    name = 'email'

    def send(self, report, prefs):
        content = render_email_html(report)
        resend.Emails.send({
            "from":    "FitJournal <reports@fitjournal.app>",
            "to":      [prefs.user.email],
            "subject": f"Your FitJournal Weekly Report — {report.content['period_label']}",
            "html":    content
        })
        return DeliveryResult(channel='email', status='sent')
```

Email template structure:
```
Subject: Your FitJournal Weekly Report — Week of Jun 16

[Headline]        "New PR on Bench Press! 🎉"
[Weight section]  84.0 → 83.6kg (-0.4kg)
[Workouts]        5 this week · 14-day streak
[Protein]         148g avg (target 134g) ✓
[Strength]        Bench +2.5kg · Squat stalled
[Recommendation]  Try rep range change on Squat
[Alerts]          Sleep avg 6.8h (below 7h)
[CTA button]      "Ask Coach" → deeplink to app
```

### WhatsApp Channel (`whatsapp.py`)

Provider: Meta Cloud API (WhatsApp Business).

```python
class WhatsAppChannel(Channel):
    name = 'whatsapp'

    def send(self, report, prefs):
        # Use pre-approved message template (Meta requirement)
        # Template: "fitjournal_weekly_report"
        # Variables: headline, weight_delta, workout_count, recommendation
        meta_client.send_template(
            to=prefs.whatsapp_number,
            template='fitjournal_weekly_report',
            variables=[
                report.content['headline'],
                format_weight_line(report.content['weight']),
                str(report.content['workouts']['count']),
                report.content['recommendation']
            ]
        )
        return DeliveryResult(channel='whatsapp', status='sent')
```

**Note:** Meta requires template pre-approval. V1 = stub + approval process. Activate when approved.

### Push Channel (`push.py`)

Provider: Web Push (VAPID).

```python
class PushChannel(Channel):
    name = 'push'

    def send(self, report, prefs):
        subscription = get_push_subscription(prefs.user_id)
        if not subscription:
            raise DeliveryError('No push subscription registered')

        webpush(
            subscription_info=subscription,
            data=json.dumps({
                "title": "Your Weekly FitJournal Report",
                "body":  report.content['headline'],
                "url":   f"/reports/{report.id}"
            }),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": "mailto:support@fitjournal.app"}
        )
        return DeliveryResult(channel='push', status='sent')
```

Push subscription stored in `users_preferences` as `push_subscription JSONB`.

---

## Email Template (HTML)

Minimal, mobile-first. No external CSS frameworks (deliverability).

```html
<!-- Single-column, max-width 600px, inline styles -->
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">{{headline}}</h2>
  <hr>
  <!-- Sections rendered as simple key-value rows -->
  <p><strong>Weight:</strong> {{weight_start}} → {{weight_end}}kg ({{delta}})</p>
  <p><strong>Workouts:</strong> {{workout_count}} this week · {{streak}} day streak</p>
  <p><strong>Protein:</strong> {{protein_avg}}g avg (target {{protein_target}}g)</p>
  ...
  <div style="background: #f5f5f5; padding: 12px; border-radius: 4px;">
    <strong>This week:</strong> {{recommendation}}
  </div>
  <a href="{{app_url}}/reports/{{report_id}}"
     style="display: inline-block; margin-top: 16px; padding: 10px 20px;
            background: #0066ff; color: white; border-radius: 4px; text-decoration: none;">
    View Full Report
  </a>
</div>
```

---

## Delivery Retry

```
Each (report_id, channel) has ONE delivery_logs row (unique).
Send attempt → increment attempt_count, set last_attempt_at.
  success            → status='sent'           (never retried)
  failure, attempts<2 → status='failed'        (eligible for retry)
  failure, attempts≥2 → status='permanent_failure' (no more retries)

Retry cron (hourly): pick rows where status='failed' AND attempt_count<2
                     AND last_attempt_at < now - 1h → call deliver_report.
```

`deliver_report` is safe to call repeatedly — it reads each channel's row and skips
`sent`/`permanent_failure`. No duplicate sends. No complex queue in V1.

---

## Pull Delivery

User opens app → hits `GET /reports/latest` → Reporting returns report → mark `is_read = true`.
No separate delivery mechanism needed for pull. It's just reading.

---

## Schemas

### `DeliveryResult`

```python
channel: str           # 'email' | 'whatsapp' | 'push'
status: str            # 'sent' | 'failed'
error: str | None
sent_at: datetime | None
```

### `DeliveryStatus` (response for GET /delivery/status/{report_id})

```python
report_id: UUID
channels: list[DeliveryResult]
```

---

## Business Rules

- If all channels fail → report still exists in DB for pull access
- User with no channels enabled → report saved for pull only (no push)
- WhatsApp disabled by default (cost risk). User opts in explicitly.
- VAPID keys = env var, not in DB
- Email "from" domain must be verified in Resend
