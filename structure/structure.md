# CampusCoin - Project Structure

```
CampusCoin/
├── client/                        # React 19 + JavaScript/JSX (Vite) — react 19.2.8, vite 8.3.0, react-router-dom 7.18.4, tailwindcss v4, lucide-react, recharts
│   └── src/
│       ├── components/            # reusable UI (PascalCase files, e.g. BudgetCard.jsx)
│       │                          #   + Sidebar, StatCard, SpendingDonut, RecentTransactions
│       │                          #   + TransactionForm, ProfileEditor, PageHeader, ThemeToggle
│       │                          #   + Icon.jsx (single lucide-react registry)
│       ├── pages/                 # Login, Signup, Dashboard, Transactions, Settings,
│       │                          #   Assistant, Budgets, Reports, Insights, Admin...
│       ├── hooks/                 # AuthProvider/useAuth, useBudgets, useTransactions (camelCase)
│       ├── data/                  # mock seed data — snake_case fields, derived totals
│       ├── lib/                   # formatCurrency, formatMonth, API client, CSV import, date utils
│       ├── assets/                # logo.png, campusboy.png
│       └── App.jsx · main.jsx
├── server/                        # Node + Express + Mongoose (planned MERN)
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
├── .gitignore · README.md         # run steps + architecture diagram
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

Relations: User 1—M Transactions/Budgets/Insights, Category 1—M Transactions.

## Backend reminders (agreed during frontend phase)
- **User avatar:** `users.profile_image_url TEXT NULL` + `updated_at`. Avatar rule everywhere (header, Settings): use `profile_image_url` if set, else first letter of `name` in a forest-700 circle. Photo upload + storage land in the backend phase (badge on the Settings profile card is the entry point).
- **Phone:** intentionally not collected anywhere (SRS password reset = email token). Add `users.phone TEXT NULL` only if SMS/OTP ever lands.
- **Academic year + savings goal:** `users.academic_year TEXT NULL`, `users.monthly_savings_goal INT NULL` — set via profile update (`PATCH /api/users/me`), never at signup. Settings shows "Not added" until set.
- **Joined date:** the "Joined Oct 2025" profile line maps to `users.created_at` formatted "Mon YYYY" once the backend exists.
- **Transactions (live in `hooks/useTransactions.js`):** `GET /api/transactions?month=YYYY-MM&type=` (sorted `date` desc), `POST /api/transactions`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`. Fields per SRS: `amount`, `type`, `description`, `date`, `is_recurring`, plus `ai_suggested_category` (SRS module 8, later). The hook reads/writes localStorage today (synchronous first read, so no empty-state flash); swapping `readStore`/`commit` for fetch calls is the entire backend change - start `status` at `"loading"` and the table skeleton + error alert render themselves.
- **Budgets (live in `hooks/useBudgets.js`):** `GET /api/budgets?month=YYYY-MM`, `POST /api/budgets`, `PATCH /api/budgets/:id`, `DELETE /api/budgets/:id`. Fields per SRS: `category_id`, `month` (`YYYY-MM`), `limit_amount`. Spent is derived client-side from `useTransactions` (same `campuscoin.transactions` store) - backend can either serve computed `spent` or the page keeps merging `GET /api/transactions?month=`. Same readStore/commit swap as transactions (localStorage `campuscoin.budgets` today). Alert thresholds live in `Budgets.jsx`: `>=80%` = near limit, `>=100%` = over limit (SRS module 5 near/exceed in-app alerts = the amber/red banner + status pills).

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
