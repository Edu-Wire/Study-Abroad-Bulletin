# Remove Mock Data From Public Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static arrays in `src/data/mock.ts` that back the public Universities, Scholarships, Visa, and Guides pages (plus the homepage stats strip and destination list) with live Prisma-backed data, so content created in the admin panel actually appears on the public site.

**Architecture:** Two existing, working patterns already cover this app and neither needs to be invented:
1. **BFF fetch** (`src/lib/server/countries.ts`, `src/lib/server/universities.ts` — the latter already exists and is unused) — a server-only function `fetch()`s a public Express route (`/api/countries/public`, `/api/universities`) with the shared BFF secret, used for content types that have their own admin-managed Express module (Universities, Scholarships, Countries).
2. **Direct Prisma** (`src/lib/articles.ts`) — server components query `prisma` directly for content that is just the `Article` table filtered by category (Visa, Guides — both are just `Article.category` values, not separate models).

This plan adds the one missing piece (a public Scholarships route, mirroring the existing public Universities route byte-for-byte) and then wires each public page from `@/data/mock` static arrays to these live sources, one content type per task.

**Tech Stack:** Next.js App Router (server components), Express + Prisma backend, existing BFF secret-header pattern.

**Spec:** `docs/audit/mock-data-to-live-data.md`

## Global Constraints

- Preserve the exact TypeScript shapes already exported from `@/data/mock` (`University`, `Scholarship`, `VisaUpdate`, `Guide`, `Country` — defined in `src/contracts/*.ts`) so `UniversityCard`, `ScholarshipCard`, `GuideCard`, `VisaUpdateCard`, `CountryCard`, and `CompactNewsCard` keep working with zero changes.
- Do **not** delete any array from `src/data/mock.ts` in this plan. `src/app/search/page.tsx`, `src/components/common/SearchWithDropdown.tsx`, and `src/components/common/Sidebar.tsx` still read `universities`, `scholarships`, `countries`, `guides`, `trending`, and `popularGuides` directly and are explicitly out of scope (see Task 8's follow-up note) — removing the arrays would break the build.
- Do **not** touch `src/data/consultants.ts` or `src/data/immigrationDeadlines.ts`, and do not change `UpcomingDeadlines`'s use of the `deadlines` mock array — there is no admin CRUD backing a unified deadline feed yet, so this is out of scope (flagged as a follow-up, not implemented).
- Every page touched gets `export const dynamic = "force-dynamic";` (matching `src/app/page.tsx` and `src/app/countries/page.tsx`) since content now comes from the admin panel and must not be cached/statically frozen at build time. Remove any `generateStaticParams` that assumed a fixed mock list.
- Verify every task by actually running the app (`npm run dev`) and loading the real page in a browser — this project's AGENTS.md requires verifying UI changes visually, not just via `tsc`.

---

### Task 1: Add a public Scholarships API route (backend)

Universities and Countries each have a public, unauthenticated Express route; Scholarships only has admin routes today (`backend/src/modules/scholarships/scholarships.routes.js` currently has a comment saying "scholarships are surfaced publicly via the country detail page" — that's no longer sufficient since `/scholarships` needs the full cross-country list). This task adds `GET /api/scholarships` and `GET /api/scholarships/:slug`, mirroring `backend/src/modules/universities/universities.repository.js` / `.service.js` / `.controller.js` / `.routes.js` exactly.

**Files:**
- Modify: `backend/src/modules/scholarships/scholarships.repository.js`
- Modify: `backend/src/modules/scholarships/scholarships.service.js`
- Modify: `backend/src/modules/scholarships/scholarships.controller.js`
- Modify: `backend/src/modules/scholarships/scholarships.routes.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- Produces: `GET /api/scholarships` → `{ success: true, scholarships: Scholarship[] }`; `GET /api/scholarships/:slug` → `{ success: true, scholarship: Scholarship }` or 404. `Scholarship` shape matches `scholarshipSelect` in the repository (same fields the admin route already returns, keyed by `slug` instead of `id` for the detail lookup).

- [ ] **Step 1: Add public repository queries**

In `backend/src/modules/scholarships/scholarships.repository.js`, add below the existing `scholarshipSelect` constant (keep everything else in the file unchanged):

```js
export async function listPublicScholarships() {
  return prisma.scholarship.findMany({
    select: scholarshipSelect,
    orderBy: { deadline: "asc" },
  });
}

export async function findPublicScholarshipBySlug(slug) {
  return prisma.scholarship.findUnique({
    where: { slug },
    select: scholarshipSelect,
  });
}
```

- [ ] **Step 2: Add public service functions**

In `backend/src/modules/scholarships/scholarships.service.js`, add (the `toPublicScholarship` mapper already at the top of the file is reused as-is):

```js
export async function getPublicScholarships(repository = scholarshipRepository) {
  const scholarships = await repository.listPublicScholarships();
  return scholarships.map(toPublicScholarship);
}

export async function getPublicScholarship(slug, repository = scholarshipRepository) {
  const scholarship = await repository.findPublicScholarshipBySlug(slug);
  return scholarship ? toPublicScholarship(scholarship) : null;
}
```

- [ ] **Step 3: Add public controller methods**

In `backend/src/modules/scholarships/scholarships.controller.js`, add `getPublicScholarships, getPublicScholarship` to both the import list from `./scholarships.service.js` and the `service = {...}` default object, then add these two methods to the returned controller object (alongside `adminList`, `adminDetail`, etc.):

```js
list: async (_req, res) => {
  try {
    const scholarships = await service.getPublicScholarships();
    return res.status(200).json({ success: true, scholarships });
  } catch (error) {
    console.error("Fetch public scholarships error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch scholarships." });
  }
},

detail: async (req, res) => {
  try {
    const scholarship = await service.getPublicScholarship(req.params.slug);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: "Scholarship not found." });
    }
    return res.status(200).json({ success: true, scholarship });
  } catch (error) {
    console.error("Fetch public scholarship error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch scholarship." });
  }
},
```

- [ ] **Step 4: Add the public router**

In `backend/src/modules/scholarships/scholarships.routes.js`, add a new exported function (keep `createAdminScholarshipsRouter` and its comment as-is, just delete the now-inaccurate "There is no separate public router yet" sentence from that comment):

```js
/** Public read-only routes, mounted at /api/scholarships. */
export function createScholarshipsRouter(options) {
  const router = Router();
  const controller = createScholarshipsController(options);

  router.get("/", controller.list);
  router.get("/:slug", controller.detail);

  return router;
}
```

- [ ] **Step 5: Mount the public router**

In `backend/src/server.js`, change the import on line 56 from:

```js
import { createAdminScholarshipsRouter } from "./modules/scholarships/scholarships.routes.js";
```

to:

```js
import { createScholarshipsRouter, createAdminScholarshipsRouter } from "./modules/scholarships/scholarships.routes.js";
```

and add a new mount line next to the existing `/api/universities` and `/api/admin/scholarships` lines (around line 104-108):

```js
app.use("/api/scholarships", createScholarshipsRouter());
```

- [ ] **Step 6: Verify by running the backend and hitting the route directly**

Run: `npm run dev` (or whatever starts the Express backend per this repo's root `package.json`), then in a second terminal:

```bash
curl -s http://localhost:$PORT/api/scholarships | head -c 500
```

(substitute the backend's actual port from `backend/.env` / `BACKEND_URL`). Expected: `{"success":true,"scholarships":[...]}` with at least the scholarships seeded via the admin panel. Also hit `/api/scholarships/<a-real-slug>` and confirm a single `scholarship` object comes back, and a made-up slug returns 404.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/scholarships/scholarships.repository.js backend/src/modules/scholarships/scholarships.service.js backend/src/modules/scholarships/scholarships.controller.js backend/src/modules/scholarships/scholarships.routes.js backend/src/server.js
git commit -m "feat(backend): add public GET /api/scholarships routes"
```

