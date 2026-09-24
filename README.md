# CampusCoin

A student budget tracker. Students log income and expenses manually, set category budgets, and get plain-language insights and ranked savings tips — a private, simple, safe alternative to adult-oriented finance apps. **No bank linking, no real money handling.**

TechWiz 7 competition project.

## Features (from SRS)

- **Accounts** — register/login, profile with academic year, allowance baseline and savings goal, email/token password reset
- **Logging** — quick-add income/expense form, recurring entries (allowance, subscriptions)
- **Categories** — personal categories plus system defaults separated by an `is_default` flag
- **Dashboard** — greeting, monthly balance, top category, budget-vs-actual
- **Budgets** — per-category monthly limits with progress bars and near/exceed alerts
- **Reports** — category-wise, 6-month income-vs-expense, daily/weekly, date/category/source filters, PDF/image export
- **AI assistance** — suggest-as-you-type categorization with manual override, batch suggestions on CSV import
- **Insights** — monthly narrative with actionable advice, stored history
- **Tips** — rules-based savings tips ranked by impact, pin and dismiss
- **Admin** — default categories, tip templates, view/disable/reset users, usage stats
- **CSV bulk import**, dark mode, font-size control, breadcrumbs, sitemap

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router 7 |
| Backend | Node.js + Express (in progress) |
| Database | MongoDB + Mongoose (in progress) |
| Auth | Sessions + bcrypt (in progress) |
| Charts / Export | Recharts + jsPDF (planned) |

## Project Structure

```
CampusCoin/
├── client/      # React frontend
├── server/      # Express API (in progress)
└── structure/   # SRS + competition study documentation
```

See `structure/structure.md` for the full layering (Controller → Service → Repository) and DB document design.

## Run

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Architecture

- **Client**: React pages/components, hooks for data (useAuth, useBudgets, useTransactions), `lib/` API client + formatting helpers, `types/` shared interfaces.
- **Server (planned)**: Express REST API with Controller / Service / Repository layers, Mongoose models matching the SRS entities (User, Category, Transaction, Budget, Insight).

## Git History

Small, meaningful commits — each feature lands as its own commit so the build story is readable.