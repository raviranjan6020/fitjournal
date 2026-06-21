# FitJournal — UI Spec

**Stack:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui components
**Target:** PWA — mobile-first, works on desktop
**Design tone:** Clean, minimal, data-forward. Dark mode optional V2.

---

## Color Palette

```
Primary:     #0066FF   (blue — CTAs, active states)
Success:     #16A34A   (green — on-track, PRs, good)
Warning:     #D97706   (amber — slow progress, low volume)
Danger:      #DC2626   (red — plateau, too fast, very low)
Neutral bg:  #F9FAFB
Card bg:     #FFFFFF
Text:        #111827 (primary) / #6B7280 (secondary)
Border:      #E5E7EB
```

---

## Pages & Screens

---

### 1. Onboarding

**Route:** `/onboarding`
**Trigger:** New user (first login)

Multi-step flow. Each step = one screen.

#### Step 1 — Welcome
```
Logo + tagline
"Track. Improve. Transform."

[Continue with Google]  ← OAuth trigger
```

#### Step 2 — Your Profile
```
Fields:
  Name (pre-filled from Google)
  Date of birth (date picker)
  Gender (radio: Male / Female / Other / Prefer not to say)
  Height (cm, number input)

[Next →]
```

#### Step 3 — Your Goal
```
"What's your current fitness goal?"

[Fat Loss]          [Lean Bulk]
[Muscle Gain]       [Strength Gain]
[Recomposition]     [Maintain]

(selectable cards with icon + 1-line description)

After selection:
  Current weight (kg, required)
  Target weight (kg, optional — hide for Maintain)

[Next →]
```

#### Step 4 — Notification Preferences
```
"How should we send your weekly report?"

[✓] Email (pre-filled with Google email)
[ ] WhatsApp  [Enter number]
[✓] In-app notification

[Get Started →]
```

#### Step 5 — Cold Start Notice
```
"You're all set!"

Illustration: calendar icon

"Your first insights arrive after 2 weeks of logging.
Log workouts and daily check-ins to unlock your analytics."

[Go to Dashboard →]
```

---

### 2. Dashboard

**Route:** `/`
**Accessed:** Every session entry point

#### Layout (mobile, single column)
```
┌─────────────────────────────┐
│  Hi, Ravi 👋  [week date]   │
├─────────────────────────────┤
│  GOAL PROGRESS CARD         │
│  Fat Loss                   │
│  84.2 → 80.0 kg             │
│  -0.38kg/week ● On Track    │
│  Est. 11 weeks to goal      │
├─────────────────────────────┤
│  QUICK STATS ROW            │
│  [🔥 14d streak] [5 workouts this week] [148g protein avg]
├─────────────────────────────┤
│  TODAY'S CHECK-IN           │
│  Weight ___ kg              │
│  Protein ___g  Water ___L   │
│  Sleep ___hrs               │
│  [Save Check-in]            │
├─────────────────────────────┤
│  LAST WORKOUT               │
│  Push · Jun 20              │
│  Bench 90×5, OHP 65×8...    │
│  [Log Today's Workout →]    │
├─────────────────────────────┤
│  STRENGTH SNAPSHOT          │
│  Bench ↑ +2.5kg             │
│  Squat ⚠ Stalled 2 weeks    │
│  Deadlift ↑ +5kg            │
├─────────────────────────────┤
│  LATEST REPORT (if unread)  │
│  Week of Jun 16             │
│  "New PR on Bench! 🎉"      │
│  [Read Report →]            │
└─────────────────────────────┘
```

#### Status indicator colors
- ↑ improving → green
- ⚠ stalled   → amber
- 🔴 plateau  → red
- ✓ on track  → green

---

### 3. Log Workout

**Route:** `/workouts/new`

#### Screen A — Session Setup
```
Date (default: today)
Workout type (Push / Pull / Legs / Upper / Lower / Full Body / Custom)
Name (optional, placeholder: "Monday Push")

[Start Workout →]
```

