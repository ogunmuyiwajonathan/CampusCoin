# FROM REQUEST TO RESILIENCE — Designing an Enterprise Web Application
**By Mamta M — Enterprise Web Architecture Journey: One request, many architectural decisions.**
*Language / stack agnostic (PHP, Java, .NET, Node, Python).*

> Goal of these notes: follow one request through every architectural decision, and know **why** each pattern exists.

---

## 1. What Is an Enterprise Web App?

**Definition:** Large-scale system for complex business operations, high traffic, and massive data for an entire organisation.

| Example | What makes it enterprise |
|---------|--------------------------|
| **Amazon** — global e-commerce | Millions of checkouts, inventory, payments, logistics |
| **Netflix** — high-throughput streaming | Petabytes of video, global delivery, personalisation |
| **Salesforce** — B2B CRM | Workflow automation, multi-tenant data, integrations |

**Key traits:** high traffic + massive data + complex business ops + whole-org users.

---

## 2. The Story: SkillAxis Coaching Institute

Simplest version that works: **1 Web App + 1 DB**.

**User journey — Allison:**
1. Browse Course
2. Choose Course
3. Enroll

**Flow:**

```
Allison → App → DB → confirmed
```

OK for a small team with modest traffic. Problems start when it grows.

---

## 3. Monolith → Microservices

**Monolith:** UI + Business Layer + Data Interface + DB in one huge box.

**Evolution chain:**

```
Business Requirements → Technical Problems → Architectural Decisions
```

**Microservices:** split one huge app into small self-contained apps, each one business function.

| Service | Owns |
|---------|------|
| Student Service | Students |
| Course Service | Courses |
| Exam Service | Exams |
| Payment Service | Payments |
| Notification Service | Emails / SMS / push |

> Rule: reach for a pattern because you **need** it, not because it looks impressive.

---

## 4. Inside a Microservice

Layered anatomy:

| Layer | Job |
|-------|-----|
| **Controller** | Handles HTTP (in/out) |
| **Service** | Business logic (rules, checks) |
| **Repository** | Data access |
| **Database** | Persistent storage |

**Example flow — Allison ID 2547 enrolls in AI Fundamentals 5139:**

```
Browser
 → Controller
 → Service (does student exist?)
 → Repository → DB → yes
 → Service (payment done?)
 → Repository → DB → yes
 → Service (create enrollment)
 → Repository (insert) → DB → done
 → back up the chain → Browser: success
```

Each check is explicit. Each layer has one job.

---

## 5. API Gateway — Single Entry Point

**Problem:** 100+ services — who routes?

**Solution:** single entry point that does:

- **Authenticate** — who are you?
- **Authorize** — are you allowed?
- **Route** — `/students`, `/courses`, `/payment`
- **Rate Limit** — stop abuse / overload

```
Client → API Gateway → correct microservice
```

---

## 6. Message Broker — Async Communication

**Analogy — airport:** Flight AM-302 boarding is announced. Only that flight stands up. Everyone else ignores it.

- Broker announces `StudentEnrolled`
- Interested services **subscribe**, others ignore
- Sender and receiver never talk directly

**Tools:** ActiveMQ, RabbitMQ, Kafka.

---

## 7. Data Ownership — Database per Service

**Problem:** one shared DB — who changes what?

**Solution:** Database per Service.

| Service | Own DB |
|---------|--------|
| Course Service | Course DB |
| Enrollment Service | Enrollment DB |
| Payment Service | Payment DB |

> Ownership made explicit = defining principle of microservices.

---

## 8. Distributed Consistency — Event-Driven Updates

**Problem:** Allison Jones → Smith. Copies live in Course / Certificate / Analytics. How to update all?

**Solution:** Event-Driven.

```
Student Service publishes StudentUpdated
 → Course hears → updates
 → Certificate hears → updates
 → Analytics hears → updates
```

Nobody talks directly. Nobody shares DBs.

---

## 9. Containers — Fixing Inconsistent Environments

**Problem:** today 1 computer + 4 services. Tomorrow many services, different tech / libs / OS. One update breaks another.

**Solution:** Containers (Docker) — portable box with everything needed to run.

```
Code + Libraries + Runtime + Config
 → Container Image (self-contained)
 → Running Container (predictable anywhere)
```

---

## 10. Managing Containers — Kubernetes

**Problem:** 250 containers — who starts / stops / restarts / places / scales?

Docker only **creates**. It does not **manage**.

**Solution:** Kubernetes — Docker creates, K8s manages thousands.

| # | Job | Meaning |
|---|-----|---------|
| 01 | **Schedule** | Place pods on nodes |
| 02 | **Scale** | Dynamic replicas up/down |
| 03 | **Restart** | Self-healing on failure |
| 04 | **Roll Out** | Zero-downtime updates |

---

## 11. DNS / Load Balancer / Global Routing

**DNS is Google Maps for computers.**

