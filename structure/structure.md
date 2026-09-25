# CampusCoin - Project Structure

```
CampusCoin/
├── client/                        # React 19 + JavaScript/JSX (Vite) — react 19.2.8, vite 8.3.0, react-router-dom 7.18.4, tailwindcss v4, lucide-react, recharts
│   └── src/
│       ├── components/            # reusable UI (PascalCase files, e.g. BudgetCard.jsx)
│       │                          #   + Sidebar, StatCard, SpendingDonut, RecentTransactions
│       │                          #   + Icon.jsx (single lucide-react registry)
│       ├── pages/                 # Login, Signup, Dashboard, Logging, Budgets, Reports,
│       │                          #   Insights, Admin, Profile...
│       ├── hooks/                 # AuthProvider/useAuth, useBudgets, useTransactions (camelCase)
│       ├── data/                  # mock seed data — snake_case fields, derived totals
│       ├── lib/                   # formatCurrency, API client, CSV import, date utils
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