#### Screen B — Active Session
```
Header: "Push · Jun 21"  [Timer: 0:42]  [Finish]

[+ Add Exercise]

─── Bench Press ──────────────────
  Last session: 87.5×8, 87.5×8, 85×10
  [Set 1]  wt [____] × reps [__]  [✓]
  [Set 2]  wt [____] × reps [__]  [✓]
  [Set 3]  wt [____] × reps [__]  [✓]
  [+ Add Set]  [W+ Add Warmup]

─── Overhead Press ───────────────
  Last session: 60×8, 60×8, 55×10
  ...

[Finish Workout]
```

Notes:
- Weight/reps pre-filled from last session (same exercise)
- PR badge shows inline on set row when PR detected
- Swipe left on set → delete
- Exercise reorder = drag handle

#### Screen C — Session Complete
```
[Confetti / success animation]
Bench Press — New PR! 92.5kg × 3 🎉

Session Summary:
  5 exercises · 18 sets · 47 min
  Total volume: 4,820kg

[View Session]  [Back to Dashboard]
```

---

### 4. Exercise Search (Modal)

**Trigger:** "+ Add Exercise"

```
[Search: ________________]

Recent:
  Bench Press
  Squat
  Pull-up

All Exercises (A–Z):
  Barbell Row
  Bench Press
  ...

[+ Create Custom Exercise]
```

---

### 5. Daily Check-In

**Route:** `/checkin` (also embedded on Dashboard)

```
Today's Check-In — Jun 21

Weight
  [____] kg     (yesterday: 84.2kg)

Protein
  [____] g      (target: 134g)

Water
  [____] L      (target: 2.5L)

Sleep (last night)
  [____] hrs    Quality: ○○○○○

Notes (optional)
  [                    ]

[Save]
```

Saves to body_metrics + nutrition_logs + sleep_logs.
One page → three tables. UX simplicity > domain purity.

---

### 6. Progress / Analytics

**Route:** `/progress`

#### Tab: Weight
```
[Chart: weight over time — line graph]
[7d avg line overlay]

Current:  84.2 kg
Trend:    -0.38kg/week
Status:   ✓ On Track

Goal:     80.0 kg
Est:      ~11 weeks
```

#### Tab: Strength
```
[Exercise selector dropdown]
[Chart: max weight per session — line graph]

Bench Press history:
  Jun 14: 87.5kg
  Jun 17: 90kg
  Jun 21: 92.5kg ← PR

Status: Improving ↑
```

#### Tab: Volume
```
This week's volume (sets per muscle):
  Chest     ████████████  14 sets  ✓
  Back      ████████████  16 sets  ✓
  Legs      ████          8 sets   ~
  Shoulders ██            4 sets   ↓ Low
  Biceps    ██████        10 sets  ✓
```

#### Tab: Consistency
```
Workout streak: 🔥 14 days
This week: 5/4 target ✓
Last 4 weeks: 4.2/week avg

[Mini calendar heatmap — last 8 weeks]
```

---

### 7. Weekly Report

**Route:** `/reports/{id}`

```
Week of Jun 16, 2025
────────────────────

📢 New PR on Bench Press this week!

WEIGHT
  84.0 → 83.6 kg (-0.4kg)
  ✓ On track for fat loss

WORKOUTS
  5 completed · 14-day streak 🔥

PROTEIN
  148g avg (target 134g) ✓

SLEEP
  ⚠ 6.8h avg — slightly below 7h target

STRENGTH
  Bench Press  ↑ +2.5kg
  Squat        ⚠ Stalled (2 weeks)
  Deadlift     ↑ +5kg

THIS WEEK'S RECOMMENDATION
  ┌────────────────────────────────┐
  │ Squat has stalled. Try a rep   │
  │ range change (e.g. 4×8 → 5×5) │
  └────────────────────────────────┘

ALERTS
  · Sleep below 7h — may impact recovery

[Ask Coach about this report →]
```

---

### 8. Reports List

**Route:** `/reports`

