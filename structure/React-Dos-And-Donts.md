# React DO and DON'T - TechWiz 7 Reference
Quick reference sheet: what earns points with the judges, and what loses them. Every item maps to the TechWiz 7 checklist from both study PDFs.

## The Golden Rule
Working code gets noticed. Good engineering gets recognized. Great engineering stands out. The judges do not care what framework you picked, they care how well you built it - and whether you can explain why.

---

## Section 1: DO - things that earn points

| # | DO this | Why it scores |
|---|---------|---------------|
| 1 | Split code into folders: components/ + pages/ + lib/ + hooks/ | Separation of concerns from the enterprise PDF - Controller/Service/Repository pattern at React scale; judges ask "why is your code structured this way?" |
| 2 | Use TypeScript. Components/Classes PascalCase, functions/variables camelCase | Naming standards from Code-Create-Compete PDF; TS is checked, any is not |
| 3 | Run ESLint + Prettier until zero warnings | Code quality + maintainability points on the checklist |
| 4 | Implement all 4 states on every screen: loading, empty, error, success | Error handling + fallback UI requirement in the 15-point checklist |
| 5 | Wrap data calls in try/catch + Error Boundary with a friendly fallback | App must never crash for the user; graceful failure is a scored item |
| 6 | Use unique id keys on lists, never array index | Performance + correctness: index keys break on reorder/filter and cause re-render bugs |
| 7 | Lazy load: React.lazy + Suspense per route, images with width + height + loading="lazy" | Performance points; no layout shift, faster first paint |
| 8 | Keep secrets in .env.local via process.env.*, commit .env.example only | Security point; exposed secrets are a fail |
| 9 | Write README.md with run steps + architecture diagram | README is a required deliverable in the checklist |
| 10 | Git: small meaningful commits, clear messages, feature branches | Git history + branch discipline is scored; shows real engineering process |
| 11 | Add ATTRIBUTION.md if AI helped | AI disclosure rule - honesty is scored, denial is a trap |
| 12 | Deploy live + test in Incognito, verify full flow + mobile | Final checklist item: the live product must work end to end |
| 13 | Use parameterized queries (Prisma / prepared statements) | SQL injection defense - top security requirement |
| 14 | Use default React rendering {value} for user content | React escapes automatically = built-in XSS defense |
| 15 | Add loading indicators that match the final layout shape (skeletons) | Polish; generic spinners look cheap to the jury |

---

## Section 2: DON'T - things that lose marks

| # | DON'T do this | Why it fails |
|---|---------------|--------------|
| 1 | One giant App.js with everything inside | Monolith anti-pattern from the enterprise PDF; judges see it instantly, maintainability tanks |
| 2 | dangerouslySetInnerHTML={userInput} | XSS vulnerability - the exact fail from the security checklist |
| 3 | String-concatenate user input into SQL queries | SQL injection - automatic security fail |
| 4 | Hardcode passwords, API keys, or DB strings in code | Secret exposure - even a committed .env is a fail |
| 5 | Leave console.log / debug code in the final build | Debug code is explicitly banned in the checklist |
| 6 | Use any everywhere in TypeScript | Type safety is part of code quality; any = no safety |
| 7 | Mix naming: snake_case in JS, IUser interfaces, lower-case classes | Naming standards from the PDF - consistency is the rule |
| 8 | Sequential await inside for loops (N+1 pattern) | 10 users = 10 round trips; performance fail. Use Promise.all or a backend join |
| 9 | Commit with 50 ESLint warnings | Quality gate: the PDF standard is zero warnings |
| 10 | Build an app that only runs on your machine | Fresh-clone test: npm install && npm run build must pass |
| 11 | One layout that breaks on mobile | Responsive design is part of the checklist |
| 12 | Claim features you did not build | Jury asks to see it running; empty claims collapse under one question |
| 13 | Over-engineer: add Kafka + K8s to a 5-page project | Judges ask WHY. A tiny app with enterprise toys you cannot defend = trade-off fail. Use the pattern because you need it |
| 14 | Duplicate CTA labels or mixed accents/colors per page | Design consistency: one accent color, one radius scale, one label per intent |
| 15 | Forget empty/error states when data is missing | A blank screen is a crash to the user; graded under error handling |

---

## Section 3: Git Commit Rules (should we always commit?)

This is a scored area - the judges look at your Git history.

### DO commit...
| Situation | What to do |
|-----------|-----------|
| After every working change | Small meaningful commits: feature done -> commit with a clear message |
| Before trying something risky | Commit a safe point so you can roll back |
| At the end of a session | Never lose a day of work |
| README + .env.example + config templates | Required project files belong in version control |
| Before the demo | Push the final version to a remote (GitHub) as a backup |

### DO NOT commit...
| Situation | What NOT to do |
|-----------|----------------|
| .env files with real secrets | Security fail - use .gitignore |
| node_modules / build output | Bloat + machine-specific; .gitignore them |
| Passwords, API keys, tokens | Never, ever - even private repos leak |
| Huge files or generated junk | Keep history clean and reviewable |
| Broken half-finished code labeled as complete | Meaningful history means honest commits |

### Commit message formula (memorize)
Format: verb + what + why
- Good: "Add enrollment form with validation" (adds a feature)
- Good: "Fix SQL injection in course search" (fixes a bug)
- Good: "Refactor payment service into lib folder" (improves structure)
- Bad: "update stuff", "final final v2", "asdf"

### So: should you ALWAYS commit?
Yes - commit early and often, with meaningful messages, and push to a remote. NO - never commit secrets, junk, or broken code labeled as complete. The judges reward a clean, honest history: it proves you built the project in real steps, not one giant AI blob.

---

## Section 4: The "why" sentences to memorize for the jury

1. Why React? - Component reusability, virtual DOM for performance, and clear separation of concerns: UI in components/, logic in lib/, data access in the API layer - mirroring Controller-Service-Repository from enterprise architecture.
2. Why this folder structure? - One job per file; maintainable, testable, follows enterprise separation of concerns.
3. Why not more services/tools? - I started with the problem, not the technology. For this scope a single app with clean layers is the right trade-off. I scale only what needs to scale (Takeaway 4 from the PDF).
4. Did AI help? - Yes. ATTRIBUTION.md says what. I reviewed and understand every line. AI assisted, I am the developer.
5. What would you change at 1M users? - Separate databases per service, API Gateway, message broker, caching + rate limiting, containers on Kubernetes - the exact SkillAxis growth path.

## Closing Note
The judges score what they can see and what you can explain. Build something that works, keep it clean, commit it honestly, and be ready to say WHY for every single choice. That is what separates "working code" from "great engineering."

---