---

### Task 2: Frontend BFF fetchers for Universities and Scholarships

`src/lib/server/universities.ts` already exists (`getUniversities()`, `getUniversity(slug)`) but is unused by any page, and its return type (`University` from `src/contracts/api.ts`) doesn't declare the `country` object the backend actually includes (`country: { select: countrySelect }` in `universities.repository.js`) — only `countryId`. This task fixes that type gap, adds the matching `scholarships.ts` fetcher, and adds small mapper functions that convert the API DTOs into the exact `University`/`Scholarship` shapes `@/data/mock` already exports (so downstream components need zero changes).

**Files:**
- Modify: `src/contracts/api.ts`
- Modify: `src/lib/server/universities.ts`
- Create: `src/lib/server/scholarships.ts`

**Interfaces:**
- Consumes: `getBackendUrl()`, `getBffSharedSecret()` from `./backendConfig` (existing).
- Produces: `getUniversities(): Promise<ApiUniversity[]>`, `getUniversity(slug): Promise<ApiUniversity | null>` (unchanged signatures), plus new `toFrontendUniversity(u: ApiUniversity): FrontendUniversity`. `getScholarships(): Promise<ApiScholarship[]>`, `getScholarship(slug): Promise<ApiScholarship | null>`, `toFrontendScholarship(s: ApiScholarship): FrontendScholarship`. `FrontendUniversity`/`FrontendScholarship` are the types from `@/data/mock` (i.e. `import type { University, Scholarship } from "@/data/mock"`).

- [ ] **Step 1: Add the missing `country` field to the API University type**

In `src/contracts/api.ts`, in the `University` type (currently listing `countryId: string;`), add the field the backend already returns:

```ts
export type University = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  countryId: string;
  country: CountrySummary;
  city: string;
  ranking: number;
  tuition: string;
  tuitionValue: number;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: string;
  ielts: string;
};
```

- [ ] **Step 2: Add a frontend mapper to `src/lib/server/universities.ts`**

Append to the end of the existing file (keep `getUniversities`/`getUniversity` unchanged):

```ts
import type { University as FrontendUniversity } from "@/data/mock";

/** Maps the API DTO to the shape UniversityCard/FindYourUniversity already expect. */
export function toFrontendUniversity(u: University): FrontendUniversity {
  return {
    id: u.slug,
    name: u.name,
    initials: u.initials,
    country: u.country.name,
    city: u.city,
    ranking: u.ranking,
    tuition: u.tuition,
    tuitionValue: u.tuitionValue,
    courses: u.courses,
    scholarships: u.scholarships,
    intake: u.intake,
    degree: (u.degree === "Bachelors" || u.degree === "Masters" ? u.degree : "Both"),
    ielts: u.ielts,
  };
}
```

- [ ] **Step 2: Run the type checker to confirm the DTO change didn't break anything**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `University` from `src/contracts/api.ts` (the admin university pages already select `country` off the same API response elsewhere, so this only adds a field, it doesn't remove one).

- [ ] **Step 3: Create `src/lib/server/scholarships.ts`**

