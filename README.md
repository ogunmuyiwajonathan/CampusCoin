# CampusCoin

A student budget tracker. Students log income and expenses manually, set category budgets, and get plain-language insights — a private, simple, safe alternative to adult-oriented finance apps. **No bank linking, no real money handling.**

TechWiz 7 competition project.

## Status

This repository has two parts: a React frontend in `client/` and an Express API in `server/` that reads and writes MongoDB. Sessions are real HTTP-only cookies, the ledger lives in the database rather than the browser, and the only thing still kept in `localStorage` is the light/dark theme and font-size preference.

Every feature below is built and covered by the suites in `server/tests/`, which exercise the real Atlas database rather than mocks.

| Area | State |
|---|---|
| Auth + profile | Working — bcrypt hashing, HTTP-only cookie sessions, 6-digit emailed reset code, password change that signs out other devices, avatar upload |
| Transactions | Working — add/edit/delete, filters, month selector, and recurring entries that generate real rows rather than a bare flag |
| Delete with history | Working — a deleted row is retained and can be restored |
| CSV import | Working — multipart upload, RFC-4180 parser, per-row validation with an accepted/rejected report, unknown categories fall back rather than dropping the row, whole-batch undo |
| Categories | Working — full personal create/edit/delete; system defaults carry `user_id: null` so they cannot be altered by a student |
| Dashboard | Working — balance, top category, recent activity, budget-vs-actual and month-end forecast, all read from the database |
| Budgets + alerts | Working — per-category monthly limits, progress bars, near (95%) and over (100%) notifications deduplicated by key |
| Insights | Working — one stored `Insight` per month, generated on demand and browsable by month, with a forced regeneration path |
| Tips engine | Working — reads `TipTemplate`, fills placeholders against the student's own figures, ranks by savings impact, pin/dismiss per user |
| AI categorisation | Working — four tiers, cheapest first: prior corrections, keyword rules, the model, then a category-name match, so a suggestion is always produced |
| Reports | Working — date and category filters, day/week/month re-bucketing, 6-month income-versus-expense, category table, PDF and image export, share by email |
| Bookmarks + share | Working — save a month with a note from Insights, edit or remove it, grouped list at `/bookmarks` |
| Advanced UX | Working — recently viewed, month-end forecast, duplicate detection flagged rather than blocked |
| Admin panel | Working — separate login, default categories, tip templates, view/disable/reset users, usage stats, announcements |
| Accessibility | Working — dark mode, three font sizes, breadcrumbs, and an explicit loading state on every page |
| AI assistant | **"Rix"**, live on the server. It reads the student's own transactions and budgets and uses Poolside's `laguna-xs-2.1` to phrase the answer. **Rix sends the student's own transaction data to the Poolside API to generate answers.** The key sits in `server/.env` and never reaches the browser bundle |
| Not built | Live hosted URL, the demo video, and OAuth sign-in. OAuth is deliberately deferred rather than cancelled; both secrets are left blank in `.env.example` |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (JavaScript, no TypeScript) + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router 7 |
| Charts | Recharts 3 |
| Export | jsPDF + html2canvas-pro |
| Icons | Lucide React |
| Backend | Node.js 20+ — Express 5 in `server/`, with cookie sessions, zod validation and rate limiting |
| Database | MongoDB + Mongoose 9 — Atlas, with a seeded demo dataset |
| Security | bcryptjs, helmet, cors, express-rate-limit, connect-mongo, in-house `sanitizeSvg` |
| Email | Resend — six-digit password reset code |
| AI | Poolside `laguna-xs-2.1` via the OpenAI-compatible client, called server-side only |
| Linting | oxlint |

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
SEED_ALLOW=true npm run seed   # demo accounts, categories, transactions
npm run dev      # http://localhost:5000
```

```bash
cd client
npm install
npm run dev      # http://localhost:5173
```

Open http://localhost:5173 — the landing page needs no account; `/dashboard` and the rest use the session created by signing up or logging in.

### Demo student account

`npm run seed` prints everything it created. The credential worth knowing by heart:

| Field | Value |
|---|---|
| Email | `alex@example.com` |
| Password | `CampusCoin2026!` |

That is the seeded demo student: six months of transactions, budgets sitting both near and over their limits, and a savings goal — the quickest way to see every screen filled with real data.

### Administrator access

There are no admin accounts in the database. The admin panel unlocks with a single password: `POST /api/admin/auth/login` compares what you type against `ADMIN_SEED_PASSWORD` in `server/.env` (blank placeholder in `server/.env.example`). Change the value and restart the server and the new password is live immediately. Leave it blank and no admin can sign in. `ADMIN_EMAIL` only sets the display name shown in the panel and is never a login key.

`student@campuscoin.test` is deliberately absent: it exists only inside the test suites, which create it themselves.

### Why the seed asks for confirmation

The seed only ever creates or updates the demo accounts and their own rows — there is no `deleteMany` in it, so it cannot remove anybody else's data. It still refuses to run until you say so, and both guards must pass:

```bash
SEED_ALLOW=true npm run seed
```

`SEED_ALLOW=true` confirms you meant it, and the database name must be one of `campuscoin`, `campuscoin_dev`, `campuscoin_development` or `campuscoin_test` (the list is `SEED_DATABASES` at the top of `server/scripts/seed.js`). Anything else aborts before a single write.

```bash
cd client
npm run lint     # must report 0 warnings
npm test         # amount parsing, validation and currency formatting
npm run build    # production build

