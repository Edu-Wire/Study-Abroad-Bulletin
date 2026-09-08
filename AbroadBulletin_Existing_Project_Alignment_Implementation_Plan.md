**ABROADBULLETIN**

Existing Project Alignment\
& Migration Implementation Plan

**Phase 1 Government Content Ingestion Engine**

**Aligned to current stack:** Next.js 16 + Express 5 + PostgreSQL +
Prisma 7

**Migration strategy:** preserve the existing Article CMS and
BFF/security model; replace only the RSS-specific ingestion layer in
controlled stages.

+-----------------------------------------------------------------------+
| **Status: READY FOR IMPLEMENTATION**                                  |
|                                                                       |
| This document is a delta/migration plan for the existing project. It  |
| should be used together with the original Phase 1 Ingestion           |
| Blueprint. It does not propose a greenfield rebuild.                  |
+=======================================================================+
+-----------------------------------------------------------------------+

**Baseline used for alignment**

-   Original Phase 1 Ingestion Blueprint (23-page architecture/source
    plan).

-   Existing-project audit details supplied in the current conversation:
    Article CMS, RSSSource, Prisma/PostgreSQL, Express BFF, Next.js
    admin, current RSS preview/import flow, and identified code paths.

-   Important limitation: the actual repository was not attached to this
    chat, so file-level actions below are based on that audit transcript
    and should be verified against the repo before migration.

# 1. Final Alignment Decision

+-----------------------------------------------------------------------+
| **Do not rebuild the application**                                    |
|                                                                       |
| Keep the existing publishing system, authentication, roles, Article   |
| schema, Prisma/PostgreSQL database, Express API boundary and Next.js  |
| admin. Build a new ingestion domain beside them, migrate the current  |
| RSS sources into it, then retire the RSS-only preview/import path     |
| after the new pipeline proves stable.                                 |
+=======================================================================+
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **Layer**                           **Aligned decision**
  ----------------------------------- -----------------------------------
  **Frontend**                        Keep existing Next.js admin. Add
                                      Automated Sources, Source Details,
                                      Candidate Review, Runs/Health,
                                      Backfills and Change Events.

  **API**                             Keep Express 5. Mount a dedicated
                                      ingestion router/module instead of
                                      continuing to expand
                                      backend/src/app.js.

  **Database**                        Keep PostgreSQL + Prisma 7. Add
                                      ingestion tables; do not replace
                                      Article or CMS tables.

  **Publishing**                      Article remains the
                                      public/editorial destination.
                                      Source records are evidence;
                                      ArticleCandidate is the review
                                      bridge.

  **Queue**                           Add pg-boss in the same PostgreSQL
                                      database for Phase 1. No Redis is
                                      required initially.

  **Current RSS**                     Keep temporarily as compatibility.
                                      Stop treating RSS item == Article.

  **AI**                              Hybrid: deterministic rules + full
                                      source detail + structured AI;
                                      auto-create high-confidence drafts;
                                      human publish at launch.

  **History**                         Hybrid: live sync starts
                                      immediately; bounded lower-priority
                                      backfill runs in parallel and
                                      reconciles gaps.
  -----------------------------------------------------------------------

## The critical boundary

CURRENT\
RSS/Atom -\> preview route -\> short feed item -\> direct Article draft\
\
TARGET\
ContentSource -\> worker discovery -\> SourceItem -\> full
detail/version -\> AI assessment\
-\> ArticleCandidate -\> explicit/automatic draft creation -\> existing
Article CMS -\> human publish

# 2. Existing Project Baseline

Based on the project audit supplied, the current application already has
the foundations we need. The ingestion upgrade should therefore be
additive and migration-safe.

  ---------------------------------------------------------------------------------------
  **Existing capability** **Known location / behavior**           **Decision**
  ----------------------- --------------------------------------- -----------------------
  Next.js admin           src/app/admin/\*                        KEEP

  Admin navigation        src/components/admin/AdminSidebar.tsx   MODIFY: add Automated
                                                                  Sources

  Article client/BFF      src/lib/articles.ts                     KEEP; add parallel
  helper                                                          source/candidate
                                                                  helpers

  Express API             backend/src/app.js                      KEEP; extract ingestion
                                                                  routes into module

  Prisma schema           prisma/schema.prisma                    KEEP; add ingestion
                                                                  domain models

  Article CMS             Article model + existing statuses/roles KEEP as publishing
                                                                  destination

  RSS registry            RSSSource                               MIGRATE then DEPRECATE

  Live RSS preview        /admin/rss/preview                      COMPATIBILITY only
                                                                  during cutover

  RSS import              /articles/import-rss                    COMPATIBILITY only;
                                                                  replace with candidate
                                                                  -\> Article

  Existing adapters       src/lib/rss/ircc.ts, src/lib/rss/uk.ts  REUSE useful parsing
                                                                  ideas; move
                                                                  responsibility to
                                                                  backend worker adapters

  XML parser              fast-xml-parser already available       KEEP; apply safe
                                                                  limits/config

  Worker/queue            Missing                                 ADD pg-boss + dedicated
                                                                  worker process
  ---------------------------------------------------------------------------------------