```ts
import "server-only";

import type { Scholarship } from "@/contracts/api";
import type { Scholarship as FrontendScholarship } from "@/data/mock";
import { getBackendUrl, getBffSharedSecret } from "./backendConfig";

const SERVICE_READER_HEADER = "x-bff-service-reader";
const SERVICE_READER_VALUE = "1";

type ScholarshipsResponse = {
  success?: boolean;
  scholarships?: Scholarship[];
};

/** Load the public scholarship catalogue through the server-side BFF boundary. */
export async function getScholarships(): Promise<Scholarship[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/scholarships`, {
      headers: {
        accept: "application/json",
        "x-bff-secret": getBffSharedSecret(),
        [SERVICE_READER_HEADER]: SERVICE_READER_VALUE,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as ScholarshipsResponse;
    return data.success && Array.isArray(data.scholarships) ? data.scholarships : [];
  } catch (error) {
    console.error("[scholarships] failed to load public scholarships:", error);
    return [];
  }
}

export async function getScholarship(slug: string): Promise<Scholarship | null> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/scholarships/${encodeURIComponent(slug)}`,
      {
        headers: {
          accept: "application/json",
          "x-bff-secret": getBffSharedSecret(),
          [SERVICE_READER_HEADER]: SERVICE_READER_VALUE,
        },
        cache: "no-store",
      },
    );

    if (response.status === 404) return null;
    if (!response.ok) return null;

    const data = (await response.json()) as { success?: boolean; scholarship?: Scholarship };
    return data.success && data.scholarship ? data.scholarship : null;
  } catch (error) {
    console.error(`[scholarships] failed to load scholarship ${slug}:`, error);
    return null;
  }
}

const TYPE_LABEL: Record<Scholarship["type"], FrontendScholarship["type"]> = {
  FULLY_FUNDED: "Fully Funded",
  PARTIAL: "Partial",
  TUITION_WAIVER: "Tuition Waiver",
};

function daysUntil(deadline: string | null): number {
  if (!deadline) return 999;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/** Maps the API DTO to the shape ScholarshipCard already expects. */
export function toFrontendScholarship(s: Scholarship): FrontendScholarship {
  return {
    id: s.slug,
    name: s.name,
    organization: s.organization,
    country: s.destinations[0]?.country.name ?? "Global",
    funding: s.funding,
    degree: s.degree,
    deadline: s.deadlineString,
    daysLeft: daysUntil(s.deadline),
    eligibility: s.eligibility,
    type: TYPE_LABEL[s.type],
  };
}
```

- [ ] **Step 4: Run the type checker again**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/server/scholarships.ts` or `src/lib/server/universities.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/contracts/api.ts src/lib/server/universities.ts src/lib/server/scholarships.ts
git commit -m "feat: add server-side scholarship fetcher and university/scholarship frontend mappers"
```

---

### Task 3: Wire the Universities public pages to live data

**Files:**
- Modify: `src/components/home/FindYourUniversity.tsx`
- Modify: `src/app/universities/page.tsx`
- Modify: `src/app/universities/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getUniversities()`, `getUniversity(slug)`, `toFrontendUniversity()` from `@/lib/server/universities` (Task 2). `getPublishedArticlesByCountry(countryId, limit)` from `@/lib/articles` (existing).

- [ ] **Step 1: Make `FindYourUniversity` accept data as a prop**

In `src/components/home/FindYourUniversity.tsx`, replace the mock import and hardcode the component to receive its data:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { University } from "@/data/mock";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SearchBar } from "@/components/common/SearchBar";
import { UniversityCard } from "@/components/cards/UniversityCard";

interface FindYourUniversityProps {
  universities: University[];
}

export function FindYourUniversity({ universities }: FindYourUniversityProps) {
  const uniFilters = {
    Country: ["All", ...new Set(universities.map((u) => u.country))],
    City: ["All", ...new Set(universities.map((u) => u.city))],
    Course: ["All", ...new Set(universities.flatMap((u) => u.courses))],
    Degree: ["All", "Bachelors", "Masters", "Both"],
    Tuition: ["All", "Under 20,000", "20,000 – 40,000", "Over 40,000"],
    Ranking: ["All", "Top 25", "Top 50", "Top 100"],
    Intake: ["All", ...new Set(universities.map((u) => u.intake))],
    Scholarships: ["All", "Available"],
  } as const;

  type FilterKey = keyof typeof uniFilters;

  const defaultFilters: Record<FilterKey, string> = {
    Country: "All",
    City: "All",
    Course: "All",
    Degree: "All",
    Tuition: "All",
    Ranking: "All",
    Intake: "All",
    Scholarships: "All",
  };

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters);
```

Keep everything from the original `const results = useMemo(...)` line through the end of the file **exactly as it is today** — only the top of the component (imports, the `uniFilters`/`defaultFilters` construction now reading from the `universities` prop, and the function signature) changes. Delete the old top-level `const uniFilters = {...}` and `const defaultFilters = {...}` that referenced the module-level mock import.

- [ ] **Step 2: Wire `src/app/universities/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { FindYourUniversity } from "@/components/home/FindYourUniversity";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getUniversities, toFrontendUniversity } from "@/lib/server/universities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Universities — Search & Compare Global Universities",
  description:
    "Search and compare universities worldwide by country, course, ranking and tuition. Find your perfect university match.",
};

export default async function UniversitiesPage() {
  const universities = (await getUniversities()).map(toFrontendUniversity);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 min-w-0 w-full max-w-full overflow-x-clip">
      <Header />
      <main className="min-w-0">
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5 min-w-0">
            <p className="eyebrow text-primary">University Discovery</p>
            <h1 className="mt-1 font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground break-words">
              Find Your University
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Search and compare universities across eight countries. Filter by course,
              ranking, tuition and intake to find your perfect match.
            </p>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3 min-w-0">
            <AdBanner slot="universities-listing-top" format="leaderboard" />
          </div>
        </div>

        {/* University discovery with filters */}
        <FindYourUniversity universities={universities} />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Wire `src/app/universities/[slug]/page.tsx`**

Replace the mock import and lookups. Key changes: `generateStaticParams` is removed (the list is no longer known at build time), `generateMetadata` and the page both call `getUniversity(slug)` directly, and "Related news" now uses the real `countryId` via `getPublishedArticlesByCountry` instead of matching on a country display string, and "More Universities" uses the full live list filtered client-side (server-rendered, just a plain array filter):

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdSidebar } from "@/components/editorial/AdComponents";
import { CompactNewsCard } from "@/components/cards/NewsCards";
import { getUniversities, getUniversity, toFrontendUniversity } from "@/lib/server/universities";
import { getPublishedArticlesByCountry } from "@/lib/articles";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const apiUni = await getUniversity(slug);
  if (!apiUni) return { title: "University not found" };
  const uni = toFrontendUniversity(apiUni);
  return {
    title: `${uni.name} — Rankings, Tuition & Admissions`,
    description: `${uni.name} in ${uni.city}, ${uni.country}. World rank #${uni.ranking}. Tuition: ${uni.tuition}.`,
  };
}