cd server
npm run lint     # must report 0 warnings
npm test              # security baseline
npm run test:auth     # auth end-to-end
npm run test:seed     # seed idempotency
```

The remaining suites are run directly and exercise the real Atlas database rather than mocks:

```bash
node tests/summary.mjs                # GET /api/summary totals, breakdown, series, budgets
node tests/amount-validation.mjs      # zod amount rules - the server half of npm test
node tests/admin-search.mjs           # admin search, regex escaping, length caps
node tests/seed-safety.mjs            # seed refuses to touch anything but the demo data
node tests/rix.e2e.mjs                # Rix assistant, needs NODE_ENV=test
node tests/rate-limit.mjs             # per-route throttles
node tests/transaction-idempotency.mjs # double-submit and recurring catch-up guards
node tests/stage2-tips-insights.mjs   # tips engine and stored insights
node tests/stage3-categorise.mjs      # four-tier categorisation
node tests/stage4-admin-tips.mjs      # administrator tip templates
```

Run them one at a time: every suite resets the same `campuscoin_test` database, so two in parallel collide.

### `client/vite.verify.config.js`

A second Vite config, kept beside `vite.config.js` on purpose. It serves the same app on port **5199** and proxies `/api` to **5001** instead of 5000, so a whole second stack can run next to the normal one:

```bash
cd server && PORT=5001 npm run dev &
cd client && npx vite --config vite.verify.config.js
```

Reach for it when 5173/5000 are already taken — a reviewer's browser, a second agent, a test server holding the port — and you still need a live app to look at. It contains no secrets and `npm run build` never reads it, so the recommendation is to **keep it in the repo rather than gitignore it**: it is a handful of port numbers, and the alternative is two people guessing at each other's ports.

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
| `ADMIN_SEED_PASSWORD` / `ADMIN_EMAIL` | Admin panel password (change it and restart to rotate) and display name |
| `APP_ORIGIN` | Overrides the origin used in password-reset links |

No AI key exists in the client bundle at all: **Rix sends the student's own transaction data to the Poolside API to generate answers**, from the server.

## Architecture

The server follows a controller / service / repository split so that HTTP concerns, business rules and data access can change independently.

**Client (`client/src/`)**

- **`pages/`** — one screen each, split into `pages/student/` and `pages/admin/`
- **`components/`** — reusable UI (charts, cards, forms, dialogs, nav, error boundary)
- **`hooks/`** — data access (`useTransactions`, `useBudgets`, `useCategories`, `useTips`, `useBookmarks`, `useRecentlyViewed`, `AuthProvider`) and theme
- **`lib/`** — pure logic and formatting (`insights.js`, `apiClient.js` as the single HTTP seam, plus date/currency/name helpers)

**Server (`server/src/`)**

- **`controllers/`** — read the request, validate it, shape the response; no business rules
- **`services/`** — the business logic: `ledger`, `insights`, `tips`, `categorise`, `import`, `reports`, `bookmarks`, `auth`, `ai`, `mail`/`email`
- **`models/`** — Mongoose schemas; the only place that talks to the database
- **`middleware/`** — session load, trusted-origin check, rate limiters, validation, not-found and error handler
- **`validators/`** — one zod schema per domain
- **`routes/`** — `/auth` `/ai` `/admin` `/ledger` `/reports` `/bookmarks` `/insights` `/health`

`lib/apiClient.js` is the only module in the client that performs network calls, so the HTTP seam is a single file rather than a convention.

## Documentation

- `structure/structure.md` — layering decisions, MongoDB document design, index rationale, endpoint inventory, and the implementation status
- `ATTRIBUTION.md` — AI tools used and how their output was reviewed

## Git History

Small, meaningful commits — each feature lands as its own commit so the build story is readable.