## What we must not do

-   Do not introduce MongoDB, FastAPI, or a separate persistence stack.

-   Do not rewrite Article, editorial roles, publishing status, or the
    existing public article renderer just to support ingestion.

-   Do not move scheduled polling into Next.js or Express request
    handlers.

-   Do not make all eight Phase 1 country integrations simultaneously;
    establish the platform with Canada + UK first.

-   Do not delete RSSSource before the migration/cutover is complete.

# 3. Aligned Target Architecture

NEXT.JS ADMIN\
\| existing session/role/BFF conventions\
v\
EXPRESS API\
\|\-- /admin/content-sources\
\|\-- /admin/source-items\
\|\-- /admin/source-runs\
\|\-- /admin/source-health\
\|\-- /admin/source-changes\
\|\
+\--\> enqueue only\
v\
PG-BOSS (same PostgreSQL)\
\|\
v\
DEDICATED NODE WORKER\
discover -\> detail -\> normalize -\> version/diff -\> rules -\> AI -\>
candidate\
\|\
v\
POSTGRESQL / PRISMA\
ContentSource / SourceItem / SourceDocumentVersion / AiAssessment /
ArticleCandidate\
\|\
v\
EXISTING Article CMS\
\|\
v\
Existing editor review / publish flow

## Recommended backend module layout

backend/src/\
app.js \# mount ingestion router only\
modules/ingestion/\
ingestion.routes.js\
controllers/\
contentSource.controller.js\
sourceItem.controller.js\
sourceRun.controller.js\
backfill.controller.js\
services/\
sync.service.js\
detail.service.js\
normalization.service.js\
classification.service.js\
candidate.service.js\
reconciliation.service.js\
adapters/\
base/\
rssAtom.adapter.js\
webListing.adapter.js\
changeWatch.adapter.js\
dataFile.adapter.js\
canada/\
uk/\
australia/\
usa/\
germany/\
newZealand/\
ireland/\
eu/\
repositories/\
schemas/\
utils/\
worker/\
index.js\
boss.js\
jobs/\
discover.job.js\
detail.job.js\
classify.job.js\
createDraft.job.js\
backfill.job.js\
reconcile.job.js

## Recommended Next.js additions

src/app/admin/\
sources/page.tsx\
sources/\[id\]/page.tsx\
source-items/page.tsx\
source-items/\[id\]/page.tsx\
source-runs/page.tsx\
source-changes/page.tsx\
\
src/lib/\
content-sources.ts\
source-items.ts\
source-runs.ts\
source-changes.ts

# 4. PostgreSQL / Prisma Alignment

Add the ingestion domain beside the existing Article model. The names
below follow the blueprint and can be prefixed if the current schema has
collisions.

  --------------------------------------------------------------------------------
  **Model**               **Purpose**                      **Relationship to
                                                           existing CMS**
  ----------------------- -------------------------------- -----------------------
  ContentSource           Registry/config for API, RSS,    Replaces RSSSource as
                          ATOM, WEB, WATCH, DATA sources.  the future registry.

  SourceSyncState         Cursor, watermark, ETag,         No Article coupling.
                          Last-Modified, overlap and last  
                          success.                         

  SourceRun               Every live/backfill/reconcile    Operational audit.
                          run with counts/errors/timings.  

  SourceItem              Stable logical government item;  One item may later link
                          strong external identity.        to an Article.

  SourceDocumentVersion   Immutable full-source snapshot + Evidence/history.
                          normalized content hash.         

  SourceDiff              Material changes between         Can trigger candidate
                          versions.                        refresh.

  AiAssessment            Structured                       Never overwrites
                          classification/relevance with    Article directly.
                          model/prompt version.            

  ArticleCandidate        Editorial bridge: suggested      Candidate -\> existing
                          headline/body/category/status.   Article draft.

  ArticleSourceLink       Links Article to source          Adds provenance without
                          item/version/reference.          changing Article
                                                           semantics.

  BackfillRun             Top-level bounded historical     Independent of Article.
                          task.                            

  BackfillWindow          Retryable date/page windows with Prevents silent
                          durable status.                  historical gaps.
  --------------------------------------------------------------------------------

