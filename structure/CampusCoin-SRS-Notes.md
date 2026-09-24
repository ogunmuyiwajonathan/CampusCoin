# CampusCoin - Smart Spending Student Style (SRS Notes)

## Pitch in One Line
- **Student-first budget and expense tracker.** Students get irregular income (allowance, gigs, scholarships, gifts) but generic finance apps are built for salaried adults.
- **CampusCoin =** manual logging + student categories + budgets + plain-language tips + optional AI. **No bank linking.**

## Roles

| Role | What they do |
|------|--------------|
| **Student** (primary) | Register and login, profile with name, year, allowance baseline, savings goal. Log income and expenses, manage own categories, set budgets, view dashboard, read reports, read insights, read tips, bookmark notes, export data |
| **Admin** (direct login) | Manage default categories, manage tip templates, view users, disable users, reset users, view usage stats |
| **Visitor** | Must register before using anything |
| **System / Tips Engine / AI** | Auto categorization plus insights generation |

## Categories

**Income defaults:** Allowance, Part-time Job, Scholarship, Gift, Other Income.

**Expense defaults:** Food, Transport, Hostel/Rent, Academics, Subscriptions, Entertainment, Miscellaneous.

**Manage Own Categories:** student can add, edit, and delete personal categories.

## Modules (14)

| # | Module | Key points |
|---|--------|------------|
| 1 | **Auth + Profile** | Session handling, email and token password reset, CSV import of old data |
| 2 | **Categories** | Default set plus user-owned categories |
| 3 | **Transaction logging** | Quick-add form, recurring entries, edit and delete with history |
| 4 | **Dashboard** | Greeting, month balance, top spending category, budget vs actual, top tips |
| 5 | **AI categorization assistant** | Suggests as you type, for example Campus Cafe maps to Food. Learns from corrections, user can override, batch help for CSV imports |
| 6 | **Monthly reports** | Category-wise split, 6-month income vs expense chart, daily and weekly views, filters, export to PDF or image |
| 7 | **AI monthly insights** | Plain-language narrative, flags growth like Food delivery up 40 percent, gives advice, keeps history |
| 8 | **Tips engine (rule-based)** | Tips ranked by savings impact, user can pin or dismiss |
| 9 | **Budgets + alerts** | Per-category budget, for example Food 30 USD. Progress bars, near-limit and exceeded alerts |
| 10 | **Bookmark / notes / share** | Save insights, export to PDF, share by email |
| 11 | **Admin panel** | Defaults, tips, users, stats |
| 12 | **Advanced UX** | Recently viewed, spending forecast, duplicate detection |
| 13 | **Accessibility** | Dark mode, font size control, breadcrumbs, loading states |
| 14 | **Cross-cutting** | Responsive layout, safe auth, fast charts |

## DB Entities

| Entity | Fields |
|--------|--------|
| **User** | user_id, name, email unique, password_hash, academic year, monthly_savings_goal, allowance baseline, created_at |
| **Category** | category_id, name, type income or expense, is_default |
| **Transaction** | transaction_id, user_id FK, category_id FK, amount, type, description, ai_suggested_category, date, created_at |
| **Budget** | budget_id, user_id, category_id, month, limit_amount |
| **Insight** | insight_id, user_id, month, summary_text, tip_text, generated_at |

**Relations:**
- User 1 to many Transactions, Budgets, Insights.
- Category 1 to many Transactions.
- **is_default** separates system categories from personal ones.

## Workflows

**Student happy path:**
1. Register with email and password.
2. Login and start session.
3. Fill profile: name, year, allowance baseline, savings goal.
4. Optional CSV import of past spending.
5. Log income and expenses with AI suggestion plus manual override.
6. Check dashboard: balance, top category, budget vs actual.
7. Set budgets per category.
8. Receive near-limit and exceeded alerts.
9. Open monthly reports with filters.
10. Read AI insights narrative.
11. Bookmark useful tips and notes.
12. Export report to PDF or image.
13. Manage own categories (add, edit, delete).
14. Adjust UI prefs like dark mode and font size.

