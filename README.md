# Abroad Bulletin — Study Abroad News & Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.2.1-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9.1-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

**Abroad Bulletin** (Study Abroad Intelligence) is a full-stack digital publishing and intelligence portal designed for international students planning overseas education. It brings together daily news coverage, immigration and study-permit tracking, global university directories, scholarship opportunities, and an automated government RSS feed ingestion engine into an editorial experience.

---

## 🌟 Key Features

### 📰 Public Education Intelligence Portal
* **Daily News Feed:** Server-side rendered (SSR) editorial articles covering admissions, visas, scholarships, university updates, and career pathways.
* **Destination Dossiers:** Deep-dive profiles for top study destinations including Canada, the UK, the USA, Australia, Germany, Ireland, the Netherlands, and France.
* **Immigration & Policy Tracker:** Live tracking of visa deadlines, intake windows, and regulatory updates directly from official sources.
* **Search & Filter:** Instant search across universities, articles, scholarships, and guides with keyboard navigation.
* **SEO & Social Sharing:** Dynamic OpenGraph metadata, structured JSON-LD schemas, and social share buttons.

### 📡 Automated RSS Ingestion Engine
* **Multi-Format Feed Support:** Ingests both **Atom** and **RSS 2.0** feeds from official government immigration and higher-education portals (IRCC Canada, UKVI, US State Dept, Germany FFO).
* **Duplicate Detection:** Automatic URL normalization and batch duplicate checking against the PostgreSQL database.
* **One-Click Draft Import:** Converts live external news into structured database drafts with automatic slug prefixing, source attribution, and country tagging.

### ✍️ In-Place WYSIWYG Live Article Editor
* **Direct Visual Editing:** Editors can append `?adminPreview=true` to any article URL to access visual editing tools directly on the live page layout.
* **Dynamic Article Controls:** Edit headlines, summaries, body paragraphs, reading time, categories, and country tags with real-time feedback.
* **Publication Lifecycle:** Seamlessly transition articles between `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, and `ARCHIVED` states.

### 👥 Staff & User Role Management (RBAC)
* **Tiered Permissions:** Role-based access for `SUPER_ADMIN`, `ADMIN`, `EDITOR`, and `STUDENT`.
* **Staff Administration:** Invite team members, promote roles, suspend accounts, and manage credentials from a dedicated admin dashboard.

---

## 🏗️ System Architecture

Abroad Bulletin uses a hybrid architecture combining **Next.js 16 Server Components** for performance and SEO with an **Express 5 REST API** for administrative workflows and background tasks.

```
                                  ┌──────────────────────────────────────────────┐
                                  │                USER BROWSER                  │
                                  └──────┬───────────────────────────────┬───────┘
                                         │                               │
                      1. HTML / SSR Page Requests            2. API Calls (Auth, Admin, RSS)
                                         │                               │
                                         ▼                               ▼
                     ┌───────────────────────────────┐   ┌───────────────────────────────┐
                     │         NEXT.JS 16            │   │       NEXT.JS API PROXY       │
                     │         App Router            │   │    /api/backend/[...path]     │
                     │  (Server & Client Components) │   └───────────────┬───────────────┘
                     └───────────────┬───────────────┘                   │
                                     │                                   │ (Reverse Proxy / Direct)
                                     │ Direct DB Query                   ▼
                                     │ (Articles, Countries,     ┌───────────────────────────────┐
                                     │  Deadlines via Prisma)    │        EXPRESS BACKEND        │
                                     │                           │        Port 8000 / Node       │
                                     │                           │     backend/src/server.js     │
                                     │                           └───────────────┬───────────────┘
                                     │                                           │
                                     │                                           │ PrismaPg Adapter
                                     ▼                                           ▼
                     ┌───────────────────────────────────────────────────────────────────────────┐
                     │                               POSTGRESQL                                  │
                     │                         Prisma ORM (Version 7)                            │
                     │       (Users, Articles, Countries, Scholarships, Deadlines, RSS)          │
                     └───────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

