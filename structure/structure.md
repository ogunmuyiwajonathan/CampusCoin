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
│       ├── pages/                 # LandingPage, LoginPage, Signup, Dashboard, Transactions,
│       │                          #   Budgets, Insights, Assistant, Settings
│       ├── hooks/                 # AuthProvider/useAuth, useBudgets, useTransactions, ThemeProvider/useTheme
│       ├── data/                  # mockData.js — seed data, category constants, derived totals
│       ├── lib/                   # formatCurrency, formatMonth, formatName, insights, apiClient, aiAssistant
│       ├── assets/                # aibot.png + WebP art (campusboy, bush-side, laptop, student, about)
│       └── App.jsx · main.jsx · index.css
├── server/                        # NOT CREATED YET — Node + Express + Mongoose
│   ├── src/
│   │   ├── controllers/           # HTTP in/out, validation      ← Controller
│   │   ├── services/              # budget alerts, insights,     ← Service
│   │   │                          #   tips engine, AI categorize
│   │   ├── models/                # Mongoose schemas             ← Repository layer
│   │   ├── routes/                # /auth /categories /transactions
│   │   │                          #   /budgets /insights /admin (kebab-case)
│   │   ├── middleware/            # session auth, role guard, error handler
│   │   └── index.js
│   ├── seed/                      # default categories + demo user + sample data
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
- **Transaction:** refs User + Category, amount, type, description, `ai_suggested_category`, date
- **Budget:** refs User + Category, month, limit_amount
- **Insight:** refs User, month, summary_text, tip_text, generated_at, history[]
- **Notification:** refs User, title, body, read_at, link — the bell is seeded from `mockData.js` today
- **Tip:** template text, savings_impact rank, pin/dismiss per user (SRS module 10, not built)
- **Bookmark:** refs User + Insight/Tip, optional note (SRS module 11, not built)
- **ResetToken:** refs User, hashed token, expires_at — for email password reset
- User also needs `role` (`student|admin`), `is_active` (admin disable), `profile_image_url`, `created_at`

Relations: User 1—M Transactions/Budgets/Insights, Category 1—M Transactions.

## Implementation status (honest snapshot — frontend only, no `server/` yet)

**Working in the browser today**
| Area | Where | Notes |
|---|---|---|
| Landing page | `pages/LandingPage.jsx` | Marketing page at `/`, redirects to `/dashboard` when signed in |
| Auth (demo) | `hooks/AuthProvider.jsx` | localStorage session, no server, no password reset |
| Profile + avatar | `components/ProfileEditor.jsx`, `AvatarPicker.jsx` | Avatar is a 192px data URL in the session, not object storage |
| Transactions | `pages/Transactions.jsx`, `hooks/useTransactions.js` | CRUD, filters, month picker, `is_recurring` flag only — nothing generates future entries |
| Categories | `data/mockData.js` | 11 seeded defaults, read-only; personal CRUD not built |
| Dashboard | `pages/Dashboard.jsx` | Balance, top category, recent activity, budget-vs-actual |
| Budgets + alerts | `pages/Budgets.jsx`, `hooks/useBudgets.js` | Limits, progress bars, near/exceed bands (95% / 100%) |
| Insights | `pages/Insights.jsx`, `lib/insights.js` | Narrative, growth flags, 6-month chart with month stepping, donut |
| AI assistant | `pages/Assistant.jsx`, `lib/aiAssistant.js` | Posts to `/api/ai/chat` so the provider key stays server-side, with a local rules fallback while the server is unbuilt |
| Dark mode + responsive | `ThemeProvider`, Tailwind breakpoints | Light/dark, phone/tablet/desktop, bottom tab bar + FAB |

**Not built (SRS-scored)**
- Server, database, sessions, bcrypt, email/token password reset
- Personal category add/edit/delete
- Recurring entry generation and transaction change history
- AI suggest-as-you-type, learning from corrections, CSV import + batch suggestions
- Reports (daily/weekly, filters), PDF/image export
- Persisted insight history (`history[]`)
- Tips engine with pin/dismiss
- Bookmarks, notes, share by email
- Admin panel (users, defaults, tip templates, stats)
- Recently viewed, forecast, duplicate/unusually-large detection
- Font-size control, breadcrumbs, sitemap on home
- Live hosted URL, install docs with credentials for every role, demo video

