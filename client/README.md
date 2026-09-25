# CampusCoin - Client

React 19 + JavaScript (JSX) frontend for CampusCoin, built with Vite and Tailwind CSS v4.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start dev server (http://localhost:5173)
npm run build   # production build
npm run lint    # oxlint - must stay at zero warnings
```

## Structure

```
src/
├── assets/          # logo + illustrations
├── components/      # reusable UI (Sidebar, StatCard, SpendingDonut...)
├── data/            # mock seed data (replaced by API calls in phase 2)
├── hooks/           # AuthProvider + future useTransactions/useBudgets
├── lib/             # shared utilities (formatCurrency)
├── pages/           # one file per screen (Dashboard, Login...)
├── App.jsx          # routing shell
└── main.jsx         # entry - registers lucide icons offline
```

Stack: React 19, React Router 7, Tailwind CSS v4, lucide-react (icons), Recharts.
