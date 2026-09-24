# SRS DO and DON'T - CampusCoin (TechWiz 7 Competition Reference)
CampusCoin: the SRS is a contract - in-scope work is scored, out-of-scope work steals time from scored work, and the submission checklist decides your grade before judges even open your app.

## Golden Rule
100 percent of scope plus polish beats 70 percent of everything. Finish what the SRS asks, prove it with video plus credentials plus live link, and be ready to say WHY for every choice.

## Section 1: Universal DO (all TechWiz 7 projects)

| # | DO this | Why it scores |
|---|---------|---------------|
| 1 | Implement ALL functional + non-functional requirements first, creativity only after | Stated in every SRS - creativity without completeness scores zero |
| 2 | Ship MANDATORY submission items: install instructions + login credentials for EVERY role, ReadMe.doc with assumptions + .sql/schema files in the zip | Missing one = lost marks or disqualification |
| 3 | Record a .mp4 demo video covering ALL functional requirements | Mandatory - judges watch this when the live link fails |
| 4 | Put a sitemap on the home page plus flowcharts, DFDs, DB design in the report | Required deliverables, shows you understand your own flow |
| 5 | Never paste source code inside the docs | Explicit SRS rule |
| 6 | Hash passwords (bcrypt / Identity), secure sessions or JWT, email-or-token password reset | Security points in the 15-point checklist |
| 7 | Enforce role-based access where roles exist | Skipped RBAC = broken security story |
| 8 | Four states per screen: loading, empty, error, success - with friendly fallbacks, never a crash | Error handling is scored |
| 9 | Follow PDF naming rules: C# PascalCase classes and methods, React PascalCase components + camelCase functions, Python snake_case if used | Consistency is a quality mark |
| 10 | Linters to zero warnings (ESLint + Prettier for web, Black + Flake8 for Python) | Quality gate |
| 11 | Parameterized queries always (Prisma ORM / prepared statements) - never concatenate user input into SQL | SQL injection = automatic security fail |
| 12 | Default React rendering for user content - never dangerouslySetInnerHTML or innerHTML with user data | XSS = automatic security fail |
| 13 | Secrets in env files, commit .env.example only, real .env gitignored | Exposed secret = fail |
| 14 | README with run steps + architecture diagram, fresh-clone build must pass | Judges clone and run - if it fails on their machine you lose |
| 15 | ATTRIBUTION.md for any AI help, and be able to explain every line | Honesty is scored, denial is a trap |
| 16 | Small meaningful Git commits with verb-what-why messages, feature branches, pushed backup | Git history is scored - proves real step-by-step work |
| 17 | Seed test/demo data so judges see a LIVING app on first login (charts full, lists populated, budgets with entries) | An empty app looks broken even when the code works |
| 18 | No N+1 queries, paginate long lists, lazy-load images and media with explicit dimensions | Performance points, no layout shift |
| 19 | Test the live link in Incognito, full flow, plus mobile responsive check | Final checklist item |
| 20 | Dark mode + font-size control + breadcrumbs where the SRS asks (CampusCoin requires all three) | Listed accessibility requirements, easy marks |

## Section 2: Universal DON'T (all TechWiz 7 projects)

| # | DON'T do this | Why it fails |
|---|---------------|--------------|
| 1 | Build out-of-scope items (CampusCoin: banking, payments, real money) | Proves you didn't read the spec + steals time from scored features |
| 2 | Use fully ready-made templates, or template functionality | Adversely affects evaluation, stated in the SRS |
| 3 | Submit unmodified AI code or content | Must review, change, and understand every line |
| 4 | Let AI fully produce your documentation | Explicitly FORBIDDEN |
| 5 | Commit secrets, .env files, node_modules, dist/build output | Security fail + repo bloat |
| 6 | Claim features you did not build | Jury asks to see it running - collapses in one question |
| 7 | Over-engineer (message brokers, Kubernetes on a small app you cannot defend) | "Why?" has no answer - violates the trade-off takeaway |
| 8 | One giant file or component holding everything | Monolith anti-pattern, maintainability tanks |
| 9 | Leave console.log or debug code in the final build | Explicitly banned |
| 10 | Mix naming conventions in one codebase | Quality fail |
| 11 | Ship screens with no empty or error state | A blank screen reads as a crash |
| 12 | Forget credentials for any role in the submission | Judges cannot test that role - you lose its marks |

## Section 3: CampusCoin DO and DON'T

**DO:** quick-add income/expense form + recurring entries (allowance, subscriptions); own categories plus defaults separated by **is_default flag**; dashboard with greeting, month balance, top category, budget-vs-actual; per-category monthly budgets with progress bars + near/exceed in-app alerts; reports (category-wise, 6-month income-vs-expense, daily/weekly, date/category/source filters, PDF or image export); AI suggest-as-you-type with manual override + batch suggestions on CSV import; monthly insight narrative with growth flag example plus actionable advice plus stored history; rule-based tips ranked by savings impact with pin and dismiss; bookmarks + PDF share by email; admin panel (defaults, tip templates, view/disable/reset users, stats: active users, total transactions, most-used categories); CSV bulk import; dark mode, font-size, breadcrumbs, loading indicators; sitemap on home.

**DON'T:** bank linking or real-money handling of any kind; certified financial advice (insights are advisory only); skipping the CSV import path; budgets without alerts; insights without stored history; forgetting the allowance-baseline and savings-goal profile fields.

**Demo story (5 min):** register, set profile, import or quick-add one month of spending, watch dashboard fill, set a food budget, log one more meal to trip the alert, open the monthly insight, export the PDF.

## Section 4: Demo-day DO and DON'T

**DO:** rehearse a 5-minute story (above) and time it; seed data loaded before judges arrive; test everything in Incognito on the live link; confirm the video covers every functional requirement; have credentials for every role on one slide; answer WHY for each stack choice; disclose AI help upfront with ATTRIBUTION.md.
**DON'T:** live-code on stage; demo on localhost only; read slides word for word; claim a missing feature ("it works, just not now"); argue with judges about scope - the SRS is final.

## Section 5: Jury one-liners (memorize)

**CampusCoin:** "Manual entry is the point - no bank dependency keeps it private, simple, and safe." / "AI suggests, rules rank, the user always overrides." / "The is_default flag separates system categories from personal ones." / "We scale with per-user partitions, cached reports, and async insight jobs."
**Universal closer:** "We treated out-of-scope as a boundary, not a challenge - that time went into finishing every in-scope requirement at 100 percent plus polish."