## Backend reminders (agreed during frontend phase)
- **User avatar:** `users.profile_image_url TEXT NULL` + `updated_at`. Avatar rule everywhere (header, Settings): use `profile_image_url` if set, else first letter of `name` in a forest-700 circle. Real upload is `POST /api/users/me/avatar` (multipart) — `AvatarPicker` posts nothing today.
- **Phone:** intentionally not collected anywhere (SRS password reset = email token). Add `users.phone TEXT NULL` only if SMS/OTP ever lands.
- **Academic year + savings goal:** `users.academic_year TEXT NULL`, `users.monthly_savings_goal INT NULL` — set via profile update (`PATCH /api/users/me`), never at signup. Settings shows "Not added" until set.
- **Joined date:** the profile line comes from `AuthProvider.joinDate()` today; it maps to `users.created_at` formatted "Mon YYYY".
- **Name capitalisation:** `lib/formatName.js` title-cases on read and write, so the server should normalise on save too rather than trusting the client's copy.
- **Transactions (live in `hooks/useTransactions.js`):** `GET /api/transactions?month=YYYY-MM&type=` (sorted `date` desc), `POST /api/transactions`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`. Fields per SRS: `amount`, `type`, `description`, `date`, `is_recurring`, plus `ai_suggested_category`. Swapping `readStore`/`commit` for fetch is the whole change — start `status` at `"loading"` and the table skeleton + error alert render themselves.
- **Budgets (live in `hooks/useBudgets.js`):** `GET /api/budgets?month=YYYY-MM`, `POST /api/budgets`, `PATCH /api/budgets/:id`, `DELETE /api/budgets/:id`. Spent is derived client-side from the transactions store; the backend can serve a computed `spent` instead. Alert thresholds live in `Budgets.jsx`: `>=95%` = near limit, `>=100%` = over limit.
- **Insights (built by `buildInsights()` in `lib/insights.js`):** SRS module 9 maps to `GET /api/insights?month=YYYY-MM` returning the Insight document above. Rules worth keeping server-side: `delta = null` when the previous month has no spend for that category (never "infinite" percentages), budget wording flips at `>=100%`, and an empty store shows an empty state rather than zeroes everywhere.
- **AI key exposure (fixed in S0):** `lib/aiAssistant.js` used to read `VITE_AI_API_KEY` and call OpenAI straight from the browser. Vite inlines every `VITE_*` value into the shipped JavaScript, so the key was public. The call now goes through `POST /api/ai/chat` and the provider key lives only in the server's `.env`.
- **Auth enforcement:** `components/ProtectedRoute.jsx` exists but no route uses it, so a signed-out visitor can open any page. Wrap the app routes once the server session exists.

## Endpoint inventory (to build)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/users/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| OAuth | `GET /api/auth/google` (redirect) + `GET /api/auth/google/callback` |
| Profile | `PATCH /api/users/me`, `POST /api/users/me/avatar` |
| Categories | `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` |
| Transactions | `GET/POST /api/transactions`, `PATCH/DELETE /api/transactions/:id`, `POST /api/transactions/import` (CSV) |
| Budgets | `GET/POST /api/budgets`, `PATCH/DELETE /api/budgets/:id` |
| Insights | `GET /api/insights?month=`, `GET /api/insights/:month/history` |
| Reports | `GET /api/reports?from=&to=`, `POST /api/reports/share` (email) |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |
| AI | `POST /api/ai/chat`, `POST /api/ai/suggest-category` |
| Admin | `GET /api/admin/users`, `PATCH /api/admin/users/:id` (disable/reset), `GET/PATCH /api/admin/categories`, `GET/PATCH /api/admin/tips`, `GET /api/admin/stats` |

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
