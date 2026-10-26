# CampusCoin

A student budget tracker — students log income and expenses manually, set category budgets, and get plain-language insights. A private, simple, safe alternative to adult-oriented finance apps. **No bank linking, no real money handling.**

**TechWiz 7 competition project.**

🚀 **Live:** https://campus-coin-nine.vercel.app/
📊 **Demo account:** `alex@example.com` / `CampusCoin2026!`

---

## ✨ Features

| Area | State |
|---|---|
| **Auth + profile** | bcrypt hashing, HTTP-only cookie sessions, 6-digit emailed reset code, password change that signs out other devices, avatar upload |
| **Transactions** | Add/edit/delete, filters, month selector, recurring entries that generate real rows |
| **Delete with history** | Deleted rows are retained and can be restored |
| **CSV import** | Multipart upload, RFC-4180 parser, per-row validation with accepted/rejected report, whole-batch undo |
| **Categories** | Full personal create/edit/delete; system defaults are protected |
| **Dashboard** | Balance, top category, recent activity, budget-vs-actual, month-end forecast — all from the database |
| **Budgets + alerts** | Per-category monthly limits, progress bars, near (95%) and over (100%) notifications deduplicated by key |
| **Insights** | One stored `Insight` per month, generated on demand, browsable by month, with forced regeneration |
| **Tips engine** | Reads `TipTemplate`, fills placeholders, ranks by savings impact, pin/dismiss per user |
| **AI categorisation** | Four tiers: prior corrections → keyword rules → model → category-name match |
| **Reports** | Date and category filters, day/week/month re-bucketing, 6-month income-vs-expense, PDF and image export, share by email |
| **Bookmarks + share** | Save a month with a note, edit or remove, grouped list at `/bookmarks` |
| **Advanced UX** | Recently viewed, month-end forecast, duplicate detection flagged rather than blocked |
| **Admin panel** | Separate login, default categories, tip templates, view/disable/reset users, usage stats, announcements |
| **Accessibility** | Dark mode, three font sizes, breadcrumbs, explicit loading state on every page |
| **AI assistant ("Rix")** | Reads the student's own transactions and budgets, uses Poolside `laguna-xs-2.1` server-side to phrase answers |

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 (JavaScript), Vite 8, Tailwind CSS v4 |
| **Routing** | React Router 7 |
| **Charts** | Recharts 3 |
| **Export** | jsPDF + html2canvas-pro |
| **Icons** | Lucide React |
| **Backend** | Node.js 20+, Express 5, cookie sessions, zod validation, rate limiting |
| **Database** | MongoDB + Mongoose 9 (Atlas, seeded demo dataset) |
| **Security** | bcryptjs, helmet, cors, express-rate-limit, connect-mongo, `sanitizeSvg` |
| **Email** | Resend (six-digit password reset code) |
| **AI** | Poolside `laguna-xs-2.1` via OpenAI-compatible client, server-side only |
| **Linting** | oxlint |

## 📁 Project Structure

```
CampusCoin/
├── client/       # React frontend (Vite 8, Tailwind v4, React Router 7)
├── server/       # Express API, Mongoose models, Rix AI, seeds, tests
├── instructions/ # SRS + study reference (gitignored)
└── structure/    # Design decisions, DB design, backend plan
```

## 🏃‍♂️ Run locally

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

Open `http://localhost:5173`. The landing page needs no account; `/dashboard` and the rest use the session created by signing up or logging in.

### Demo student account

| Field | Value |
|---|---|
| Email | `alex@example.com` |
| Password | `CampusCoin2026!` |

That seeded student has six months of transactions, budgets both near and over their limits, and a savings goal — the quickest way to see every screen filled with real data.

### Administrator access

No admin accounts exist in the database. The admin panel unlocks with a password set via `ADMIN_SEED_PASSWORD` in `server/.env` (blank placeholder in `.env.example`). Change it and restart — the new password is live immediately.

## 🔐 Environment

**Client** — `client/.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the Express API |
| `VITE_DEMO_STUDENT_EMAIL` / `VITE_DEMO_STUDENT_PASSWORD` | Dev-only pre-fill for the login form; blank in production |

**Server** — `server/.env` (gitignored, never committed):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Comma-separated browser origins allowed to call the API |
| `SESSION_SECRET` | Signs the session cookie; required in production |
| `POOLSIDE_API_KEY` / `POOLSIDE_BASE_URL` / `POOLSIDE_MODEL` | Rix's model key — server-side only |
| `AI_RATE_LIMIT` | Questions per hour per account (default: 60) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Password-reset email; no key logs the reset link to console |
| `ADMIN_SEED_PASSWORD` / `ADMIN_EMAIL` | Admin panel password and display name |
| `APP_ORIGIN` | Overrides the origin used in password-reset links |

No AI key exists in the client bundle: Rix sends the student's own transaction data to the Poolside API from the server.

## 🧪 Testing

Client:
```bash
cd client
npm run lint     # must report 0 warnings
npm test         # amount parsing, validation, currency formatting
npm run build    # production build
```

Server:
```bash
cd server
npm run lint     # must report 0 warnings
npm test              # security baseline
npm run test:auth     # auth end-to-end
npm run test:seed     # seed idempotency
```

Remaining suites (run one at a time — each resets `campuscoin_test`):
```bash
node tests/summary.mjs
node tests/amount-validation.mjs
node tests/admin-search.mjs
node tests/seed-safety.mjs
node tests/rix.e2e.mjs        # needs NODE_ENV=test
node tests/rate-limit.mjs
node tests/transaction-idempotency.mjs
node tests/stage2-tips-insights.mjs
node tests/stage3-categorise.mjs
node tests/stage4-admin-tips.mjs
```

## 🏗 Architecture

Server follows a **controller → service → repository** split:

- **`controllers/`** — read request, validate, shape response (no business rules)
- **`services/`** — business logic: `ledger`, `insights`, `tips`, `categorise`, `import`, `reports`, `bookmarks`, `auth`, `ai`, `mail`
- **`models/`** — Mongoose schemas; the only place that talks to the database
- **`middleware/`** — session load, trusted-origin check, rate limiters, validation, error handler
- **`validators/`** — one zod schema per domain
- **`routes/`** — `/auth`, `/ai`, `/admin`, `/ledger`, `/reports`, `/bookmarks`, `/insights`, `/health`

Client (`client/src/`):
- **`pages/`** — one screen each, split into `pages/student/` and `pages/admin/`
- **`components/`** — reusable UI (charts, cards, forms, dialogs, nav, error boundary)
- **`hooks/`** — data access (`useTransactions`, `useBudgets`, `useCategories`, `useTips`, `useBookmarks`, `useRecentlyViewed`, `AuthProvider`) and theme
- **`lib/`** — pure logic and formatting (`insights.js`, `apiClient.js` as the single HTTP seam, date/currency/name helpers)

`lib/apiClient.js` is the only module in the client that performs network calls.

## 📄 Documentation

- `structure/structure.md` — layering decisions, MongoDB document design, index rationale, endpoint inventory, implementation status
- `ATTRIBUTION.md` — AI tools used and how their output was reviewed

## 📜 Git history

Small, meaningful commits — each feature lands as its own commit so the build story is readable.

---

Built for TechWiz 7 • Deployed on Vercel • https://campus-coin-nine.vercel.app/