## Minimum constraints / indexes

-   ContentSource.code unique.

-   SourceItem: unique on (contentSourceId, externalId) when externalId
    exists; canonical URL fallback uniqueness by source.

-   SourceDocumentVersion: unique on (sourceItemId, contentHash) so
    retries do not create duplicate versions.

-   ArticleSourceLink: unique relationship that prevents creating
    multiple drafts/articles for the same source item unless explicitly
    allowed.

-   BackfillWindow: unique by backfillRun + windowStart + windowEnd (or
    cursor/page key).

-   Index SourceItem by publishedAt, country/source, processing status,
    relevance route; SourceRun by source + startedAt/status.

+-----------------------------------------------------------------------+
| **Migration rule**                                                    |
|                                                                       |
| Create these tables first. Do not alter or delete Article fields to   |
| make the ingestion schema fit. The ingestion domain should adapt to   |
| the CMS boundary, not the reverse.                                    |
+=======================================================================+
+-----------------------------------------------------------------------+

# 5. Safe Migration from RSSSource

The existing RSS implementation should become a transition source, not a
hard cutover.

1.  Create ContentSource and new ingestion tables with no UI cutover.

2.  Seed one ContentSource for each existing RSSSource. Preserve
    original feed URL, country, active state and any category hints as
    legacy metadata.

3.  Run new worker ingestion in shadow mode while the old RSS preview
    remains available to editors.

4.  For Canada and UK, compare old preview items against new SourceItem
    discovery/detail records for at least several days.

5.  Switch admin navigation to Automated Sources + Candidates when
    counts/detail extraction are stable.

6.  Make /admin/rss/preview read-only/legacy, then remove it only after
    all enabled feeds have migrated and no frontend consumer depends on
    it.

7.  Retire /articles/import-rss after all draft creation flows through
    ArticleCandidate -\> Article.

## Temporary compatibility approach

Feature flags\
INGESTION_V2_ENABLED=true\
INGESTION_V2_SHADOW=true\
LEGACY_RSS_PREVIEW_ENABLED=true\
\
Cutover\
INGESTION_V2_SHADOW=false\
LEGACY_RSS_PREVIEW_ENABLED=false\
\
Rollback\
Re-enable legacy preview while keeping v2 source data intact.

# 6. Worker + pg-boss Integration

The dedicated worker is the most important missing runtime component.
Express should enqueue work and return quickly; the worker owns network
calls, retries, backfill and AI tasks.

  ----------------------------------------------------------------------------
  **Job**                 **Input**                   **Output / retry
                                                      boundary**
  ----------------------- --------------------------- ------------------------
  source.discover         contentSourceId +           Upsert SourceItem;
                          mode/window                 enqueue detail for
                                                      new/changed items.

  source.detail           sourceItemId                Fetch full page/API
                                                      document; create
                                                      SourceDocumentVersion.

  source.diff             sourceItemId + versionIds   Create SourceDiff and
                                                      materiality result.

  source.classify         sourceItemId/versionId      Deterministic filters +
                                                      structured AiAssessment.

  candidate.create        sourceItemId/assessmentId   Create/update
                                                      ArticleCandidate;
                                                      optional auto-draft
                                                      route.

  backfill.window         backfillWindowId            Discover one bounded
                                                      window; durable
                                                      COMPLETE/FAILED.

  source.reconcile        contentSourceId + period    Repair missed
                                                      windows/count
                                                      discrepancies.
  ----------------------------------------------------------------------------

## Process topology

Terminal / deployment\
\
1) API\
npm run start:api\
\
2) Worker\
npm run worker\
\
Both use the same DATABASE_URL. Only the worker receives
polling/backfill schedules.

