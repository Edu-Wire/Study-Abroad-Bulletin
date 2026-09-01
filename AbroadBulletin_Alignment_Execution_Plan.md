# AbroadBulletin — 3-Day Alignment Implementation Plan

> **Goal:** Ship the extended ingestion/alignment features ASAP so the senior can run and verify the complete pipeline end-to-end.
>
> **Team:** 2 developers, separate Git branches.
>
> **Important scope adjustment:** Do **not** follow a Canada → UK → other-country sequence. Build the **generic ingestion platform and source registry for all Phase 1 countries/regions at once**. Give **Appendix A of the original Blueprint** strong emphasis: every external source integration should be traceable to the official/reference mapping there.

---

## 1. Ownership Model

### Developer A — Ingestion Platform

Owns:

```text
Prisma / DB
    ↓
pg-boss
    ↓
Worker
    ↓
Generic ingestion pipeline
    ↓
HTTP / extraction
    ↓
Identity / dedupe
    ↓
Versioning / diff
    ↓
Backfill / reconciliation
    ↓
Generic source-adapter framework
```

### Developer B — Source + Editorial Platform

Owns:

```text
Appendix A source catalog
        ↓
All Phase 1 source configurations
        ↓
Source adapter implementations
        ↓
AI classification
        ↓
ArticleCandidate
        ↓
Admin UI
        ↓
Editorial actions
```

### Shared Boundary

Agree on these **once, early**:

```text
SourceAdapter contract
DiscoveryPage
NormalizedSourceDocument
Source states/statuses
API response shapes
DB relationships
Job names
```

After that:

- A does not modify B's adapter internals unless coordinated.
- B does not modify A's pipeline internals unless coordinated.
- Avoid both developers touching the same files.

---

# DAY 1 — FOUNDATION + SOURCE CATALOG

## Developer A

### A1. Ingestion DB

Implement the ingestion domain:

- `ContentSource`
- `SourceSyncState`
- `SourceRun`
- `SourceItem`
- `SourceDocumentVersion`
- `SourceDiff`
- `AiAssessment`
- `ArticleCandidate`
- `ArticleSourceLink`
- `BackfillRun`
- `BackfillWindow`

Keep these beside the existing Article/CMS model. **Do not redesign Article just for ingestion.**

### A2. Identity Constraints

Establish:

```text
(source, externalId) → unique
(source, canonicalUrlHash) → fallback identity
(sourceItem, contentHash) → unique version
```

Core rule:

```text
retry ≠ duplicate
change ≠ overwrite
```

### A3. pg-boss + Worker

Bootstrap the worker and job structure:

```text
worker/
  index
  boss
  jobs/
    discover
    detail
    classify
    draft
    backfill
    reconcile
```

Express should enqueue jobs; the worker performs external retrieval and processing.

### A4. Generic HTTP / Extraction Layer

Build shared infrastructure for:

- timeouts
- retries
- backoff
- `Retry-After`
- conditional GET
- redirect handling
- payload limits
- canonicalization
- HTML sanitization
- safe XML parsing

Do this once so adapters don't duplicate it.

### A5. Adapter Contract

Lock the generic interface:

```ts
SourceAdapter {
  discover(ctx)
  fetchDetail(item)
  normalize(detail)

  backfill?()
  snapshot?()
  reconcile?()
  healthcheck?()
}
```

---

## Developer B

### B1. Appendix A → Source Registry

Treat **Appendix A of the original Blueprint as a major implementation input**, not just documentation.

Map the official/reference entries to the Phase 1 source ecosystem.

Broad coverage:

```text
CA
  IRCC
  Notices
  Study Permit

UK
  GOV.UK Search
  Immigration Rules
  Student / Graduate / Sponsor watch

AU
  Study Australia
  Australian Education
  Student 500
  International Student Data

US
  USCIS
  U.S. Visas
  Study & Exchange
  SEVP

DE
  Federal Foreign Office
  Make it in Germany
  DAAD

NZ
  Immigration New Zealand
  Student Visa

IE
  ISD News
  Student Permission

EU
  Commission News
  Press Corner
  DG HOME
  Education Area
  Erasmus+
```

### B2. Source Configuration

Prepare the registry/config shape:

```text
code
countryCodes
authorityType
adapter
enabled
priority
schedule
backfill
HTTP policy
editorial thresholds
official reference
```

Every source should be traceable back to its Appendix A reference.

### B3. Adapter Structure

Prepare:

```text
adapters/
  base/
  rssAtom/
  jsonApi/
  webListing/
  changeWatch/
  dataFile/

  canada/
  uk/
  australia/
  usa/
  germany/
  newZealand/
  ireland/
  eu/
```

Create adapter skeletons using the shared contract.

### B4. Admin UI Skeleton

Create:

```text
/admin/sources
/admin/sources/[id]
/admin/source-items
/admin/source-items/[id]
/admin/source-runs
/admin/source-changes
```

Use mock data initially.

### B5. AI Schema

Prepare structured AI output:

```text
studyAbroadRelevance
visaRelevance
internationalStudentRelevance
scholarshipRelevance
postStudyWorkRelevance
policyImpact
urgency
primaryCategory
secondaryCategories
affectedDestinations
affectedNationalities
effectiveDates
shortSummary
recommendedAction
confidence
reasonCodes
```

Critical invariant:

```text
unknown ≠ SCHOLARSHIPS
```

---

## DAY 1 CHECKPOINT

### Developer A

- [ ] Ingestion Prisma models
- [ ] Constraints/indexes
- [ ] Migration
- [ ] ContentSource persistence
- [ ] pg-boss
- [ ] Worker bootstrap
- [ ] Job contracts
- [ ] SourceAdapter interface
- [ ] Normalized document contract
- [ ] Shared HTTP layer

### Developer B

- [ ] Extract Appendix A source catalog
- [ ] Map official references → Phase 1 sources
- [ ] Create source configuration shape
- [ ] Create all country/region adapter directories
- [ ] Create adapter skeletons
- [ ] Create source registry seed/config
- [ ] Build Automated Sources UI shell
- [ ] Build source item/candidate UI shell
- [ ] Define AI schema

### Both

- [ ] Lock shared interfaces
- [ ] Lock file/ownership boundaries
- [ ] No duplicated infrastructure work
- [ ] Both branches build successfully

---

# DAY 2 — GENERIC PIPELINE + ALL SOURCE ADAPTERS

The strategy is **breadth-first**.

Do not do:

```text
CA → validate → UK → validate → AU...
```

Do:

```text
                         GENERIC ENGINE
                              │
       ┌─────────┬────────────┼────────────┬─────────┐
       ▼         ▼            ▼            ▼         ▼
      CA        UK           AU           US       DE/NZ/IE/EU
```

---

## Developer A

### A1. Complete Generic Pipeline

Implement:

```text
DISCOVER
   ↓
SOURCE ITEM UPSERT
   ↓
DETAIL
   ↓
NORMALIZE
   ↓
CONTENT HASH
   ↓
VERSION
   ↓
DIFF
   ↓
CLASSIFICATION QUEUE
```

Processing states:

```text
DISCOVERED
DETAIL_PENDING
ENRICHED
NORMALIZED
VERSIONED
SCORED
CLASSIFIED
ROUTED
IMPORTED
PUBLISHED
```

### A2. Generic Job Plumbing

Every adapter should flow through the same engine:

```text
adapter.discover()
      ↓
generic pipeline
      ↓
adapter.fetchDetail()
      ↓
generic normalization
      ↓
generic persistence
```

The pipeline should not care whether the source is RSS, API, HTML, WATCH, or DATA.

### A3. Backfill Framework

Implement:

```text
BackfillRun
    ↓
BackfillWindow
    ↓
same ingestion pipeline
```

Make it resumable and failure-aware.

Don't spend the 3-day window implementing massive historical coverage.

### A4. Reconciliation

Implement a basic generic mechanism for:

```text
source coverage
     ↓
failed windows
     ↓
cursor / watermark
     ↓
repair
```

### A5. Express API

Implement the source-management and source-item endpoints required by the UI.

Mutations should enqueue jobs rather than perform source network calls synchronously.

---

## Developer B

### B1. Implement Source Adapter Families

Implement the Phase 1 sources through the generic adapter families:

```text
RSS_ATOM
JSON_API
WEB_LISTING
CHANGE_WATCH
DATA_FILE
```

Not every source needs the same mechanism.

### B2. Use Appendix A References Directly

Maintain explicit traceability, e.g.:

```text
Appendix A reference
      ↓
official endpoint/page
      ↓
discovery mechanism
      ↓
detail mechanism
      ↓
identity rule
      ↓
normalization
      ↓
schedule
      ↓
backfill
      ↓
health/reconciliation
```

The implementation should make it obvious which official source/reference supports each adapter.

### B3. Complete Source Registry

By the end of Day 2:

```text
Phase 1 source records
        ↓
enabled / disabled
        ↓
adapter mapping
        ↓
schedule
        ↓
priority
        ↓
backfill configuration
        ↓
official reference
```

### B4. AI Pipeline

Wire:

```text
normalized full source
       ↓
deterministic prefilter
       ↓
structured AI
       ↓
validated AiAssessment
       ↓
routing
```

### B5. ArticleCandidate Bridge

Implement:

```text
AiAssessment
      ↓
ArticleCandidate
      ↓
existing Article
```

Do not create a direct `SourceItem → Article` shortcut.

---

## DAY 2 CHECKPOINT

### Developer A

- [ ] Discovery pipeline
- [ ] SourceItem upsert
- [ ] Detail pipeline
- [ ] Normalization
- [ ] Hashing
- [ ] Versioning
- [ ] Diff creation
- [ ] Backfill framework
- [ ] Reconciliation framework
- [ ] Express endpoints

### Developer B

- [ ] RSS/Atom adapter family
- [ ] JSON API adapter family
- [ ] Web listing adapter family
- [ ] Change-watch adapter family
- [ ] Data-file adapter family
- [ ] Configure all Phase 1 sources
- [ ] AI prefilter
- [ ] AI assessment
- [ ] Candidate creation
- [ ] Real API/UI integration

