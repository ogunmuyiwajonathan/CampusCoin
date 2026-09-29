# CampusCoin - Project Structure

```
CampusCoin/
├── client/                        # React 19 + JavaScript/JSX (Vite) — react 19.2.8, vite 8.3.0, react-router-dom 7.18.4, tailwindcss v4, lucide-react, recharts
│   └── src/
│       ├── components/            # reusable UI (PascalCase files)
│       │                          #   + Sidebar, MobileNav, StatCard, SpendingDonut, RecentTransactions
│       │                          #   + TransactionForm, ProfileEditor, AvatarPicker, UserAvatar, Toast
│       │                          #   + PageHeader, ThemeToggle, NotificationBell, AssistantFab
│       │                          #   + ErrorBoundary (app-wide crash fallback)
│       │                          #   + Icon.jsx (single lucide-react registry)
│       ├── pages/                 # LandingPage, LoginPage, Signup, AdminLogin,
│       │   │                       #   ForgotPassword, ResetPassword, NotFound
│       │   ├── student/           #   Dashboard, Transactions, Budgets, Insights,
│       │   │                       #   Assistant, Reports, Bookmarks,
│       │   │                       #   Notifications, More, Settings
│       │   └── admin/             #   AdminLayout, Dashboard, Users, Categories,
│       │                           #   Tips, Announcements
│       ├── hooks/                 # AuthProvider/useAuth, useBudgets, useTransactions,
│       │                           #   useCategories, useTips, useBookmarks,
│       │                           #   useRecentlyViewed, ThemeProvider/useTheme
│       ├── data/                  # mockData.js — category constants, derived totals
│       ├── lib/                   # formatCurrency, formatMonth, formatName, insights,
│       │                           #   apiClient (the only HTTP seam), aiAssistant
│       ├── assets/                # aibot.png + WebP art (campusboy, bush-side, laptop, student, about)
│       └── App.jsx · main.jsx · index.css
├── server/                        # Node + Express + Mongoose
│   ├── src/
│   │   ├── controllers/           # HTTP in/out only          ← Controller
│   │   ├── services/              # ledger, reports, insights ← Service
│   │   │                           #   tips, categorise, bookmarks, auth
│   │   ├── models/                # Mongoose schemas         ← Repository layer
│   │   ├── routes/                # /auth /ai /admin /ledger
│   │   │                           #   /reports /bookmarks /insights
│   │   ├── middleware/            # session auth, role guard, rate limits, error handler
│   │   ├── validators/            # zod schemas, one per domain
│   │   ├── utils/                 # ApiError, idOptions, dateMath, sanitizeSvg
│   │   ├── config/                # env, db, session
│   │   ├── app.js · index.js
│   ├── scripts/seed.js            # default categories, tip templates, demo users + data
│   ├── tests/                     # security baseline, auth, and per-feature suites
│   └── .env / .env.example
├── structure/                     # SRS + competition study docs (this folder)
├── instructions/                  # study reference — gitignored, never committed
├── .gitignore · README.md
└── ATTRIBUTION.md                 # AI disclosure (mandatory)
```

## Layer mapping (jury answer)
- **Controller** = HTTP in/out + validation (server/src/controllers)
- **Service** = business logic: budget alerts, insights, tips engine, AI categorize (server/src/services)
- **Repository** = data access, Mongoose models (server/src/models)
- **Presentation** = React pages/components (client/src)

Every screen must handle 4 states: loading / empty / error / success.

## Naming conventions (graded — Code-Create-Compete + React Dos And Don'ts)
| Context | Convention | Example | Fails if |
|---------|------------|---------|----------|
| React components / classes | `PascalCase` | `BudgetCard.jsx`, `TransactionForm.jsx` | `budgetcard.jsx` → Code Quality 25% |
| Functions / variables / hooks | `camelCase` | `useAuth`, `handleSubmit`, `totalBalance` | mixed case |
| Files for components | `PascalCase.jsx` | `Dashboard.jsx` | `dashboard.jsx` |
| API routes | `kebab-case` | `/api/budget-alerts`, `/api/transactions` | |
| DB collections / fields | `snake_case` (chosen — SRS-aligned) | `transaction_id`, `category_id`, `is_default` | any camelCase field like `aiSuggestedCategory` → Maintainability 10% |
| C# (if swapped) | Classes/Methods `PascalCase` | | |
| Python (if used) | `snake_case` | | |
| Git commits | `verb-what-why`, small | `feat: add Budget progress bar with near/exceed alerts` | one giant "first commit" |