+-----------------------------------------------------------------------+
| **Deployment note**                                                   |
|                                                                       |
| If the current hosting platform only runs one Node process, deploy    |
| the worker as a second service/process using the same codebase and    |
| PostgreSQL. Do not run long-lived polling inside serverless Next.js   |
| functions.                                                            |
+=======================================================================+
+-----------------------------------------------------------------------+

# 7. Adapter Contract: How Existing RSS Code Evolves

interface SourceAdapter {\
discover(ctx): Promise\<DiscoveredItem\[\]\>\
fetchDetail(item, ctx): Promise\<SourceDetail\>\
normalize(detail, item, ctx): Promise\<NormalizedSourceDocument\>\
getCheckpoint?(response, ctx): Promise\<Checkpoint\>\
}\
\
// Optional capabilities\
interface BackfillableAdapter { backfill(window, ctx):
Promise\<DiscoveryPage\> }\
interface WatchAdapter { snapshot(ctx): Promise\<WatchedSnapshot\> }\
interface ReconcileAdapter { reconcile(period, ctx):
Promise\<ReconcileResult\> }

## How to reuse current rss/ircc.ts and rss/uk.ts

-   Move reusable parsing/canonicalization logic to backend ingestion
    adapters; the backend worker must own third-party retrieval.

-   Keep the Next.js helpers only as admin API clients; do not let them
    fetch government feeds directly.

-   Canada can begin by wrapping the existing IRCC Atom parsing logic,
    then add detail enrichment and change watch.

-   UK should not preserve Atom-first behavior as the main strategy;
    replace discovery with GOV.UK Search API and detail with Content
    API.

# 8. Implementation Sequence: Canada + UK Pilot First

  ----------------------------------------------------------------------------
  **Step**                **Canada**              **United Kingdom**
  ----------------------- ----------------------- ----------------------------
  Discovery               IRCC official Atom +    GOV.UK Search API scoped to
                          IRCC Notices listing    UKVI/Home
                                                  Office/Student/Immigration
                                                  content

  Detail                  Fetch Canada.ca detail  GOV.UK Content API by
                          when Atom contains      base_path/content item
                          summary only            

  Rule watch              Selected study permit / Student/Graduate/sponsor
                          work / PGWP pages       guidance and rule
                                                  collections

  Identity                Atom id/GUID -\>        content_id/base_path -\>
                          canonical URL fallback  canonical URL fallback

  Backfill                Bounded recent          Statements of Changes +
                          News/Notices history    bounded Search API history

  High-value terms        study permit, DLI,      Student route, Graduate
                          PAL/TAL, PGWP           route, CAS, sponsor,
                                                  Appendix Student

  Acceptance gate         Full detail \>=95%;     API pagination/reconcile
                          zero duplicate logical  stable; full content
                          inserts                 structured
  ----------------------------------------------------------------------------

## Pilot success gate before adding Australia/USA

-   At least 95% of discovered items receive complete detail or an
    explicit source limitation.

-   No duplicate logical source items under retries/manual sync.

-   A modified watched page creates a new version and diff instead of
    overwriting silently.

-   Candidate category no longer defaults unrelated items to
    SCHOLARSHIPS.

-   Editors can inspect original full source, native metadata and AI
    assessment before draft creation.

-   Source run/health screen can distinguish HEALTHY, DEGRADED, STALE,
    BROKEN and RATE_LIMITED.

-   Old RSS preview and new source stream can be reconciled for the
    pilot period.

# 9. Phase 1 Expansion After Pilot

  -----------------------------------------------------------------------
  **Wave**                **Country/region**      **Adapters to add**
  ----------------------- ----------------------- -----------------------
  Wave A                  Australia               Study Australia WEB;
                                                  Education RSS + detail;
                                                  Home Affairs Student
                                                  500 WATCH;
                                                  international education
                                                  DATA.

  Wave A                  USA                     USCIS RSS/detail; State
                                                  Visa News WEB; F/M/J
                                                  WATCH; SEVP selected
                                                  WATCH.

  Wave B                  Germany                 FFO RSS x2 with strong
                                                  prefilter; Make it in
                                                  Germany WATCH; DAAD
                                                  WEB.

  Wave B                  New Zealand             Immigration NZ
                                                  listing/detail +
                                                  student hub WATCH.

  Wave B                  Ireland                 ISD News WEB + student
                                                  permission/finance
                                                  WATCH; optional
                                                  Education in Ireland.

  Wave C                  European Union          EU Press Corner
                                                  Search/Documents API;
                                                  Commission Department
                                                  News; DG HOME;
                                                  Education Area;
                                                  Erasmus+.
  -----------------------------------------------------------------------