**Admin flow:**
1. Direct login.
2. Manage default categories.
3. Manage tip templates.
4. View users, disable or reset accounts.
5. Check usage stats.

**Password recovery flow:**
1. Click forgot password.
2. Receive email token link.
3. Reset password and login again.

## NFRs (Must Implement All)
- Safe, accessible, user-friendly, reliable.
- Fast charts, scalable design.
- Auth security, available 24/7.
- Works on latest browsers, responsive on all screens.
- Rule: implement all NFRs first, creativity after.

## Stack

| Layer | Options |
|-------|---------|
| **Frontend** | HTML5, CSS3, Bootstrap, ReactJS or Angular, JavaScript, jQuery |
| **Backend** | Java/Jakarta EE or C# ASP.NET Core or PHP Laravel or Python Flask/Django or MEAN or MERN |
| **DB** | MySQL, SQL Server, MongoDB, JSON |
| **Optional** | AI APIs plus tawk.to or Tidio chatbot |
| **Architecture** | 3-tier: Presentation, API, Data |

## Constraints
- Responsive on all devices.
- Manual entry or CSV only. **NO banking integration. NO real money.**
- AI is advisory only, not financial advice.
- **AI-as-aid policy:** acknowledge tools used, explain to judges, no fully AI-made docs.
- **Deliverables:** Problem Definition, Design, Flowcharts and DFDs, DB design, test data, install instructions plus credentials mandatory, no source code inside docs, zip plus ReadMe.doc plus SQL files, live URL preferred, mandatory mp4 demo, sitemap on home page.

## Submission Checklist - what the judges grade (SRS section 1.9)

Tick every box before you submit. A missing mandatory item loses marks or disqualifies.

- [ ] Report contains: Problem Definition, Design Specs, Flowcharts for activities, DFDs, Database Design, Test Data
- [ ] MANDATORY: Installation Instructions + login credentials for ALL user types (student + admin)
- [ ] No source code pasted inside the docs
- [ ] Zip contains ReadMe.doc (your assumptions) + .sql or schema files
- [ ] Live hosted URL (preferred, judges open it first)
- [ ] MANDATORY: .mp4 demo video covering ALL functional requirements
- [ ] Sitemap placed on the home page so the flow is visible
- [ ] Rule: implement ALL functional + non-functional requirements first, creativity only after

## AI Rules - full version (what disqualifies you)

- Allowed as aid: Copilot, Canva AI, Figma AI, Uizard, builders, code assistants, image generators
- NOT a substitute: no fully ready-made templates, no submitting unmodified AI code or content
- Must acknowledge every AI tool you used
- Must be able to explain your design and code to the judges line by line
- FORBIDDEN: using AI to fully produce ready-made documentation

## Build Order - MVP first (always have something demoable)

1. Auth + roles + sessions + password reset
2. Categories (defaults + personal CRUD)
3. Transaction CRUD + quick-add + recurring entries
4. Dashboard (balance, top category, budget vs actual)
5. Budgets + progress bars + near/exceed alerts
6. Reports + filters + PDF/image export
7. AI categorization + monthly insights
8. Tips engine + pin/dismiss + bookmarks + share
9. Admin panel + stats
10. Polish: dark mode, font size, breadcrumbs, sitemap, test data, video, docs, deploy

## Jury Q and A (5)

1. **Why manual entry not bank linking?** Students often lack bank accounts. Manual entry is simpler, safer, and privacy friendly.
2. **Why AI plus rules both?** AI suggests categories fast, rules rank tips reliably, user always overrides. Best of both.
3. **How defend DB design?** The is_default flag cleanly separates system categories from personal ones. FK links keep user data isolated.
4. **Scale plan?** Per-user data partitions, cached reports, async insight jobs so heavy AI work runs in background.
5. **Trade-off?** Manual entry takes effort, but gains are privacy, simplicity, and no bank dependency.
