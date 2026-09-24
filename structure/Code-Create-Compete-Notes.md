# CODE, CREATE, COMPETE - TechWiz 7 Standards - Study Notes
> Source: Code-Create-Compete.pdf (17 pages) - Industry Best Practices for Success - Aptech Learning

## Objectives

1. **Evaluation Metrics** - understand criteria judges use
2. **Engineering Quality** - clean, maintainable, secure, high-performance code
3. **Responsible AI** - use AI effectively while adhering to competition guidelines

**Core mantra:**
- Working code gets you noticed.
- Good engineering gets you recognized.
- Great engineering helps you stand out.

---

## The Tale of Two Teams

Both build same shopping site: browse, cart, payment.

| | Team Alpha (LOSES) | Team Beta (WINS) |
|---|---|---|
| Planning | Last-minute submission | Well-planned |
| Code | Messy, hard-to-read | Clean, readable |
| Security | Weak | Strong |
| Performance | Slow | Fast, reliable |
| Maintenance | Difficult to maintain | Easy to maintain |

**Lesson:** Functionality is important, but quality, security, performance, and maintainability make projects stand out.

---

## Part 1: What Makes a Project Stand Out

### LOSES POINTS

- Messy monolithic file structure
- Zero setup guide or API documentation
- Hardcoded DB connection strings
- Single bulk Git commit before submission
- Missing error handling and boundary checks
- Unused dependencies and dead code

### SCORES HIGH

- Clean separation of UI, business logic, data layers
- Comprehensive README with architecture diagram
- Strict env variable security
- Structured Git commits showing progress
- Graceful exception handling and user feedback
- Automated linting and zero console warnings

---

## Part 2: Industry Coding Standards

**Insight:** Across all languages, Classes are always PascalCase. Difference is in variables/functions.

| Language | Classes | Methods / Functions | Variables | Constants | Notes |
|---|---|---|---|---|---|
| **.NET / C#** | PascalCase | PascalCase (`CalculateTotal`) | camelCase | PascalCase or ALL_CAPS | Interfaces with `I` prefix (`IPaymentGateway`) |
| **Java** | PascalCase (`OrderProcessor`) | camelCase (`calculateTotal`) | camelCase | ALL_UPPERCASE (`MAX_RETRY_ATTEMPTS`) | — |
| **Python (PEP8)** | PascalCase (`DataPipeline`) | snake_case (`calculate_loss`) | snake_case (`user_id`) | ALL_UPPERCASE (`BATCH_SIZE`) | 4-space indent, modules `lower_case` |
| **R** | — | snake_case or dot.notation | snake_case or dot.notation | kPrefix (`kAlpha`) | Assignment `<-`, files like `01_data_cleaning.R` |
| **TypeScript / JS** | PascalCase (no `I` prefix) | camelCase verbs (`getUserData`) | camelCase with types (`isLoggedIn: boolean`) | UPPER_SNAKE_CASE | Enums PascalCase (`UserRole.Admin`); Interfaces/Types PascalCase |

---

## Part 3: Free Quality Tools

| Stack | Tools | Commands |
|---|---|---|
| **Web / React / Node** | ESLint & Prettier | `npm install --save-dev eslint prettier`, `npx eslint src/ --fix` |
| **Python / AI** | Flake8 & Black | `pip install flake8 black`, `black main.py`, `flake8 main.py` |
| **R** | lintr & styler | `install.packages("lintr")`, `lintr::lint("script.R")` |
| **Enterprise .NET / Java / Python / C++** | SonarLint IDE plugin (VS Code, Visual Studio, IntelliJ) | Realtime security bugs, code smells |

---

## Part 4: Performance

**Rule:** Write clean code first, then optimize critical loops.

1. **Search:** SLOW O(N²) nested loops vs FAST O(N) hash lookup via dict `user_map = {user.id: user ...}` + `.get()`.
   - Takeaway: algorithm matters as data grows.
2. **Memory:** SLOW `string +=` in loop (reallocates) vs FAST `StringBuilder.AppendLine` (reuses buffer).
   - Takeaway: reuse memory.
3. **DB Queries:** SLOW 100 individual queries (N+1) vs FAST single joined query `populate('userId')`.
   - Takeaway: fewer queries = faster + scalable.

---

## Part 5: Security

1. **Secrets:**
   - BAD: hardcoded `dbConn` / `apiKey` string
   - GOOD: `Environment.GetEnvironmentVariable("DB_CONN")`
   - Takeaway: never expose keys in code.
2. **SQL Injection:**
   - BAD: `f"SELECT * WHERE email='{user_email}'"`
   - GOOD: `"WHERE email=%s"` + `cursor.execute(query, (user_email,))`
   - Takeaway: validate + parameterize.
3. **XSS:**
   - BAD: `innerHTML = userInput` (runs scripts)
   - GOOD: `textContent = userInput` (escapes)
   - Takeaway: never trust user input, validate + safely render.

---

## Part 6: Categories 1-10

1. Web Innovation Unleashed
2. End-to-End Full-Stack
3. Multi-Platform App
4. Smart IoT
5. Data Science Arena
6. NextWave AI/ML
7. Unity Game Foundry
8. Generative AI PowerPlay
9. Ethical Cyber Horizons
10. Digital Marketing Frontiers

---

## Part 7: Team Strategy & Responsible AI

### Phase 1 - Planning

- Analyze rubrics
- Define API contracts & DB schemas
- Setup Git + issue tracker

### Phase 2 - Execution

- Develop backend + frontend
- Lint PRs
- Peer code reviews

### Phase 3 - Finalization

- Integration + cross-browser testing
- Remove unused packages / debug keys
- Docs + architecture map + video demo

### Responsible AI: AI should assist, not author. Maintain ownership.

6 steps:

1. **Learn** (understand requirements)
2. **Architect** (design structures)
3. **Consult AI** (syntax examples)
4. **Verify** (quality / security)
5. **Refine** (optimize independently)
6. **Defend** (explain to jury)

---

## Part 8: 15-Point Pre-Submission Checklist

- [ ] **STRUCTURE** - README + diagram + setup
- [ ] **SECRETS** - env (.env)
- [ ] **CONVENTIONS** - naming
- [ ] **QUALITY** - linters, zero warnings
- [ ] **PERFORMANCE** - no O(N²), no realloc, no N+1
- [ ] **SECURITY** - sanitized / parameterized vs SQLi / XSS
- [ ] **DEFENSIBILITY** - explain every line
- [ ] **BUILD** - fresh clone builds clean
- [ ] **MANIFEST** - pinned deps package.json / requirements.txt / pom.xml
- [ ] **CLEANLINESS** - no debug / mock / temp files
- [ ] **TESTING** - edge cases, graceful errors
- [ ] **DEPLOYMENT** - live link, incognito tested
- [ ] **GIT HISTORY** - all members commit
- [ ] **AI INTEGRITY** - ATTRIBUTION.md disclosed
- [ ] **LOGISTICS** - video pitch on time + backup zip

---

*Session pair: Aptech tech quiz prep - File created for joint memory.*