Do not unlock the next wave solely because code is written. Unlock it
when the previous wave meets the source-health, dedupe and
editorial-precision gates.

# 10. AI + Existing ArticleCategory Alignment

Keep the current ArticleCategory enum stable for the first migration.
The ingestion engine can have a richer internal taxonomy without forcing
a risky CMS-wide enum migration.

AiAssessment.output (rich internal taxonomy)\
STUDENT_VISA\
IMMIGRATION_POLICY\
POST_STUDY_WORK\
INTERNATIONAL_EDUCATION\
SCHOLARSHIP\
ADMISSIONS\
DATA_INTELLIGENCE\
EU_POLICY\
OTHER\
\
ArticleCandidate -\> existing ArticleCategory mapping\
STUDENT_VISA / IMMIGRATION_POLICY / POST_STUDY_WORK -\> VISA\
SCHOLARSHIP -\> SCHOLARSHIPS\
ADMISSIONS -\> ADMISSIONS\
INTERNATIONAL_EDUCATION -\> existing closest editorial category or
manual selection\
OTHER / low-confidence -\> no automatic draft

## Hybrid routing policy

  -----------------------------------------------------------------------
  **Route**               **Suggested rule**      **Action**
  ----------------------- ----------------------- -----------------------
  IGNORE                  Very low relevance or   Keep source evidence;
                          deterministic exclusion no candidate.

  REVIEW                  Medium                  Create candidate;
                          relevance/confidence or editor decides.
                          category ambiguity      

  CREATE_DRAFT            High relevance + high   Auto-create/update
                          confidence + complete   draft in existing
                          full detail             Article CMS.

  PUBLISH                 Disabled at launch      Human-only using
                                                  existing publish
                                                  action/permission.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Fix for current EU problem**                                        |
|                                                                       |
| Never set a fallback ArticleCategory of SCHOLARSHIPS for unclassified |
| content. Unknown/low confidence should remain UNCLASSIFIED/OTHER in   |
| AiAssessment and require review before mapping to Article.            |
+=======================================================================+
+-----------------------------------------------------------------------+

# 11. Express API Integration

Mount one ingestion router from backend/src/app.js and keep
authentication/role middleware identical to the existing admin
endpoints.

  --------------------------------------------------------------------------
  **Method / route**                     **Purpose**
  -------------------------------------- -----------------------------------
  GET /admin/content-sources             Registry grouped by
                                         country/source/method + health.

  GET /admin/content-sources/:id         Config, recent runs, sync state,
                                         errors.

  POST /admin/content-sources/:id/sync   Enqueue manual live sync; never
                                         fetch inline.

  POST                                   Create bounded historical run.
  /admin/content-sources/:id/backfill    

  POST                                   Enqueue repair/reconciliation.
  /admin/content-sources/:id/reconcile   

  GET /admin/source-items                Candidate/source stream filters.

  GET /admin/source-items/:id            Full source, versions, diff, AI,
                                         candidate/article link.

  POST                                   Re-run rules/AI against selected
  /admin/source-items/:id/reclassify     version.

  POST                                   Create/update existing Article
  /admin/source-items/:id/create-draft   draft.

  POST /admin/source-items/:id/ignore    Ignore with reason/audit.

  GET /admin/source-runs                 Operational history.

  GET /admin/source-health               Freshness, failure, lag, backlog.

  GET /admin/source-changes              Watched-page material changes.
  --------------------------------------------------------------------------

## Legacy route behavior during migration

-   /admin/rss/preview: keep temporarily, mark legacy, do not extend for
    new API/WEB/WATCH sources.

-   /articles/import-rss: stop adding features; later return deprecation
    response or internally redirect selected migrated source items to
    candidate creation if needed.

-   All new features use /admin/content-sources and /admin/source-items.

# 12. Next.js Admin Alignment

The current RSS screen can evolve without replacing the whole admin UI.

AdminSidebar.tsx\
Editorial & Content\
News & Articles (existing)\
Automated Sources (new)\
Source Changes (new, optional nested)\
\
Automated Sources\
All \| Canada \| UK \| Australia \| USA \| Germany \| NZ \| Ireland \|
EU\
Method badges: API / ATOM / RSS / WEB / WATCH / DATA\
Health: LIVE / DEGRADED / STALE / ERROR / BACKFILLING