export default async function UniversityProfilePage({ params }: Props) {
  const { slug } = await params;
  const apiUni = await getUniversity(slug);
  if (!apiUni) notFound();
  const uni = toFrontendUniversity(apiUni);

  const [relatedNews, allApiUniversities] = await Promise.all([
    getPublishedArticlesByCountry(apiUni.countryId, 3),
    getUniversities(),
  ]);
  const otherUniversities = allApiUniversities
    .map(toFrontendUniversity)
    .filter((u) => u.id !== uni.id)
    .slice(0, 5);
```

Keep the entire JSX body from the original file **exactly as it is today** below this point — it already reads `uni.name`, `uni.city`, `uni.courses`, etc. The only other change needed inside the JSX: replace the "More Universities" block's data source

```tsx
{universities
  .filter((u) => u.id !== uni.id)
  .slice(0, 5)
  .map((u) => (
```

with

```tsx
{otherUniversities.map((u) => (
```

(remove the now-redundant `.filter(...).slice(...)` chain since `otherUniversities` is already filtered/sliced above).

- [ ] **Step 4: Wire the homepage's `FindYourUniversity` usage**

In `src/app/page.tsx`, add the import `import { getUniversities, toFrontendUniversity } from "@/lib/server/universities";`, fetch it alongside the existing `Promise.all` for articles:

```tsx
const [articles, breakingArticle, apiUniversities] = await Promise.all([
  getAllNews(),
  getBreakingArticle(),
  getUniversities(),
]);
const universities = apiUniversities.map(toFrontendUniversity);
```

and change `<FindYourUniversity />` to `<FindYourUniversity universities={universities} />`.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, then open `http://localhost:3000/universities` — confirm the filter dropdowns and result cards reflect real admin-created universities (not the 8 mock ones: Toronto, UBC, Manchester, Birmingham, Melbourne, TUM, Trinity, Amsterdam — unless those happen to also exist as real seeded rows). Click into a university detail page and confirm "Related news" and "More Universities" load without error. Also reload `/` and confirm the "Find Your University" section on the homepage shows the same live data.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/FindYourUniversity.tsx src/app/universities/page.tsx "src/app/universities/[slug]/page.tsx" src/app/page.tsx
git commit -m "feat: wire public university pages to live Prisma data instead of mock.ts"
```

---

### Task 4: Wire the Scholarships public pages to live data

**Files:**
- Modify: `src/app/scholarships/page.tsx`
- Modify: `src/app/scholarships/[slug]/page.tsx`
- Modify: `src/components/home/ServerSections.tsx` (`ScholarshipSpotlight`)
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getScholarships()`, `getScholarship(slug)`, `toFrontendScholarship()` from `@/lib/server/scholarships` (Task 2).

- [ ] **Step 1: Wire `src/app/scholarships/page.tsx`**

Replace `import { scholarships } from "@/data/mock";` with `import { getScholarships, toFrontendScholarship } from "@/lib/server/scholarships";`, add `export const dynamic = "force-dynamic";`, and change the component to:

```tsx
export default async function ScholarshipsPage() {
  const scholarships = (await getScholarships()).map(toFrontendScholarship);
  const closingSoon = scholarships
    .filter((s) => s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const open = scholarships.filter((s) => s.daysLeft > 14);
  const [highlight, ...rest] = open;
```

Keep the rest of the file (the entire returned JSX) unchanged — it already reads `s.name`, `s.country`, `s.daysLeft`, etc. from these same local variables.

- [ ] **Step 2: Wire `src/app/scholarships/[slug]/page.tsx`**

Replace the mock import/lookups and drop `generateStaticParams`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdSidebar } from "@/components/editorial/AdComponents";
import { getScholarships, getScholarship, toFrontendScholarship } from "@/lib/server/scholarships";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const apiScholarship = await getScholarship(slug);
  if (!apiScholarship) return { title: "Scholarship not found" };
  const s = toFrontendScholarship(apiScholarship);
  return {
    title: `${s.name} — ${s.organization}`,
    description: `${s.type} scholarship for ${s.degree} students in ${s.country}. Deadline: ${s.deadline}.`,
  };
}

export default async function ScholarshipDetailPage({ params }: Props) {
  const { slug } = await params;
  const apiScholarship = await getScholarship(slug);
  if (!apiScholarship) notFound();
  const s = toFrontendScholarship(apiScholarship);

  const closingSoon = s.daysLeft <= 14;
  const related = (await getScholarships())
    .map(toFrontendScholarship)
    .filter((sc) => sc.id !== s.id)
    .slice(0, 4);
```

Keep the entire returned JSX below this point exactly as it is today.

- [ ] **Step 3: Make `ScholarshipSpotlight` accept data as a prop**

In `src/components/home/ServerSections.tsx`, remove `scholarships` from the top-level `import { ... } from "@/data/mock";` list and add `import type { Scholarship } from "@/data/mock";` near the other type-only imports. Change the function signature:

```tsx
interface ScholarshipSpotlightProps {
  scholarships: Scholarship[];
}

export function ScholarshipSpotlight({ scholarships }: ScholarshipSpotlightProps) {
  const closingSoon = scholarships
    .filter((s) => s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const featured = scholarships.filter((s) => s.daysLeft > 14).slice(0, 3);
  const highlightedScholarship = featured[0];
```

The JSX body is unchanged.

- [ ] **Step 4: Wire the homepage**

In `src/app/page.tsx`, add `import { getScholarships, toFrontendScholarship } from "@/lib/server/scholarships";`, fetch it in the same `Promise.all`:

```tsx
const [articles, breakingArticle, apiUniversities, apiScholarships] = await Promise.all([
  getAllNews(),
  getBreakingArticle(),
  getUniversities(),
  getScholarships(),
]);
const universities = apiUniversities.map(toFrontendUniversity);
const scholarships = apiScholarships.map(toFrontendScholarship);
```

and change `<ScholarshipSpotlight />` to `<ScholarshipSpotlight scholarships={scholarships} />`.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, open `/scholarships` and confirm the featured scholarship, "Open Scholarships" grid, and "Closing Soon" section show real admin-created scholarships with a correctly computed `daysLeft`. Click into a scholarship detail page. Reload `/` and confirm "Scholarship Spotlight" also shows live data.

- [ ] **Step 6: Commit**

```bash
git add src/app/scholarships/page.tsx "src/app/scholarships/[slug]/page.tsx" src/components/home/ServerSections.tsx src/app/page.tsx
git commit -m "feat: wire public scholarship pages to live Prisma data instead of mock.ts"
```

---

### Task 5: Visa updates — live data from the `Article` table

Visa updates are just `Article` rows with `category: "VISA"` — there is no separate Visa model, so this reuses the existing direct-Prisma pattern in `src/lib/articles.ts` instead of the BFF pattern (no new Express route needed).

**Files:**
- Modify: `src/lib/articles.ts`
- Modify: `src/app/visa/page.tsx`
- Modify: `src/components/home/ServerSections.tsx` (`VisaUpdatesSection`)
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `getPublishedVisaUpdates(): Promise<VisaUpdate[]>` in `src/lib/articles.ts`, where `VisaUpdate` is `import type { VisaUpdate } from "@/data/mock"`.

- [ ] **Step 1: Add `getPublishedVisaUpdates` to `src/lib/articles.ts`**

Add near the bottom of the file, after `getArticleBySlug` and before the `AdminArticleRaw` section:

```ts
import type { VisaUpdate } from "@/data/mock";

/**
 * Returns PUBLISHED articles in the VISA category, mapped to the VisaUpdate
 * shape used by the /visa page and the homepage VisaUpdatesSection.
 *
 * `visaType` has no dedicated column on Article — every row is labelled with
 * a generic caption. `urgent` reuses the existing `breaking` flag rather than
 * adding a new schema field for what is functionally the same concept.
 */
export async function getPublishedVisaUpdates(limit?: number): Promise<VisaUpdate[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", category: "VISA" },
      include: { primaryCountry: true },
      orderBy: { publishedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });

    return rows.map((a) => ({
      id: a.slug,
      country: a.primaryCountry?.name ?? "Global",
      flag: a.primaryCountry?.flag ?? "🌐",
      visaType: "Visa & Immigration Update",
      headline: a.headline,
      date: formatPublishedDate(a.publishedAt),
      urgent: a.breaking,
    }));
  } catch (error) {
    console.error("[articles.ts] ❌ Failed to fetch visa updates from PostgreSQL:", error);
    return [];
  }
}
```

Move the `import type { VisaUpdate } from "@/data/mock";` line up to the top of the file next to the existing `import type { NewsArticle, NewsCategory } from "@/data/mock";` line instead of inline — keep the file's existing import style.

- [ ] **Step 2: Wire `src/app/visa/page.tsx`**

Replace `import { visaUpdates } from "@/data/mock";` with `import { getPublishedVisaUpdates } from "@/lib/articles";`, add `export const dynamic = "force-dynamic";`, and change:

```tsx
export default async function VisaPage() {
  const visaUpdates = await getPublishedVisaUpdates();
  const urgent = visaUpdates.filter((v) => v.urgent);
  const regular = visaUpdates.filter((v) => !v.urgent);
```

Keep everything else in the file (including the static `visaTableData` reference table, which is genuine editorial reference content, not mock article data) unchanged.

- [ ] **Step 3: Make `VisaUpdatesSection` accept data as a prop**

In `src/components/home/ServerSections.tsx`, remove `visaUpdates` from the `@/data/mock` import, add `import type { VisaUpdate } from "@/data/mock";`, and change:

```tsx
interface VisaUpdatesSectionProps {
  visaUpdates: VisaUpdate[];
}

export function VisaUpdatesSection({ visaUpdates }: VisaUpdatesSectionProps) {
```

JSX body unchanged.

- [ ] **Step 4: Wire the homepage**

In `src/app/page.tsx`, add `getPublishedVisaUpdates` to the `@/lib/articles` import, fetch it in the `Promise.all`, and pass it down:

```tsx
const [articles, breakingArticle, apiUniversities, apiScholarships, visaUpdates] = await Promise.all([
  getAllNews(),
  getBreakingArticle(),
  getUniversities(),
  getScholarships(),
  getPublishedVisaUpdates(),
]);
```

Change `<VisaUpdatesSection />` to `<VisaUpdatesSection visaUpdates={visaUpdates} />`.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, open `/visa` and confirm "Urgent Visa Updates" / "All Visa Updates" show real admin-created VISA-category articles (create one via the admin `/admin/visa` page if none exist yet, mark it breaking, confirm it shows under "Urgent"). Reload `/` and confirm the homepage "Visa & Immigration" section matches.

- [ ] **Step 6: Commit**

```bash
git add src/lib/articles.ts src/app/visa/page.tsx src/components/home/ServerSections.tsx src/app/page.tsx
git commit -m "feat: wire visa updates to live Article data instead of mock.ts"
```

---

### Task 6: Guides — live data from the `Article` table

Same situation as Visa: Guides are `Article` rows with `category: "GUIDES"`. The mock guides array has a rich sub-category per guide (SOP, IELTS, LOR, Accommodation...) that has no equivalent column on `Article` — this task intentionally collapses that to a single "Guides" grouping rather than inventing a new schema field, and simplifies the guides listing page's category-tab UI to match (a real sub-category field is a reasonable future addition, not needed to remove the mock dependency).

**Files:**
- Modify: `src/lib/articles.ts`
- Modify: `src/app/guides/page.tsx`
- Modify: `src/app/guides/[slug]/page.tsx`
- Modify: `src/components/home/ServerSections.tsx` (`GuidesSection`)
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `getPublishedGuides(limit?): Promise<Guide[]>` and `getGuideBySlug(slug): Promise<GuideDetail | null>` in `src/lib/articles.ts`, where `Guide` is `import type { Guide } from "@/data/mock"` and `GuideDetail` is a new local interface (`Guide` plus `content: string | null`).

- [ ] **Step 1: Add `getPublishedGuides` and `getGuideBySlug` to `src/lib/articles.ts`**

```ts
import type { Guide } from "@/data/mock";

/**
 * Returns PUBLISHED articles in the GUIDES category, mapped to the Guide
 * shape used by the /guides listing page and the homepage GuidesSection.
 *
 * All guides share one `category` label ("Guides") — Article has no
 * sub-category column (SOP/IELTS/etc. from the old mock data), so the
 * listing page's per-topic grouping is dropped in favour of one flat list.
 */
export async function getPublishedGuides(limit?: number): Promise<Guide[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", category: "GUIDES" },
      orderBy: { publishedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });

    return rows.map((a) => ({
      id: a.slug,
      category: "Guides",
      title: a.headline,
      description: a.summary,
      readingTime: a.readingTime,
    }));
  } catch (error) {
    console.error("[articles.ts] ❌ Failed to fetch guides from PostgreSQL:", error);
    return [];
  }
}

export interface GuideDetail extends Guide {
  content: string | null;
}

export async function getGuideBySlug(slug: string): Promise<GuideDetail | null> {
  try {
    const row = await prisma.article.findFirst({
      where: { slug, status: "PUBLISHED", category: "GUIDES" },
    });
    if (!row) return null;

    return {
      id: row.slug,
      category: "Guides",
      title: row.headline,
      description: row.summary,
      readingTime: row.readingTime,
      content: row.content,
    };
  } catch (error) {
    console.error(`[articles.ts] ❌ Failed to fetch guide "${slug}" from PostgreSQL:`, error);
    return null;
  }
}
```

Add `import type { Guide } from "@/data/mock";` to the top of the file next to the other `@/data/mock` type imports.

- [ ] **Step 2: Wire `src/app/guides/page.tsx` (flat list, no sub-category grouping)**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { GuideCard } from "@/components/cards/MiscCards";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getPublishedGuides } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Study Abroad Guides — SOP, Visa, IELTS, Scholarships & More",
  description:
    "Practical, step-by-step guides for international students. Covering SOPs, visa applications, IELTS preparation, accommodation, scholarships and careers.",
};

export default async function GuidesPage() {
  const guides = await getPublishedGuides();

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5">
            <p className="eyebrow text-primary">Resources</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Study Abroad Guides
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Practical, step-by-step guidance from shortlisting to arrival. Written for
              international students at every stage of the journey.
            </p>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="guides-listing-top" format="leaderboard" />
          </div>
        </div>

        {/* All guides */}
        <div className="shell py-10 lg:py-14">
          <SectionHeading eyebrow="The Student Guide" title="All Guides" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </div>

        {/* Popular topics */}
        <div className="border-t border-border bg-surface">
          <div className="shell py-10">
            <div className="section-rule mb-3" />
            <div className="mt-3 mb-6">
              <h2 className="font-display text-2xl font-extrabold text-foreground">
                Popular Guide Topics
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "SOP Writing", "LOR Guide", "IELTS Preparation", "TOEFL Tips",
                "University Shortlisting", "Application Process", "Student Visa",
                "Part-Time Jobs", "Accommodation Guide", "Cost of Living",
                "Scholarships", "Post-Study Work", "Career Guidance",
              ].map((topic) => (
                <Link
                  key={topic}
                  href="/guides"
                  className="border border-border bg-background px-4 py-2 eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {topic}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
```

(The category nav bar and per-category `grouped` sections are removed — there is only one real category. The "Popular Guide Topics" tag cloud stays as static editorial navigation copy, unchanged, since it's not sourced from `guides` data even in the original mock version — every tag already links to the same `/guides` route.)

- [ ] **Step 3: Wire `src/app/guides/[slug]/page.tsx`, rendering real content**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { getPublishedGuides, getGuideBySlug } from "@/lib/articles";
import { AdSidebar, InlineAd } from "@/components/editorial/AdComponents";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.title} — Study Abroad Guide`,
    description: guide.description,
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const allGuides = (await getPublishedGuides()).filter((g) => g.id !== slug);
  const moreGuides = allGuides.slice(0, 6);

  const bodyParagraphs = guide.content
    ? guide.content
        .replace(/<\/?(p|div|br)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        <article>
          {/* Guide header */}
          <header className="border-b border-border bg-background">
            <div className="shell py-8 lg:py-10">
              <nav className="mb-5 flex items-center gap-2 eyebrow text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <span>·</span>
                <Link href="/guides" className="hover:text-primary transition-colors">Guides</Link>
                <span>·</span>
                <span className="text-foreground">{guide.category}</span>
              </nav>

              <span className="eyebrow text-primary">{guide.category}</span>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {guide.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
              <p className="meta mt-4 text-muted-foreground">
                By Editorial Team
                <span className="mx-1.5 opacity-40">·</span>
                {guide.readingTime}
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="shell py-10 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Article body */}
              <div className="min-w-0 lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
                <div className="article-prose">
                  {bodyParagraphs.length > 0 ? (
                    bodyParagraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
                  ) : (
                    <p>{guide.description}</p>
                  )}
                </div>

                {/* Inline ad */}
                <InlineAd slot="guide-detail-inline-01" />

                {/* More guides */}
                {moreGuides.length > 0 && (
                  <div className="mt-12 border-t border-border pt-8">
                    <div className="section-rule mb-3" />
                    <div className="mt-3">
                      <h2 className="font-display text-2xl font-extrabold text-foreground">
                        More Guides
                      </h2>
                    </div>
                    <div className="mt-6 divide-y divide-border">
                      {moreGuides.map((g) => (
                        <Link
                          key={g.id}
                          href={`/guides/${g.id}`}
                          className="group flex items-start justify-between gap-4 py-4"
                        >
                          <div>
                            <span className="eyebrow text-primary">{g.category}</span>
                            <p className="mt-1 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                              {g.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{g.description}</p>
                          </div>
                          <span className="eyebrow text-muted-foreground shrink-0">{g.readingTime}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4 lg:pl-8">
                <div className="border border-border bg-surface p-5">
                  <p className="eyebrow text-muted-foreground mb-4">Guide Details</p>
                  <dl className="divide-y divide-border">
                    <div className="flex justify-between py-2.5">
                      <dt className="eyebrow text-muted-foreground">Category</dt>
                      <dd className="text-sm font-semibold text-foreground">{guide.category}</dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="eyebrow text-muted-foreground">Reading Time</dt>
                      <dd className="text-sm font-semibold text-foreground">{guide.readingTime}</dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="eyebrow text-muted-foreground">Author</dt>
                      <dd className="text-sm font-semibold text-foreground">Editorial Team</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-8">
                  <AdSidebar slot="guide-detail-sidebar" format="rectangle" />
                </div>
              </aside>
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
```

(The old page's hardcoded "Getting Started / Key Considerations / Expert Tips" filler paragraphs and the fake "In This Guide" table of contents are removed — they were placeholder copy standing in for the real `content` field, which is now rendered directly, same as the news article detail page.)

- [ ] **Step 4: Make `GuidesSection` accept data as a prop**

In `src/components/home/ServerSections.tsx`, remove `guides` from the `@/data/mock` import, add `import type { Guide } from "@/data/mock";`, and change:

```tsx
interface GuidesSectionProps {
  guides: Guide[];
}

export function GuidesSection({ guides }: GuidesSectionProps) {
  const [featured, ...supporting] = guides;
```

JSX body unchanged.

- [ ] **Step 5: Wire the homepage**

In `src/app/page.tsx`, add `getPublishedGuides` to the `@/lib/articles` import, fetch it (limit 7, since the section only ever shows 1 featured + 6 supporting), and pass it down:

```tsx
const [articles, breakingArticle, apiUniversities, apiScholarships, visaUpdates, guides] = await Promise.all([
  getAllNews(),
  getBreakingArticle(),
  getUniversities(),
  getScholarships(),
  getPublishedVisaUpdates(),
  getPublishedGuides(7),
]);
```

Change `<GuidesSection />` to `<GuidesSection guides={guides} />`.

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`, open `/guides` and confirm real admin-created GUIDES-category articles show in a single flat grid (create one via `/admin/guides` if none exist, with real `content`). Click into a guide detail page and confirm the body renders the real article content (not the old "This is demo editorial content..." filler). Reload `/` and confirm the homepage "Study Abroad Guides" section matches.

- [ ] **Step 7: Commit**

```bash
git add src/lib/articles.ts src/app/guides/page.tsx "src/app/guides/[slug]/page.tsx" src/components/home/ServerSections.tsx src/app/page.tsx
git commit -m "feat: wire guides to live Article data and render real content instead of mock.ts"
```

---

### Task 7: Homepage stats strip and Explore Destinations

The Hero stats strip ("1,240 Universities / 860 Scholarships / 120+ Updates/wk") is hardcoded. By this point in the plan, `src/app/page.tsx` already fetches the full live `universities`, `scholarships`, and `articles` (news) arrays for other sections — the counts are free (`.length`), no new query needed. Separately, `ExploreDestinations` still reads the mock `countries` array even though `src/lib/server/countries.ts` (`getCountries()`) already exists and is used correctly by `/countries` — this task fixes that inconsistency too.

**Files:**
- Modify: `src/components/home/ServerSections.tsx` (`Hero`, `ExploreDestinations`)
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getCountries()` from `@/lib/server/countries` (existing, already used by `src/app/countries/page.tsx`).

- [ ] **Step 1: Make `Hero` accept a `stats` prop**

In `src/components/home/ServerSections.tsx`, change the `Hero` component:

```tsx
interface HeroStats {
  universities: number;
  scholarships: number;
  updatesThisWeek: number;
}

interface HeroProps {
  articles: NewsArticle[];
  stats: HeroStats;
}

export function Hero({ articles, stats }: HeroProps) {
  const [lead, second, third, fourth, fifth] = articles;
  if (!lead) return null;
  const editionDate = getEditionDate();
```

and replace the hardcoded stats-strip array:

```tsx
{[
  { value: "1,240", label: "Universities" },
  { value: "860", label: "Scholarships" },
  { value: "120+", label: "Updates / wk" },
].map(({ value, label }, i) => (
```

with:

```tsx
{[
  { value: stats.universities.toLocaleString("en-US"), label: "Universities" },
  { value: stats.scholarships.toLocaleString("en-US"), label: "Scholarships" },
  { value: `${stats.updatesThisWeek}`, label: "Updates / wk" },
].map(({ value, label }, i) => (
```

- [ ] **Step 2: Make `ExploreDestinations` accept a `countries` prop**

In `src/components/home/ServerSections.tsx`, remove `countries` from the `@/data/mock` import and add `import type { Country } from "@/contracts/api";`. Change:

```tsx
interface ExploreDestinationsProps {
  countries: Country[];
}

export function ExploreDestinations({ countries }: ExploreDestinationsProps) {
```

The JSX references `country.id`, `country.name`, `country.universities`, `country.averageTuition`, `country.popularIntake` — the API `Country` type (from `src/contracts/api.ts`) has `universitiesCount`/`updatesCount` instead of `universities`/`updates`. Update the one place that reads `country.universities` (the "More Destinations" compact list):

```tsx
<p className="eyebrow text-muted-foreground mt-0.5">{country.universities} universities</p>
```

becomes:

```tsx
<p className="eyebrow text-muted-foreground mt-0.5">{country.universitiesCount} universities</p>
```

(`CountryCard` already handles both shapes — check `src/components/cards/CountryCard.tsx`'s prop type; if it's typed against the mock `Country` shape, pass the same field-renamed object `src/app/countries/page.tsx` already builds: `{ ...country, universities: country.universitiesCount, updates: country.updatesCount }`, mirroring that page exactly, instead of changing `CountryCard` itself.)

- [ ] **Step 3: Wire the homepage**

In `src/app/page.tsx`, add `import { getCountries } from "@/lib/server/countries";`, fetch it in the `Promise.all`, compute the three Hero stats and the `CountryCard`-shaped countries list, and pass everything down:

```tsx
const [articles, breakingArticle, apiUniversities, apiScholarships, visaUpdates, guides, apiCountries] =
  await Promise.all([
    getAllNews(),
    getBreakingArticle(),
    getUniversities(),
    getScholarships(),
    getPublishedVisaUpdates(),
    getPublishedGuides(7),
    getCountries(),
  ]);
const universities = apiUniversities.map(toFrontendUniversity);
const scholarships = apiScholarships.map(toFrontendScholarship);
const countries = apiCountries.map((c) => ({
  ...c,
  universities: c.universitiesCount,
  updates: c.updatesCount,
}));

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const heroStats = {
  universities: universities.length,
  scholarships: scholarships.length,
  updatesThisWeek: articles.filter((a) => new Date(a.date) >= sevenDaysAgo).length,
};
```

Change `<Hero articles={articles} />` to `<Hero articles={articles} stats={heroStats} />`, and `<ExploreDestinations />` to `<ExploreDestinations countries={countries} />`.

Note: `article.date` on `NewsArticle` is already a formatted display string (e.g. "12 August 2026"), not an ISO string — `new Date(a.date)` parses that format correctly in Node/V8, but if this proves unreliable, fetch `publishedAt` counts directly instead by adding a small `getRecentArticleCount(days: number): Promise<number>` to `src/lib/articles.ts` that does `prisma.article.count({ where: { status: "PUBLISHED", publishedAt: { gte: sevenDaysAgo } } })` and use that instead — prefer whichever the Step 4 verification shows working correctly.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `/` and confirm the Hero stats strip shows the real counts (matching what `/admin` dashboard already shows for total universities/scholarships), and that "Updates / wk" is a small real number (not "120+") reflecting recent published articles. Confirm "Explore Destinations" still renders all real countries with correct university counts.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/ServerSections.tsx src/app/page.tsx
git commit -m "feat: compute homepage stats and destinations from live data instead of hardcoded values"
```

---

### Task 8: Full verification pass and follow-up notes

**Files:**
- Modify: `docs/audit/mock-data-to-live-data.md` (mark resolved items, document remaining scope)

- [ ] **Step 1: Run the type checker and existing test suite**

Run: `npx tsc --noEmit`
Run: `npm test` (per `package.json`: `node --import tsx --import ./tests/setup.mjs --test --test-concurrency=1 "tests/**/*.test.js"`)
Expected: both pass with no new failures.

- [ ] **Step 2: Manually walk every touched page in the browser**

With `npm run dev` running, visit and visually confirm live data (not the old mock content — cross-check headlines/names against `src/data/mock.ts` to be sure nothing there is coincidentally still showing):
- `/` (Hero stats, Explore Destinations, Find Your University, Scholarship Spotlight, Visa & Immigration, Study Abroad Guides)
- `/universities` and one `/universities/<real-slug>`
- `/scholarships` and one `/scholarships/<real-slug>`
- `/visa`
- `/guides` and one `/guides/<real-slug>`
- Confirm an edit made in `/admin` (e.g. renaming a university) appears on the matching public page after a refresh, proving the admin/public disconnect from the audit is closed for these four content types.

- [ ] **Step 3: Update the audit doc with what's resolved and what's still open**

In `docs/audit/mock-data-to-live-data.md`, add a closing section:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add docs/audit/mock-data-to-live-data.md
git commit -m "docs: record mock-data migration resolution and remaining follow-ups"
```
