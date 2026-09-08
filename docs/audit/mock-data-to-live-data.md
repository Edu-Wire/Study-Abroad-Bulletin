# Mock Data Audit — Public Pages Not Wired to the Database

Date: 2026-09-05

## Summary

The admin panel and backend APIs for Universities, Scholarships, Visa updates, and
Guides are fully implemented (real CRUD against Prisma/Postgres). The corresponding
**public-facing pages still import static arrays from `src/data/mock.ts`**, so nothing
an editor creates/edits in the admin panel ever appears on the public site for these
four content types. The homepage stats strip, "Most Read This Week", and "Trending
Topics" are also disconnected from real data.

Working counter-example: `src/app/countries/[slug]/page.tsx` and `src/lib/articles.ts`
already query `prisma` directly from server components — this is the pattern to copy.

## Findings

### A. Fully live (no action needed)
- Homepage Hero / Breaking Strip / Today's Briefing / Latest News — `src/app/page.tsx`
  via `getAllNews()` / `getBreakingArticle()` (`src/lib/articles.ts`), `Article` table,
  `status: PUBLISHED`.
- `src/app/news/[slug]/page.tsx` — `getArticleBySlug` / `getArticleBySlugForAdmin`.
- `src/app/countries/[slug]/page.tsx` — `prisma.country.findUnique` +
  `getPublishedArticlesByCountry(country.id)`.
- Admin dashboard pages (`src/app/admin/**`) — real `adminGet/Post/Put/Delete` calls
  against `/api/backend/admin/*`, full CRUD, no mocks.

### B. Hardcoded mock, admin CRUD already exists in the backend
| Public page | Imports mock from | Backend admin CRUD (real) | Backend public read route |
|---|---|---|---|
| `src/app/universities/page.tsx`, `src/components/home/FindYourUniversity.tsx` | `@/data/mock` `universities` | `backend/src/modules/universities` | `GET /` and `GET /:slug` already exist (`universities.routes.js:16-17`) — **only the frontend hasn't been switched over** |
| `src/app/universities/[slug]/page.tsx` | `@/data/mock` `universities, news` | same | same |
| `src/app/scholarships/page.tsx`, `[slug]/page.tsx` | `@/data/mock` `scholarships` | `backend/src/modules/scholarships` | **admin-only routes exist, no public list/detail route yet** — needs adding |
| `src/app/visa/page.tsx` | `@/data/mock` `visaUpdates` | Articles filtered by category=VISA via `/admin/articles` | Public articles are already readable via `getPublishedArticles()` filtered by category — no new backend route needed, just a new query helper |
| `src/app/guides/page.tsx`, `[slug]/page.tsx` | `@/data/mock` `guides` | Articles filtered by category=GUIDE via `/admin/articles` | same as visa — filter `getPublishedArticles()` by category |

### C. Fake/derived-wrong on the homepage
- `src/components/home/ServerSections.tsx:116-119` — Hero stats (`"1,240" Universities`,
  `"860" Scholarships`, `"120+" Updates/wk`) are **literal strings**, not a query. The
  admin dashboard already computes real counts (`src/app/admin/page.tsx:80-104`) —
  need a public equivalent (`prisma.university.count()`, `prisma.scholarship.count()`,
  a weekly-updates count) passed into `Hero`.
- `src/components/home/LatestNews.tsx:157` — "Most Read This Week" just reslices the
  latest-articles array; there's no view-count tracking in the schema at all. Out of
  scope for this pass (needs schema + tracking work) — will leave as "Latest" or drop
  the label's implication rather than fabricate a metric.
- `src/components/home/LatestNews.tsx:182-201` — "Trending Topics" is a hardcoded
  8-string array, links all go to the same static `/search` route. Will derive from
  real article tags/categories or drop the section — decide during implementation.

### D. Other mock imports found (lower priority / different scope)
- `src/components/common/Sidebar.tsx`, `SearchWithDropdown.tsx`, `src/app/search/page.tsx`,
  `src/app/dashboard/DashboardClient.tsx`, `src/components/cards/*.tsx` — these consume
  the same mock arrays as props/fallbacks. Once the page-level data source is swapped to
  real DB rows, these components should keep working unchanged as long as the shape
  (`Country`, `University`, `Scholarship`, `VisaUpdate`, `Guide`, `NewsArticle` types in
  `src/data/mock.ts`) is preserved by the new Prisma-backed query functions.
- `src/data/consultants.ts`, `src/data/immigrationDeadlines.ts` — separate mock modules,
  not touched by this pass (no admin CRUD backs them yet).

## Proposed solution (see implementation plan)

Follow the existing `getPublishedArticlesByCountry` / `prisma.country.findUnique`
pattern: add small server-side data-access functions that query Prisma directly from
Next.js server components (no need to round-trip through the Express admin API for
public reads), matching the exact field shape the existing UI components already
expect from `src/data/mock.ts`. Then swap each mock import for the new live query,
one content type at a time, and delete the corresponding dead arrays from
`src/data/mock.ts` once nothing imports them.

## Resolution (2026-09-05)

Sections B and C are resolved by `docs/superpowers/plans/2026-09-05-remove-mock-data.md`:
Universities, Scholarships, Visa, and Guides public pages now read live data; the
homepage stats strip and Explore Destinations use real counts.

**Still mock, explicitly out of scope for that plan:**
- `src/components/common/Sidebar.tsx` ("Trending this week", "Popular guides")
- `src/components/common/SearchWithDropdown.tsx` and `src/app/search/page.tsx` (client
  components — need a real search API route before they can drop `@/data/mock`, since
  client components can't query Prisma or the BFF secret directly)
- `src/components/home/ServerSections.tsx`'s `UpcomingDeadlines` (mixes
  university-intake and scholarship deadlines into one feed with no matching model —
  would need new aggregation logic across `UniversityIntake` and `Scholarship.deadline`)
- `src/data/consultants.ts`, `src/data/immigrationDeadlines.ts` — no admin CRUD exists
  for these yet.

The five mock arrays (`universities`, `scholarships`, `visaUpdates`, `guides`,
`countries`) in `src/data/mock.ts` are still exported and still imported by the files
above — do not delete them until those follow-ups land.