Secrets: real `.env` gitignored, commit only `.env.example`. Linters (oxlint) to zero warnings. No `console.log` in final build.

## DB documents (MongoDB + Mongoose)
- **User:** name, email (unique), password_hash (bcrypt), academic year, monthly_savings_goal, allowance_baseline
- **Category:** name, type `income|expense`, `is_default` (separates system defaults from personal — jury one-liner)
- **Transaction:** refs User + Category, amount, type, description, `ai_suggested_category`, date, `is_recurring` + `frequency` + `next_run_at`, `recurring_root` (the series a generated row belongs to), `import_batch_id` (one CSV upload, so the whole batch can be undone)
- **Budget:** refs User + Category, month, limit_amount
- **Insight:** refs User, month, summary_text, tip_text, generated_at — one row per student per month, so history is a query over past months rather than an array that grows forever and approaches the 16 MB document limit
- **Notification:** refs User, title, body, read_at, link, `dedupe_key` — so ten identical budget alerts collapse into one
- **TipTemplate:** the admin-authored wording behind the tips engine — key, text with `{placeholders}`, a `rule` name, a threshold, `savings_impact`, `is_active`. Data, never code: a rule the engine does not recognise is skipped rather than guessed at
- **Tip:** refs User, month, `template_key` (which template produced it), text, savings_impact, pin/dismiss per user
- **CategorySuggestion:** refs User, `description_key`, category_id, `hit_count` — this is "learns from corrections", per student, so one person's habits never leak into another's
- **TransactionHistory:** refs User, a snapshot of a deleted transaction, deleted_at, restored_at — delete is recoverable rather than permanent
- **Bookmark:** refs User + Insight/Tip, month, optional note — saved from the Insights page, listed at `/bookmarks`
- **Conversation / ChatMessage:** Rix's per-student chat history
- **ResetToken:** refs User, hashed token, expires_at — for email password reset
- User also needs `role` (`student|admin`), `is_active` (admin disable), `profile_image_url`, `created_at`

Relations: User 1—M Transactions/Budgets/Insights/Tips/Notifications, Category 1—M Transactions.

## Index notes (why these and not obvious ones)
- `Transaction (user_id, date desc)` serves the monthly ledger read: one user, newest first.
- `Transaction (user_id, request_id)` unique + **partial** on `request_id` existing — this is the double-click guard. It must be partial, not sparse: a sparse index on a compound key still indexes a document when *any* of its fields are present, so with `user_id` always set, every row written without a request_id (the seeder, a CSV import, a generated recurring row) would write a null entry and the second one would be rejected as a duplicate.
- `Transaction (user_id, recurring_root, date)` unique + partial — the same reason. This is what makes the recurring catch-up idempotent: a second pass writes nothing.
- `Tip (user_id, month, template_key)` unique — one tip per template per month, so a regeneration updates the same row and a pin the student set survives.

## Implementation status (verified against the running code, September 2026)

**Built and tested** — the suite in `server/tests/` exercises each row against the real Atlas `campuscoin_test` database, not mocks.