### Both

- [ ] At least one source of every adapter type works
- [ ] SourceItem appears in DB
- [ ] Full detail appears
- [ ] Version exists
- [ ] AI assessment exists
- [ ] Candidate exists

---

# DAY 3 — INTEGRATION + HARDENING + RELEASE

Day 3 is **not another feature-development day**.

Focus on:

> **Connect everything, eliminate broken edges, and make the senior's E2E verification reliable.**

---

## Developer A

### A1. Pipeline Hardening

Test:

```text
duplicate discovery
duplicate retry
changed document
missing external ID
URL change
failed page
429
5xx
malformed XML
AI unavailable
queue retry
backfill interruption
```

### A2. Worker / Runtime

Verify:

```text
API process
Worker process
pg-boss
PostgreSQL
environment variables
schedules
```

### A3. Security

At minimum verify:

```text
SSRF protection
XML XXE protection
HTML sanitization
payload limits
redirect restrictions
```

---

## Developer B

### B1. Admin Integration

Remove mocks.

Operator should be able to:

```text
See sources
→ trigger sync
→ inspect items
→ inspect full source
→ inspect AI assessment
→ create draft
→ ignore
→ inspect runs
→ inspect source health
→ inspect changes
```

### B2. Editorial Validation

Run deliberate cases:

```text
high-relevance visa item
→ CREATE_DRAFT

ambiguous education item
→ REVIEW

irrelevant government item
→ IGNORE

generic EU policy item
→ NOT SCHOLARSHIPS
```

### B3. Source Completeness

For every configured Phase 1 source:

```text
adapter exists?
config exists?
official reference recorded?
discover works?
detail works?
identity defined?
healthcheck works?
```

---

# FINAL SHARED E2E TEST

Your senior should be able to run:

```text
                 ADMIN
                   │
             "Sync Source"
                   │
                   ▼
                EXPRESS
                   │
                enqueue
                   ▼
                PG-BOSS
                   │
                   ▼
                WORKER
                   │
             SOURCE ADAPTER
                   │
                   ▼
               DISCOVER
                   │
                   ▼
              SOURCE ITEM
                   │
                   ▼
                DETAIL
                   │
                   ▼
               NORMALIZE
                   │
                   ▼
             VERSION / DIFF
                   │
                   ▼
             RULES → AI
                   │
                   ▼
             AI ASSESSMENT
                   │
                   ▼
          ARTICLE CANDIDATE
                   │
                   ▼
              ADMIN REVIEW
                   │
                   ▼
             CREATE DRAFT
                   │
                   ▼
             EXISTING ARTICLE
                   │
                   ▼
             HUMAN PUBLISH
```

Then verify:

```text
RUN SYNC AGAIN
      ↓
NO DUPLICATE
```

And:

```text
SOURCE CHANGES
      ↓
NEW VERSION
      ↓
DIFF
      ↓
REASSESS
```

---

# Appendix A: Working Rule

> **Every external source integration must be traceable to an official/reference entry in Appendix A of the original Blueprint.**

For each source, maintain:

| Field | Required |
|---|---|
| Source name | Yes |
| Country/region | Yes |
| Appendix A reference | Yes |
| Official URL/endpoint | Yes |
| Adapter family | Yes |
| Discovery mechanism | Yes |
| Detail mechanism | Yes |
| Identity strategy | Yes |
| Schedule | Yes |
| Backfill strategy | Yes |
| Health/reconciliation strategy | Yes |

This gives a clean trail:

```text
Official Research
      ↓
Appendix A
      ↓
Source Registry
      ↓
Adapter
      ↓
Generic Pipeline
      ↓
Database
      ↓
AI / Candidate
      ↓
CMS
      ↓
Human Publication
```

---

# 🚫 Three-Day Scope Discipline

Do **not**:

- Have both developers touch Prisma/schema work.
- Have both developers design the adapter contract.
- Implement country pipelines as separate architectures.
- Rewrite the existing Article model.
- Delete `RSSSource` immediately.
- Build massive historical backfill depth before the live pipeline works.
- Make AI responsible for ingestion correctness.
- Make Express perform slow government network calls synchronously.
- Spend Day 3 adding features while E2E is broken.
- Add a new source integration without recording its Appendix A / official-reference traceability.

---

# The Core Mental Model

```text
                    OFFICIAL SOURCES
                           │
                    Appendix A / Registry
                           │
                           ▼
                    SOURCE ADAPTERS
                           │
                           ▼
                    GENERIC ENGINE
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           Discover       Detail      Watch
              │            │            │
              └────────────┼────────────┘
                           ▼
                       Normalize
                           ↓
                     Version / Diff
                           ↓
                    Rules + AI
                           ↓
                  ArticleCandidate
                           ↓
                     Existing CMS
                           ↓
                    Human Publish
```

## The one rule for the three days

**When choosing between “another feature” and “making the E2E path work,” choose E2E every time.**

The target is not “eight countries half-built.”

The target is:

> **One generic, reusable ingestion platform + complete Phase 1 source registry/adapter coverage + official Appendix A traceability + a working end-to-end editorial flow.**