## Candidate card should show

-   country + source + method + native document type

-   published date + external reference/GUID

-   full-source loaded status and version count

-   native topics separate from editorial category

-   relevance scores + AI confidence + route

-   diff/material change badge when applicable

-   View Full Source / View Assessment / Create Draft / Ignore

# 13. Live + Historical Backfill in the Existing System

LIVE lane (high priority)\
scheduled source sync -\> detail -\> classify -\> candidate/draft\
\
BACKFILL lane (low priority)\
explicit date range -\> small windows -\> same upsert/detail/classify
pipeline\
\
Both lanes write the same SourceItem identities and therefore cannot
duplicate logical items.

  -----------------------------------------------------------------------
  **Rule**                            **Aligned behavior**
  ----------------------------------- -----------------------------------
  Cursor/watermark                    Persist in SourceSyncState; use
                                      overlap on each incremental query.

  Overlap                             72h stable APIs; longer for
                                      unreliable/editable web listings.

  Failure                             Failed page/window stays FAILED and
                                      retryable; never becomes "no more
                                      results".

  Versioning                          Changed content hash -\> new
                                      SourceDocumentVersion + SourceDiff.

  Reconciliation                      Daily high-value API sources;
                                      weekly noisier web listings.

  Priority                            Live \> manual editor action \>
                                      reconciliation \> backfill.

  Article safety                      Backfill may create
                                      candidates/drafts per configured
                                      policy but never auto-publishes.
  -----------------------------------------------------------------------

# 14. Security, Reliability and Observability

-   SSRF: source URLs must come from trusted ContentSource
    configuration; block localhost/private/reserved destinations on
    redirects and arbitrary admin-added URLs.

-   XML: disable DTD/external entity resolution; cap body size and parse
    time; reject malformed feed payloads safely.

-   HTTP: per-domain concurrency, timeout, retry with exponential
    backoff/jitter, honor Retry-After, conditional requests via
    ETag/Last-Modified where supported.

-   Content: canonicalize URLs, store raw metadata where useful, hash
    normalized content region, sanitize HTML before editorial rendering.

-   AI: validate JSON output against a schema; malformed output is a
    retryable classification failure, not a valid candidate.

-   Audit: persist run status, error type, model/prompt version, editor
    action and article-source link.

-   No source failure may be interpreted as "zero new items" without
    recording a successful source response.

# 15. Exact Migration Milestones for This Project

  -------------------------------------------------------------------------------
  **Milestone**           **Concrete change in    **Exit gate**
                          current project**       
  ----------------------- ----------------------- -------------------------------
  M0 - Verify baseline    Confirm                 No unresolved consumer of
                          Article/RSSSource       legacy RSS flow.
                          schema, route           
                          consumers, auth         
                          middleware, deployment  
                          process, current        
                          categories.             

  M1 - Schema             Add ContentSource       Migration applies/rolls back in
                          through BackfillWindow  staging; old CMS unchanged.
                          models + Prisma         
                          migration. Seed         
                          existing RSSSource rows 
                          into ContentSource.     

  M2 - Worker             Install/configure       Manual test job completes; API
                          pg-boss;                remains responsive.
                          backend/src/worker;     
                          health/logging; npm     
                          worker command.         

  M3 - Generic pipeline   RSS/Atom base, HTTP     Retry creates no duplicates;
                          client,                 change creates a version.
                          canonicalization,       
                          upsert, version/diff,   
                          source run/state.       

  M4 - Canada             IRCC Atom + detail +    \>=95% detail; candidate view
                          notices/watch.          works.

  M5 - UK                 GOV.UK Search/Content + Pagination/backfill/reconcile
                          Statements/Student      stable.
                          watch.                  

  M6 - Editorial bridge   AiAssessment +          No direct source -\> Article
                          ArticleCandidate +      path for v2.
                          ArticleSourceLink;      
                          category mapping;       
                          create-draft action.    

  M7 - Admin cutover      Automated Sources,      Editors complete pilot workflow
                          candidates, health,     without legacy screen.
                          runs; hide legacy       
                          preview behind flag.    

  M8 - Rest Phase 1       Australia/USA,          Per-wave gates met.
                          Germany/NZ/Ireland, EU  
                          in waves.               

  M9 - Retire legacy      Remove/disable RSS      No enabled RSSSource-only
                          preview/import after    dependencies remain.
                          consumer search +       
                          migration validation.   
  -------------------------------------------------------------------------------

