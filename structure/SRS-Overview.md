# CampusCoin - SRS Overview (Study Reference)

## Pitch
Student budget tracker. Students get irregular income (allowance, gigs, scholarships, gifts) but generic finance apps are built for salaried adults. CampusCoin = manual logging + student categories + budgets + plain-language tips + optional AI. No bank linking.

## Roles
- **Student** (primary): register/login, profile (name, year, allowance baseline, savings goal), log income/expenses, own categories, budgets, dashboard, reports, insights, tips, bookmarks, export.
- **Admin** (direct login): default categories, tip templates, view/disable/reset users, usage stats.
- **Visitor**: must register before using anything.
- **System / Tips Engine / AI**: auto categorization + insights generation.

## Out of Scope (the boundary, not a challenge)
- No banking integration, no payments, no real money. Manual logging only.

## DB Entities (MongoDB documents)
- **User**: name, email unique, password_hash, academic year, monthly_savings_goal, allowance baseline.
- **Category**: name, type income/expense, is_default (separates system categories from personal ones).
- **Transaction**: user FK, category FK, amount, type, description, ai_suggested_category, date.
- **Budget**: user FK, category FK, month, limit_amount.
- **Insight**: user FK, month, summary_text, tip_text, generated_at, history.

Relations: User 1-M Transactions, Budgets, Insights. Category 1-M Transactions. is_default = the jury one-liner.

## Stack (chosen)
| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript (Vite) + Bootstrap |
| Backend | Node.js + Express (REST API) |
| DB | MongoDB + Mongoose ODM |
| Auth | Sessions + bcrypt, email/token reset |
| AI | Local AI categorization + rules-based tips engine |
| Charts / Export | Recharts + jsPDF (PDF/image export) |

## Universal Jury Answers (reuse at demo day)
1. **Why this stack?** Explain each layer choice + defend with team skill and hosting fit. MERN: one language end to end, fast iteration.
2. **Why start simple?** Problem first, then thin slice, then polish. Show happy path before extras.
3. **Trade-off example?** Manual entry for privacy and simplicity vs bank linking.
4. **AI disclosure?** Keep ATTRIBUTION.md listing tools used, what was generated vs reviewed, demo in incognito to prove real app.
5. **Scale plan?** Caching + indexes + async jobs (insights in background) + CDN for assets.
6. **Fresh-clone build + incognito demo:** proves install docs and credentials actually work.

## Study Checklist
- [ ] Naming conventions: clear file, table, and route names; React PascalCase components, camelCase functions.
- [ ] Lint clean: ESLint + Prettier zero warnings.
- [ ] Security basics: block injection and XSS, hash passwords, validate inputs, secrets in .env.
- [ ] DB care: indexes, reference integrity via Mongoose, no N+1.
- [ ] README, .env.example, Git history clean with small verb-what-why commits.
- [ ] 15-point pre-demo checklist passed.
- [ ] Enterprise patterns mapped: Controller, Service, Repository layers (server), 4 UI states per screen (client).
- [ ] CampusCoin maps to: TransactionService, InsightService, Budget alerts.