| Area | Where | Notes |
|---|---|---|
| Auth + profile | `services/auth.service.js`, `routes/auth.routes.js` | bcrypt, HTTP-only cookie sessions, 6-digit emailed reset code, username and password change (which signs out other devices), avatar upload |
| Transactions | `services/ledger.service.js` | Add/edit/delete, filters, month selector |
| CSV import | `services/import.service.js`, `components/CsvImportDialog.jsx` | Multipart upload, RFC-4180 parser, per-row validation, per-row accepted/rejected report, unknown categories fall back instead of dropping the row, whole-batch undo |
| Recurring entries | `materialiseRecurring()` in `services/ledger.service.js` | The flag now produces real transactions. Runs on the ledger read rather than a timer, so no second process is needed; catch-up is bounded and idempotent |
| Delete with history | `models/TransactionHistory.js`, `components/DeletedTransactionsDialog.jsx` | A deleted row is kept and restorable |
| Categories | `services/ledger.service.js`, `CategoryManagerDialog.jsx` | Full personal CRUD. Defaults are `user_id: null`, so an edit or delete against one matches no row and answers 404 rather than corrupting shared data |
| Dashboard | `pages/student/Dashboard.jsx` | Greeting, month balance, top category, budget-vs-actual, top tips — all from the database, no mock figures |
| Budgets + alerts | `services/ledger.service.js` | Limits, progress, near (95%) and over (100%), notifications deduped by key |
| Insights | `services/insights.service.js` | One stored `Insight` per month, generated on demand, browsable by month. A month already read is left alone; `regenerateInsight` is the forced path |
| Tips engine | `services/tips.service.js`, `hooks/useTips.js` | Reads `TipTemplate`, renders placeholders against the student's own numbers, ranks by savings impact, pin/dismiss per user. An admin edit or deactivation reaches the student on the next read |
| AI categorisation | `services/categorise.service.js` | Four tiers, cheapest first: what the student taught it, then keyword rules, then the model, then a category-name match, then a fallback. Never returns nothing |
| Reports | `services/reports.service.js`, `pages/student/Reports.jsx` | Filters, day/week/month buckets, 6-month trend, PDF (jsPDF) and image (html2canvas-pro) export, email share |
| Bookmarks | `services/bookmarks.service.js` | Save a month with a note, edit, delete |
| Advanced UX | `hooks/useRecentlyViewed.js` | Recently viewed, month-end forecast, duplicate detection flagged rather than blocked |
| Admin panel | `controllers/admin.controller.js` | Direct login, default categories, tip templates, view/disable/reset users, usage stats, announcements |
| Accessibility | `ThemeProvider`, `Breadcrumbs.jsx`, `index.css` | Dark mode, font-size control, breadcrumbs, loading states on every page |

**Still open**
- Live hosted URL, install docs with credentials for every role, demo video — submission paperwork, not code.
- The OAuth row in the endpoint table below: deliberately deferred, both secrets left blank.

## Design decisions worth defending
- **Phone:** intentionally not collected anywhere (SRS password reset is an emailed code). A stated assumption, not an oversight.
- **Academic year + savings goal:** set via profile update, never at signup. Settings shows "Not added" until set, which is why `ProfileSetupOverlay` exists.
- **Joined date:** the profile line maps to `created_at`, formatted "Mon YYYY".
- **AI key exposure (fixed in S0):** `lib/aiAssistant.js` used to read `VITE_AI_API_KEY` and call OpenAI straight from the browser. Vite inlines every `VITE_*` value into the shipped JavaScript, so the key was public. Every provider call now goes through the server and the key lives only in `server/.env`.
- **A transaction's type is never trusted from the client.** It is always taken from the category the row points at, so an expense cannot be filed as income by posting a different `type` alongside it.
- **A recurring row is not a cron job.** Generation is triggered by the ledger read — the moment a student is actually looking at their money — and needs no second process.
- **Auth security:** every guessable route carries its own limiter (login, register, password reset, admin login, AI), the session cookie is HTTP-only with a trusted-origin check on every state-changing request, and a password change destroys that account's other sessions.