* **Frontend:** [Next.js 16 (App Router)](https://nextjs.org/), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/), `clsx`, `tailwind-merge`
* **Icons:** [Lucide React](https://lucide.dev/), [Country Flag Icons](https://purecatamphetamine.github.io/country-flag-icons/)
* **Backend:** [Express 5](https://expressjs.com/) (Node.js ES Modules)
* **Database:** [PostgreSQL](https://www.postgresql.org/)
* **ORM:** [Prisma ORM 7](https://www.prisma.io/) with `@prisma/adapter-pg`
* **Feed Parser:** [Fast XML Parser](https://github.com/NaturalIntelligence/fast-xml-parser)
* **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`

---

## 📁 Repository Structure

```
Study-Abroad-News/
├── backend/                      # Express backend service
│   └── src/
│       ├── config/               # Prisma & PostgreSQL client initialization
│       └── server.js             # Monolithic Express API server
├── prisma/
│   ├── migrations/               # PostgreSQL schema migrations
│   ├── schema.prisma             # Prisma database schema definition
│   └── seed.ts                   # Comprehensive database seed script
├── public/                       # Static public assets, flags, and logos
├── src/
│   ├── app/                      # Next.js App Router routes & API proxies
│   │   ├── admin/                # Admin CMS, User & Article management
│   │   ├── api/backend/[...path] # Next.js reverse proxy to Express backend
│   │   ├── auth/                 # Login, signup, and welcome pages
│   │   ├── countries/            # Country dossiers & comparison
│   │   ├── immigration-tracker/  # Policy tracker & timeline
│   │   ├── news/                 # News catalog & live article reader
│   │   ├── scholarships/         # Scholarships catalog
│   │   ├── universities/         # University discovery
│   │   └── page.tsx              # Homepage
│   ├── components/               # Modular UI components
│   │   ├── admin/                # Admin header, sidebar, modals, tables, RSS panel
│   │   ├── editorial/            # AdminArticleLiveEditor, Ad banners, labels
│   │   ├── home/                 # Hero, LatestNews, ServerSections
│   │   └── site/                 # Navigation, Header, Masthead, Footer
│   ├── data/                     # Seed datasets & static taxonomies
│   └── lib/                      # Business logic, Prisma client, RSS parser
├── amplify.yml                   # AWS Amplify CI/CD configuration
└── package.json                  # Dependencies and scripts
```

---

## 🚀 Quickstart Guide

### Prerequisites
* **Node.js:** `v20.x` or higher
* **npm:** `v10.x` or higher
* **PostgreSQL:** `v14+` running locally or hosted (e.g., Supabase, Neon, AWS RDS)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/Study-Abroad-News.git
cd Study-Abroad-News
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root:

```env
# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/abroad_bulletin"

# JWT Secret Key
JWT_SECRET="your_strong_random_jwt_secret_key_2026"

# Express API Port
PORT=8000

# Public API URL for frontend clients
NEXT_PUBLIC_API_URL="http://localhost:8000"

# Node Environment
NODE_ENV="development"
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations to your PostgreSQL database
npm run db:migrate

# Seed countries, articles, universities, scholarships, and staff users
npm run db:seed
```

#### Default Seed Accounts
| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@abroadbulletin.com` | `Admin@123456` |
| **Editor** | `editor@abroadbulletin.com` | `Editor@123456` |
| **Student** | `student@abroadbulletin.com` | `Student@123456` |

### 4. Start the Application

Open two terminal windows:

**Terminal 1 — Express Backend Server:**
```bash
npm run backend
# Running on http://localhost:8000
```

**Terminal 2 — Next.js Frontend:**
```bash
npm run dev
# Running on http://localhost:3000
```

Visit [http://localhost:3000](http://localhost:3000) to view the public site or [http://localhost:3000/admin](http://localhost:3000/admin) to access the Admin Panel.

---

## 🔌 API Reference Summary

### Authentication & Profiles
* `POST /api/signup` — Register a new student account
* `POST /api/login` — Authenticate and receive a 7-day JWT token
* `GET /api/me` — Retrieve the authenticated user's profile (`Bearer <JWT>`)

### Staff & User Management (`/api/admin/users`)
* `GET /api/admin/users` — List all registered users and staff
* `POST /api/admin/users/invite` — Create a new staff account with an assigned role
* `PATCH /api/admin/users/:id` — Update role, status (`ACTIVE`/`SUSPENDED`), or reset password
* `DELETE /api/admin/users/:id` — Delete a user account

### Content & Editorial CMS (`/api/admin/articles`)
* `GET /api/admin/articles` — Search, filter, and paginate articles
* `POST /api/admin/articles` — Create a new article with country associations
* `PUT /api/admin/articles/:id` — Update article content and metadata
* `PATCH /api/admin/articles/:id/status` — Change publication status (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
* `DELETE /api/admin/articles/:id` — Delete an article

### RSS Ingestion (`/api/admin/rss`)
* `GET /api/admin/rss/preview` — Live parallel fetch of all registered feeds with duplicate status
* `POST /api/admin/articles/import-rss` — Authoritative server re-fetch and import into database as `DRAFT`

---

## 🗺️ Project Roadmap

- [x] Initial full-stack editorial portal with Next.js 16 SSR
- [x] PostgreSQL relational schema with Prisma 7
- [x] In-place live WYSIWYG article editor
- [x] Automated Atom / RSS 2.0 multi-source ingestion pipeline
- [x] Role-based user administration (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `STUDENT`)
- [ ] **Personalized User Homepage Feed** based on student target destination & course preferences
- [ ] Migration of Express API routes into native Next.js serverless route handlers
- [ ] Direct database connectivity for remaining mock directories (Universities, Scholarships, Directory)
- [ ] Integration test suite (Vitest + Playwright)

---

## 📄 License

This project is licensed under the **ISC License**.