```
Your Reports
────────────
Jun 22  Week of Jun 16    "New PR on Bench!"    [unread badge]  →
Jun 15  Week of Jun 9     "On track, solid week"                →
Jun 8   Week of Jun 2     "Squat plateau detected"              →
```

---

### 9. Ask Coach

**Route:** `/coach`

```
Ask Your Coach
──────────────

[Suggestion chips]
  "Why is my squat stalled?"
  "Am I eating enough protein?"
  "Is my bulk too fast?"

[Text input: Ask anything about your fitness...]
                                              [Send →]

─── Conversation ─────────────────────────────

You: Why is my squat stalled?

Coach:
Your squat hasn't progressed in 3 weeks (last: 120kg).
Your sleep average is 6.8h — below the 7h needed for
optimal CNS recovery. Combined with 8 leg sets/week
(below the 10-set minimum), your legs may be under-
recovered and under-stimulated. Try adding 2 leg sets
and prioritising 7h+ sleep this week before changing
the program.

────────────────────────────────────────────

You: [                                         ] [→]
```

---

### 10. Exercise History

**Route:** `/exercises/{slug}/history`

```
Bench Press — History

[Chart: max weight per session]

Session log:
  Jun 21  90×5, 90×5, 87.5×8   🏆 PR: 92.5×3
  Jun 17  87.5×8, 87.5×8, 85×10
  Jun 14  85×8, 85×8, 82.5×10
  Jun 10  82.5×8, 82.5×8, 80×10

PRs:
  Estimated 1RM:  112kg (Jun 21)
  3 rep max:      92.5kg (Jun 21)
  5 rep max:      90kg (Jun 21)
```

---

### 11. Profile & Settings

**Route:** `/settings`

#### Profile tab
```
Name        [Ravi Sharma         ]
Email       ravi@gmail.com (from Google)
Height      [175] cm
DOB         [1990-05-12]
Gender      [Male ▾]

[Save]
```

#### Goal tab
```
Current goal: Fat Loss
  Start: 88kg  Target: 80kg
  Started: Mar 1, 2025

[Change Goal]  ← opens Goal modal (same as onboarding step 3)
```

#### Preferences tab
```
Weekly workout target  [4]
Protein target (g)     [134]  (auto: 134g = 1.6 × 84kg)
Water target (L)       [2.5]

Delivery
  [✓] Email reports
  [ ] WhatsApp  [+91 __________]
  [✓] Push notifications

[Save]
```

---

## Navigation

Bottom tab bar (mobile):

```
[Home]  [Workouts]  [+Log]  [Progress]  [Reports]
```

`+Log` = central FAB-style button, opens: Log Workout / Daily Check-In.

Desktop: left sidebar. Same items.

---

## Empty States

| Screen | Empty State |
|---|---|
| Dashboard — no check-in | "No check-in today. Takes 30 seconds." + [Log Now] |
| Progress — no data | "Start logging to see your progress." |
| Reports — no reports | "Your first report arrives Sunday." |
| Strength — no history | "Log 2+ sessions with this exercise to see trends." |
| Coach — cold start | "Keep logging! Insights unlock after 2 weeks." |

---

## Loading States

- Skeleton cards on Dashboard initial load
- Spinner on chart data fetch
- Optimistic updates on check-in save (instant, sync in background)

---

## Responsive Breakpoints

```
Mobile:   < 640px  — single column, bottom nav
Tablet:   640–1024px — single column, bottom nav
Desktop:  > 1024px — left sidebar, wider cards
```

---

## PWA Requirements

- `manifest.json`: name, icons, theme_color, display: standalone
- Service worker: offline support for dashboard + log workout
- Push subscription: register on first visit, store in backend
- App install prompt: show after 3rd visit or after first report

---

## Accessibility

- All interactive elements keyboard-navigable
- Color not sole indicator of status (icons + text labels alongside color)
- ARIA labels on icon-only buttons
- Min touch target: 44×44px
- Font size min: 14px body, 16px inputs
