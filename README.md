# CampusCoin

A student budget tracker. Students log income and expenses manually, set category budgets, and get plain-language insights — a private, simple, safe alternative to adult-oriented finance apps. **No bank linking, no real money handling.**

TechWiz 7 competition project.

## Status

This repository has two parts: a React frontend in `client/` and an Express API in `server/` that reads and writes MongoDB. Sessions are real HTTP-only cookies, the ledger lives in the database rather than the browser, and the only thing still kept in `localStorage` is the light/dark theme preference.

| Area | State |
|---|---|
| Auth + profile | Demo only — register/login/logout in `localStorage`, profile edit + avatar upload, no server session, no password reset |
| Transactions | Working — add/edit/delete, filters, month selector, recurring *flag* (no scheduled generation) |
| Categories | Defaults seeded and rendered; personal category CRUD not built |
| Dashboard | Working — balance, top category, recent activity, budget-vs-actual |
| Budgets | Working — per-category monthly limits, progress bars, near/exceed alerts |
| Insights | Working client-side — monthly narrative, growth flags, 6-month chart with month navigation, category breakdown |
| AI assistant | **"Rix"**, live on the server. It reads the student's own transactions and budgets and uses Poolside's `laguna-xs-2.1` to phrase the answer. **Rix sends the student's own transaction data to the Poolside API to generate answers.** The key sits in `server/.env` and never reaches the browser bundle |
| Reports | Working - date + category filters, day/week/month re-bucketing, 6-month income-vs-expense, category table, PDF and image export |
| Bookmarks + share | Working - save a month with a note from Insights, grouped list at `/bookmarks`, share a report by email |
| CSV import, AI categorisation, tips engine | Not built |
| Accessibility | Dark mode and responsive layout done; font-size control and breadcrumbs not built |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (JavaScript, no TypeScript) + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router 7 |
| Charts | Recharts 3 |
| Linting | oxlint |
| Backend | Node.js + Express — `server/` with cookie sessions, zod validation and rate limiting |
| Database | MongoDB + Mongoose — Atlas, with a seeded demo dataset |

## Project Structure

```
CampusCoin/
├── client/       # React frontend
├── server/       # Express API, Mongoose models, Rix, seeds, tests
├── instructions/ # SRS + study reference (gitignored)
└── structure/    # design decisions, DB design, backend plan
```

## Run

Backend and frontend in two terminals:

```bash
cd server
npm install
npm run seed     # demo accounts, categories, transactions
npm run dev      # http://localhost:5000
```

```bash
cd client
npm install
npm run dev      # http://localhost:5173
```

Open http://localhost:5173 — the landing page needs no account; `/dashboard` and the rest use the session created by signing up or logging in. Seeded accounts are printed by the seed.

```bash
cd client
npm run lint     # must report 0 warnings
npm run build    # production build

cd server
npm run lint
npm test          # security baseline
npm run test:auth # auth end-to-end
node tests/rix.e2e.mjs   # Rix end-to-end (needs NODE_ENV=test)
```

## Environment

The client reads `client/.env`; the server reads `server/.env`, which is gitignored and never committed.

**Client — `client/.env.example`**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the Express API |
| `VITE_DEMO_STUDENT_EMAIL` / `VITE_DEMO_STUDENT_PASSWORD` | Development-only pre-fill for the login form; both left blank in production |

**Server — `server/.env.example`**

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Comma-separated browser origins allowed to call the API |
| `SESSION_SECRET` | Signs the session cookie; required when `NODE_ENV=production` |
| `POOLSIDE_API_KEY` | Rix's model key. Server-side only — never sent to the browser and never committed; `server/.env.example` carries a blank placeholder |
| `POOLSIDE_BASE_URL` / `POOLSIDE_MODEL` | Poolside endpoint and model |
| `AI_RATE_LIMIT` | Questions per hour one account may ask Rix; defaults to 60 |
| `RESEND_API_KEY` / `EMAIL_FROM` | Password-reset email; with no key the reset link is logged to the console instead |
| `ADMIN_EMAIL` / `ADMIN_SEED_PASSWORD` | Admin account created by the seed |
| `APP_ORIGIN` | Overrides the origin used in password-reset links |

No AI key exists in the client bundle at all: **Rix sends the student's own transaction data to the Poolside API to generate answers**, from the server.

## Architecture

- **`pages/`** — one screen each (Dashboard, Transactions, Budgets, Insights, Assistant, Settings, Landing, Login, Signup)
- **`components/`** — presentational pieces, reused across pages (charts, cards, forms, nav)
- **`hooks/`** — data access (`useTransactions`, `useBudgets`, `AuthProvider`) and theme
- **`lib/`** — pure logic and formatting (`insights.js` derives every insight figure, `apiClient.js` is the seam where the API calls will go, plus date/currency/name helpers)
- **`data/mockData.js`** — seed data and shared category constants

Each store has one read path and one write path, which is why swapping `localStorage` for HTTP later is a small, contained change rather than a rewrite.

## Documentation

- `structure/structure.md` — layering decisions, MongoDB document design, per-feature backend endpoint contracts, and the current implementation status
- `ATTRIBUTION.md` — AI tools used and how their output was reviewed

## Git History

Small, meaningful commits — each feature lands as its own commit so the build story is readable.