## Endpoint inventory (all mounted; session-guarded except the public auth routes)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PATCH /api/auth/me`, `PATCH /api/auth/me/password`, `POST /api/auth/me/avatar`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Profile | covered by `/api/auth/me` — name, academic year, allowance, savings goal |
| Categories | `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id` |
| Transactions | `GET/POST /api/transactions`, `PATCH/DELETE /api/transactions/:id` |
| CSV import | `POST /api/transactions/import` (multipart), `DELETE /api/transactions/import/:batchId` (undo) |
| Delete history | `GET /api/transactions/history`, `POST /api/transactions/history/:id/restore` |
| Budgets | `GET/POST /api/budgets`, `PATCH/DELETE /api/budgets/:id` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| Insights | `GET /api/insights` (history), `GET /api/insights/month?month=`, `POST /api/insights/month?month=` (regenerate) |
| Tips | `GET /api/tips?month=`, `GET /api/tips/dismissed?month=`, `POST /api/tips/:id/pin`, `/unpin`, `/dismiss`, `/restore` |
| AI | `POST /api/ai/chat`, conversation CRUD, `GET /api/ai/categorise/suggest?q=`, `POST /api/ai/categorise/confirm`, `POST /api/ai/categorise/batch` |
| Reports | `GET /api/reports?from=&to=&category=&granularity=`, `GET /api/reports/categories`, `POST /api/reports/share` (email) |
| Bookmarks | `GET/POST /api/bookmarks`, `PATCH/DELETE /api/bookmarks/:id` |
| Admin | `POST /api/admin/auth/login` (name + password + remember me), `GET /api/admin/users`, `PUT /api/admin/users/:id/disable`, `PUT /api/admin/users/:id/reset`, `GET/PATCH /api/admin/categories`, `GET/PATCH /api/admin/tips`, `GET /api/admin/stats`, announcement CRUD |
| Announcements | `GET /api/announcements` (student-facing) |
| OAuth | **not built** — deferred rather than cancelled; both secrets left blank in `.env.example` |

## Secrets the server will need
`MONGODB_URI` · `SESSION_SECRET` · `POOLSIDE_API_KEY` (server-only, never rotated by tooling) · `RESEND_API_KEY` (sender `onboarding@resend.dev` until a domain is verified) · `CORS_ORIGIN` · `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` left blank — OAuth is deferred, not cancelled. All live in `server/.env` (gitignored); only `.env.example` is committed. Nothing secret is ever a `VITE_` variable, because Vite inlines those into the client bundle.

## What the SRS says to build (CampusCoin — 14 modules)

**Must-build (scored):**
1. **Auth + Profile** — register/login, profile fields above, email/token password reset (bcrypt + sessions/JWT)
2. **Logging** — quick-add income/expense form + recurring entries (allowance, subscriptions)
3. **Categories** — personal + system defaults via `is_default`
4. **Dashboard** — greeting, month balance, top category, budget-vs-actual
5. **Budgets** — per-category monthly limits with progress bars + near/exceed in-app alerts
6. **Reports** — category-wise, 6-month income-vs-expense chart, daily/weekly, filters by date/category/source, **PDF or image export** (jsPDF/Recharts)
7. **CSV bulk import** — with batch AI suggestions on import
8. **AI categorize** — suggest-as-you-type with **manual override** (`aiSuggestedCategory`)
9. **Monthly insights** — narrative with growth flag + actionable advice + stored history
10. **Tips engine** — rules-based, ranked by savings impact, pin/dismiss
11. **Bookmarks + share** — bookmark insights/tips, PDF share by email
12. **Admin panel** — manage default categories, tip templates, view/disable/reset users, stats (active users, total transactions, most-used categories)
13. **System** — dark mode + font-size control + breadcrumbs + loading indicators + **sitemap on home**

**Optional (only after 100% above):**
- AI chatbot (tawk.to / Tidio) or extra AI API — allowed as creativity, must be listed in `ATTRIBUTION.md` and you must explain every line. Building before core loses Functionality 25%.

**DON'T build:** banking integration, payments, real money handling — out-of-scope, loses Presentation + Functionality.

## Submission checklist (Presentation 20%)
- Install instructions + credentials for **every** role, ReadMe.doc with assumptions + `.sql`/schema files in zip, `.mp4` demo covering **all** functional requirements, sitemap on home, flowcharts/DFDs/DB design in report, no source code in docs, README with run steps + architecture diagram, `ATTRIBUTION.md`, fresh-clone build passes, incognito demo tested.

*Source: structure/CampusCoin-SRS-Notes.md, structure/SRS-Dos-And-Donts.md, structure/SRS-Overview.md, structure/Code-Create-Compete-Notes.md, structure/React-Dos-And-Donts.md, structure/Designing-Enterprise-Web-Applications-Notes.md*
