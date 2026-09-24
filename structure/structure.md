# CampusCoin - Project Structure

```
CampusCoin/
├── client/                        # React 18 + TypeScript (Vite)
│   └── src/
│       ├── components/            # reusable UI + charts (PascalCase files)
│       ├── pages/                 # Login, Dashboard, Logging, Budgets, Reports,
│       │                          #   Insights, Admin, Profile...
│       ├── hooks/                 # useAuth, useBudgets, useTransactions
│       ├── lib/                   # API client, CSV import, date/currency utils
│       ├── types/                 # User, Category, Transaction, Budget, Insight
│       └── App.tsx · main.tsx
├── server/                        # Node + Express + Mongoose
│   ├── src/
│   │   ├── controllers/           # HTTP in/out, validation      ← Controller
│   │   ├── services/              # budget alerts, insights,     ← Service
│   │   │                          #   tips engine, AI categorize
│   │   ├── models/                # Mongoose schemas             ← Repository layer
│   │   ├── routes/                # /auth /categories /transactions
│   │   │                          #   /budgets /insights /admin
│   │   ├── middleware/            # session auth, role guard, error handler
│   │   └── index.ts
│   ├── seed/                      # default categories + demo user + sample data
│   └── .env / .env.example
├── .gitignore · README.md         # run steps + architecture diagram
└── ATTRIBUTION.md                 # AI disclosure (mandatory)
```

## Layer mapping (jury answer)
- **Controller** = HTTP in/out + validation (server/src/controllers)
- **Service** = business logic: budget alerts, insights, tips engine, AI categorize (server/src/services)
- **Repository** = data access, Mongoose models (server/src/models)
- **Presentation** = React pages/components (client/src)

## DB documents (MongoDB + Mongoose)
- User, Category (is_default flag), Transaction (aiSuggestedCategory), Budget, Insight (with history)

*Source: SRS-Dos-And-Donts.md, CampusCoin-SRS-Notes.md, SRS-Overview.md (structure/ folder).*