## Recommended first development sprint

-   Day 1: repo audit + route/schema consumer map + deployment topology.

-   Days 2-3: Prisma ingestion schema + migration + RSSSource -\>
    ContentSource seed script.

-   Days 3-4: pg-boss worker bootstrap + logging + manual sync endpoint.

-   Days 5-6: generic SourceItem/version/dedupe pipeline + safe HTTP/XML
    client.

-   Days 7-8: IRCC adapter with detail enrichment.

-   Days 9-10: GOV.UK Search/Content adapter and basic admin
    source/candidate screen.

# 16. Acceptance Tests Before Cutover

  -----------------------------------------------------------------------
  **Test**                            **Expected result**
  ----------------------------------- -----------------------------------
  Same feed/API item twice            One SourceItem; no duplicate
                                      version when content hash
                                      unchanged.

  Government page edited              New SourceDocumentVersion +
                                      SourceDiff; prior evidence
                                      retained.

  Missing GUID                        Canonical URL identity fallback
                                      without duplicate draft.

  Pagination page fails               BackfillWindow FAILED; run not
                                      marked complete.

  429                                 Worker delays/retries; source
                                      health may show RATE_LIMITED.

  Malformed XML                       Safe parse failure; no
                                      entity/network resolution.

  AI invalid JSON                     Assessment error/retry; no
                                      malformed candidate/article.

  High-confidence NZ/IRCC student     Candidate or draft created per
  rule update                         policy; editor still publishes.

  Low-relevance EU speech             Not mislabeled SCHOLARSHIPS;
                                      retained as low/review/ignore
                                      depending score.

  Existing Article page               Unaffected by ingestion schema
                                      migration.

  Rollback flag                       Legacy RSS screen can be re-enabled
                                      without losing v2 ingestion
                                      records.
  -----------------------------------------------------------------------

# 17. Definition of Done for Phase 1 Alignment

-   Existing public/editorial Article workflow still works exactly as
    before for manually authored articles.

-   All automated source retrieval runs outside request handlers in the
    worker.

-   RSS/Atom/API/WEB/WATCH/DATA sources share one normalized evidence
    pipeline.

-   Full source detail is loaded before classification whenever
    available.

-   Source edits are versioned/diffed instead of silently overwritten.

-   High-confidence relevant items may create drafts, but AI cannot
    publish at launch.

-   Canada + UK operate stably before remaining Phase 1 waves are
    enabled.

-   The Automated Sources admin exposes source health, runs, candidates,
    backfill and changes.

-   Existing RSS sources are migrated without data loss and legacy RSS
    routes are retired only after consumer verification.

-   The EU Press Corner implementation uses structured API
    discovery/detail rather than RSS summary as final content.

-   Monitoring proves freshness, detail completeness, duplicate safety,
    classification precision and backfill integrity.

+-----------------------------------------------------------------------+
| **Recommended next action**                                           |
|                                                                       |
| Do not begin by coding Australia/EU adapters. First implement M0-M3   |
| plus Canada and UK. Once those two sources prove the schema, worker,  |
| dedupe, full-detail enrichment, candidate bridge and admin UX, the    |
| remaining countries become adapter work rather than architecture      |
| work.                                                                 |
+=======================================================================+
+-----------------------------------------------------------------------+

## Implementation handoff checklist

\[ \] Verify current Prisma Article + RSSSource definitions\
\[ \] Find all consumers of /admin/rss/preview and /articles/import-rss\
\[ \] Add ingestion models + migration\
\[ \] Seed RSSSource -\> ContentSource\
\[ \] Add pg-boss + worker service/process\
\[ \] Add generic discovery/detail/version/dedupe pipeline\
\[ \] Implement IRCC\
\[ \] Implement GOV.UK\
\[ \] Add AiAssessment + ArticleCandidate -\> Article bridge\
\[ \] Add Automated Sources admin screens\
\[ \] Shadow compare with legacy RSS\
\[ \] Cut over Canada + UK\
\[ \] Expand remaining Phase 1 waves\
\[ \] Retire legacy RSS routes after consumer audit
