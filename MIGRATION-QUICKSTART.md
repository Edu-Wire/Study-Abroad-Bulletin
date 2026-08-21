# Next.js API Routes Migration — Quick Start Guide

## TL;DR

Convert 25 Express endpoints to Next.js routes in 4 weeks. Save $500-1,500/year. Unified codebase. Better DX.

---

## Step 1: Create API Route Structure (30 minutes)

```bash
cd src/app
mkdir -p api/{auth,admin/users,admin/articles,admin/rss,countries,health}
```

**Result:**
```
src/app/api/
├─ auth/
│  ├─ signup/route.ts
│  ├─ login/route.ts
│  └─ me/route.ts
├─ admin/
│  ├─ users/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  ├─ articles/
│  │  ├─ route.ts
│  │  ├─ [id]/
│  │  │  ├─ route.ts
│  │  │  └─ status/route.ts
│  │  └─ import-rss/route.ts
│  └─ rss/
│     └─ preview/route.ts
├─ countries/route.ts
└─ health/route.ts
```

---

## Step 2: Create Middleware (1 hour)

**Create `src/middleware.ts`:**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "studyabroadnews_secret_key_2026"
);

export async function middleware(request: NextRequest) {
  // Add CORS headers
  const response = NextResponse.next();
  
  if (request.method === "OPTIONS") {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
  }

  // CORS on all requests
  response.headers.set("Access-Control-Allow-Origin", "*");

  // Verify JWT for protected routes
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      // Token is valid; continue
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
```

---

## Step 3: Migrate First Endpoint (Health Check) — 30 minutes

**Create `src/app/api/health/route.ts`:**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "OK",
    database: "PostgreSQL abroad_bulletin",
    serverTime: new Date(),
  });
}
```

**Test:**
```bash
curl http://localhost:3000/api/health
# Expected: { "status": "OK", ... }
```

---

## Step 4: Migrate Auth Endpoints (2 hours)

**Create `src/app/api/auth/signup/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide first name, last name, email, and password.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    // Generate JWT Token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully!",
        token,
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during registration. Please try again.",
      },
      { status: 500 }
    );
  }
}
```

**Create `src/app/api/auth/login/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter both email and password.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Check password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Logged in successfully!",
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during login. Please try again.",
      },
      { status: 500 }
    );
  }
}
```

**Create `src/app/api/auth/me/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized token" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
```

---

## Step 5: Create Shared Auth Utility (1 hour)

**Create `src/lib/api/auth.ts`:**

```typescript
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";

export function generateToken(userId: string, email: string) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}
```

**Update endpoints to use utility:**

```typescript
// In route handlers
import { generateToken, verifyToken, extractTokenFromHeader } from "@/lib/api/auth";

const token = generateToken(newUser.id, newUser.email);

const tokenStr = extractTokenFromHeader(request.headers.get("authorization"));
const decoded = verifyToken(tokenStr || "");
```

---

## Step 6: Migrate Countries Endpoint (30 minutes)

**Create `src/app/api/countries/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      select: { id: true, name: true, flag: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, countries });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
```

---

## Step 7: Migrate Articles Endpoints (4 hours)

**Create `src/app/api/admin/articles/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/articles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (category && category !== "ALL") where.category = category;
    if (search) {
      where.OR = [
        { headline: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [articles, totalCount] = await prisma.$transaction([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          countries: {
            include: { country: { select: { id: true, name: true, flag: true } } },
          },
          primaryCountry: { select: { id: true, name: true, flag: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      articles,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Fetch articles error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST /api/admin/articles
export async function POST(request: Request) {
  try {
    const {
      slug,
      headline,
      summary,
      content,
      category,
      image,
      readingTime,
      breaking,
      featured,
      status,
      primaryCountryId,
      countryIds,
    } = await request.json();

    if (!headline?.trim()) {
      return NextResponse.json(
        { success: false, message: "Headline is required." },
        { status: 400 }
      );
    }
    if (!slug?.trim()) {
      return NextResponse.json(
        { success: false, message: "Slug is required." },
        { status: 400 }
      );
    }
    if (!summary?.trim()) {
      return NextResponse.json(
        { success: false, message: "Summary is required." },
        { status: 400 }
      );
    }
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category is required." },
        { status: 400 }
      );
    }

    const validCategories = ["UNIVERSITIES", "ADMISSIONS", "SCHOLARSHIPS", "VISA", "STUDENT_LIFE", "CAREER"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, message: "Invalid category value." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await prisma.article.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "An article with this slug already exists." },
        { status: 400 }
      );
    }

    const validStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"];
    const articleStatus = validStatuses.includes(status) ? status : "DRAFT";

    const newArticle = await prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          slug: cleanSlug,
          headline: headline.trim(),
          summary: summary.trim(),
          content: content?.trim() || null,
          category,
          image: image?.trim() || null,
          readingTime: readingTime?.trim() || "4 min read",
          breaking: Boolean(breaking),
          featured: Boolean(featured),
          status: articleStatus,
          publishedAt: new Date(),
          primaryCountryId: primaryCountryId || null,
        },
      });

      if (Array.isArray(countryIds) && countryIds.length > 0) {
        await tx.articleCountry.createMany({
          data: countryIds.map((countryId) => ({ articleId: article.id, countryId })),
          skipDuplicates: true,
        });
      }

      return tx.article.findUnique({
        where: { id: article.id },
        include: {
          countries: { include: { country: true } },
          primaryCountry: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Article created successfully.",
        article: newArticle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create article." },
      { status: 500 }
    );
  }
}
```

**Follow the same pattern for remaining endpoints** (`[id]/route.ts`, `[id]/status/route.ts`, admin users, admin rss, import-rss).

---

## Step 8: Stop Express Backend

```bash
# Remove from package.json
npm uninstall express cors fast-xml-parser

# Remove backend folder (after confirming all endpoints migrated)
rm -rf backend/

# Update package.json scripts
# Remove: "backend": "node --watch backend/src/server.js"
```

---

## Step 9: Test Everything

```bash
# Start dev server (single process now!)
npm run dev

# Test endpoints
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@test.com","password":"password123"}'

curl http://localhost:3000/api/health
curl http://localhost:3000/api/countries
```

---

## Step 10: Deploy to Amplify

```bash
git add .
git commit -m "feat: consolidate Express backend to Next.js API routes"
git push origin main

# Amplify automatically deploys
# Monitor at: https://console.aws.amazon.com/amplify
```

---

## Checklist

- [ ] Create API folder structure
- [ ] Create middleware.ts
- [ ] Migrate health endpoint
- [ ] Migrate auth endpoints (signup, login, me)
- [ ] Migrate countries endpoint
- [ ] Migrate admin users endpoints (GET list, POST create, PATCH update, DELETE)
- [ ] Migrate articles CRUD endpoints (GET list, POST create, PUT update, PATCH status, DELETE)
- [ ] Migrate RSS endpoints (preview, import-rss)
- [ ] Create shared auth utility
- [ ] Write unit tests for each endpoint
- [ ] Write integration tests
- [ ] Test locally with `npm run dev`
- [ ] Remove Express from dependencies
- [ ] Remove backend folder
- [ ] Deploy to Amplify
- [ ] Monitor performance metrics
- [ ] Update documentation

---

## Common Issues & Solutions

### Issue: CORS errors in development

**Solution:** Middleware is already set up; ensure it's applied to all API routes.

```typescript
// src/middleware.ts already handles this
```

### Issue: JWT verification fails

**Solution:** Ensure JWT_SECRET matches between token generation and verification.

```typescript
// Use same secret everywhere
const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";
```

### Issue: Database connection pool exhausted

**Solution:** Reuse Prisma singleton from `src/lib/prisma.ts` in all routes. Never create multiple PrismaClient instances.

```typescript
// Good: Reuse singleton
import { prisma } from "@/lib/prisma";

// Bad: Creates new instance
const prisma = new PrismaClient();
```

### Issue: Express dependencies still imported

**Solution:** Search for any remaining imports and remove.

```bash
grep -r "from 'express'" src/
grep -r "from \"express\"" src/
```

---

## Performance Tips

1. **Use Prisma select()** to fetch only needed fields
2. **Enable query logging** in development: `log: ["warn", "error"]`
3. **Use transactions** for multi-step operations (already in your code)
4. **Cache responses** where appropriate using `revalidate`:

```typescript
export const revalidate = 3600; // Cache for 1 hour
```

---

**Ready to start? Begin with Step 1!**
