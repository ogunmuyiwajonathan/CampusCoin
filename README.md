# CampusCoin

A student budget tracker. Students log income and expenses manually, set category budgets, and get plain-language insights — a private, simple, safe alternative to adult-oriented finance apps. **No bank linking, no real money handling.**

TechWiz 7 competition project.

## Status

This repository currently contains the **frontend only**. There is no `server/` directory yet: all data lives in `localStorage` (seeded with realistic demo data) and all "auth" is a demo session. Nothing here talks to a database, an email service or an AI provider unless an environment variable is supplied.

| Area | State |
|---|---|
| Auth + profile | Demo only — register/login/logout in `localStorage`, profile edit + avatar upload, no server session, no password reset |
| Transactions | Working — add/edit/delete, filters, month selector, recurring *flag* (no scheduled generation) |
| Categories | Defaults seeded and rendered; personal category CRUD not built |
| Dashboard | Working — balance, top category, recent activity, budget-vs-actual |
| Budgets | Working — per-category monthly limits, progress bars, near/exceed alerts |
| Insights | Working client-side — monthly narrative, growth flags, 6-month chart with month navigation, category breakdown |
| AI assistant | Rule-based responses locally. If `VITE_AI_API_KEY` is set it calls OpenAI **directly from the browser** — for anything real this must move behind a server proxy (see below) |
| Reports, CSV import, AI categorisation, tips engine, bookmarks/share, admin panel | Not built |
| Accessibility | Dark mode and responsive layout done; font-size control and breadcrumbs not built |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (JavaScript, no TypeScript) + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router 7 |
| Charts | Recharts 3 |
| Linting | oxlint |
| Backend | Node.js + Express — **not started** |
| Database | MongoDB + Mongoose — **not started** |

## Project Structure

```
CampusCoin/
├── client/      # React frontend (the whole app today)
├── instructions/ # SRS + study reference (gitignored)
└── structure/   # design decisions, DB design, backend plan
```

## Run

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 — the landing page needs no account; `/dashboard` and the rest use the demo session created by signing up or logging in.

```bash
cd client
npm run lint     # must report 0 warnings
npm run build    # production build
```

## Environment

Copy `client/.env.example` to `client/.env` if you need it. Everything is optional:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL for the future Express API |
| `VITE_AI_API_KEY` | OpenAI key for the assistant. **Any `VITE_*` value is inlined into the built JavaScript and is public.** It is fine for a local test and unsafe for a deployed build — a real deployment must call OpenAI from a server and keep the key there. |

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