```
Type www.skillaxis.com
 → Browser needs address
 → asks DNS → 52.168.21.40
 → sends request
```

**Request path:**

```
Browser → DNS (IP) → API Gateway (receives)
 → identifies target
 → Load Balancer finds healthy instance
 → request goes there
```

```
Users → Website → Load Balancer → Server 1 / 2 / 3
```

**Global routing — challenge is not only *how many* but *where*:**

| Region | Serves |
|--------|--------|
| A | North America |
| B | Europe + Asia |
| C | Australia |

Question answered: which region / entry point serves this user?

---

## 12. Security — Cross-Cutting, Not One Box

| Concept | Meaning |
|---------|---------|
| **Authentication** | Verify identity (who are you?) |
| **Authorization** | Enforce permissions (what can you do?) |
| **Zero Trust** | Never trust by default, verify every time |
| **Encryption** | Protect in transit & at rest |

Security lives across gateway, services, broker, DBs — not in one box.

---

## 13. JWT — Digital Boarding Pass

Don't send the password every time.

**JSON Web Token:** compact, URL-safe, signed claims. Like a digital boarding pass / ID card.

**Flow:**

```
1. Client login → Auth server
2. Auth server gives:
   - Access token (JWT, short-lived: minutes)
   - Refresh token (opaque, long-lived: days/weeks)
3. Client uses access token → API server
4. Access expires → refresh → new access token
```

---

## 14. Reliability — Failure Is Normal

| Pattern | Problem it solves | How |
|---------|-------------------|-----|
| **Idempotency** | Prevents duplicates | Unique ID + stored state; enroll twice = one enrollment |
| **Retries** | Handles temporary faults | Try again (with backoff) |
| **Circuit Breaker** | Prevents persistent overload | Stop calling temporarily if it keeps failing |

Design for failure, not just success.

---

## 15. Saga — Distributed Transactions

**Problem:** payment is slow, or part of a multi-service flow fails?

**Solution:** break a large transaction into a smaller sequence. If a later step fails, run a **compensating action** for earlier steps.

```
Orchestrator coordinates → Service A → Service B → Service C
If C fails → compensate B → compensate A
```

---

## 16. Overload Protection

| Pattern | Meaning |
|---------|---------|
| **Rate Limiting** | Cap requests per client |
| **Throttling** | Shed excess gracefully |
| **Caching** | Serve frequent data fast |

Scale only what needs to scale.

---

## 17. Database Reliability

| Concept | Meaning |
|---------|---------|
| **High Availability** | Keeps running when a component fails |
| **Replication** | Copies on other servers |
| **Failover** | Auto-switch when primary fails |
| **Disaster Recovery** | Restore after a major disaster |

**Two questions to memorise:**

- **RTO** = how fast must we recover?
- **RPO** = how much data can we afford to lose?

---

## 18. DevOps CI/CD — Build Once, Deploy Many

**Principle:** Build Once, Deploy Many.

| Stage | What happens |
|-------|--------------|
| 1. Develop & Commit | DevOps culture: automation + process + feedback |
| 2. CI | Build + Unit Tests + Quality & Security Checks + Package → pass / fail |
| 3. CD | Dev → Testing → Staging, ready to deploy, human approval |
| 4. Strategies | Blue-Green, Canary, Rolling (see below) |
| 5. Production & Monitor | Real users + improve |

**Deployment strategies:**

| Strategy | How |
|----------|-----|
| **Blue-Green** | v1.1 (blue) + v1.2 (green), switch traffic over |
| **Canary** | 5% v1.2 + 95% v1.1, gradual rollout |
| **Rolling** | Replace instances gradually |

**DevSecOps:** security integrated into every stage, not bolted on at the end.

---

## 19. Observability — See the System

| Pillar | Meaning |
|--------|---------|
| **Monitoring** | Watches continuously |
| **Logs** | Records events |
| **Metrics** | Numbers: CPU / response time / error rate |
| **Traces** | Follow one request across services |
| **Distributed Tracing** | Connects traces into the full journey |
| **Alerting** | Notifies when conditions are met |

---

## 20. Key Takeaways (5)

1. **Start with the problem, not the tech.**
2. **Separate responsibilities deliberately.**
3. **Design for failure, not just success.**
4. **Scale only what needs to scale.**
5. **Every decision has a trade-off.**

Goal is not the fanciest architecture but the **right** architecture. AI helps with design / docs / code / debug — but **YOU are the developer**, AI is the assistant only.

---

## 21. Competition Advice

- Even a full-stack small-scale project can use these ideas.
- Reach for a pattern because you need it, not to look impressive.
- Ask **why** before **how**.
- SkillAxis started simple — so can yours: one problem, one solution at a time.
- You must be able to explain **why** you used it.

---

*Source: TechWiz 7 second PDF — FROM REQUEST TO RESILIENCE by Mamta M. Formatted as study notes.*
