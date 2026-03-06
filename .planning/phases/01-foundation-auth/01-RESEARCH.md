# Phase 1: Foundation & Auth - Research

**Researched:** 2026-03-06
**Domain:** Next.js App Router, Auth.js, Prisma, Docker Compose, shadcn/ui
**Confidence:** HIGH

## Summary

This phase scaffolds a greenfield Next.js application with authentication (email/password + OAuth via Google/GitHub), a PostgreSQL database via Prisma ORM, Redis provisioned for future use, and a shadcn/ui-based dark-themed dashboard shell. The application runs locally via Docker Compose.

Next.js 15 (latest 15.x stable) is the recommended version over Next.js 16 for this project. While Next.js 16 is current, it has documented compatibility issues with Bun (segfaults during build, workspace issues) and renames middleware.ts to proxy.ts -- a change that Auth.js v5 documentation and examples have not fully caught up with. Next.js 15 is mature, well-documented, and fully compatible with every library in this stack. Auth.js v5 (next-auth@beta) is production-ready despite the beta label and is the locked decision from the user. Prisma 6.x is the current stable ORM line.

**Primary recommendation:** Use Next.js 15 (latest stable) with App Router, Auth.js v5 (next-auth@beta), Prisma 6.x, shadcn/ui with next-themes for dark mode, bun as package manager (node as runtime), and Docker Compose for local development with PostgreSQL 16 and Redis 7.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Top navigation bar (horizontal, not sidebar)
- Dark mode as default theme
- After login, jump straight to the primary action view (no overview/stats page)
- Use shadcn/ui component library (Radix UI + Tailwind CSS)
- Email/password + OAuth (Google and GitHub)
- Single-user application -- no multi-user registration or user management
- Persistent sessions -- stay logged in until manual logout
- Use NextAuth/Auth.js for auth implementation
- Run locally via Docker Compose (not always-on server or cloud)
- Guided CLI setup wizard on first run (walks through API keys, preferences)
- API keys configured via .env file, not in-app settings
- Single Next.js app -- no monorepo, API routes handle backend logic
- Use bun as package manager and runtime
- PostgreSQL via Docker Compose for database
- Prisma as ORM
- Redis via Docker Compose for BullMQ (needed in Phase 3, provision now)
- Vitest for testing -- test auth flows and core business logic, skip UI tests
- ESLint + Prettier for linting/formatting

### Claude's Discretion
- Exact Tailwind color palette for dark theme
- shadcn/ui component variants and customization
- Docker Compose service naming and network config
- Prisma schema design for users/sessions
- Setup wizard implementation details (CLI vs first-run web page)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create account and log in to the web dashboard | Auth.js v5 Credentials provider + Google/GitHub OAuth providers, Prisma adapter for session/user persistence, bcrypt for password hashing, Zod for input validation |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest stable) | Full-stack React framework | App Router, API routes, server components; v15 has best ecosystem compatibility with Auth.js and Bun |
| react / react-dom | 19.x | UI rendering | Required by Next.js 15 |
| next-auth | 5.x (beta tag) | Authentication | Locked decision; production-ready despite beta label; supports Credentials + OAuth providers |
| @auth/prisma-adapter | latest | Auth.js database adapter | Official adapter connecting Auth.js to Prisma-managed database |
| prisma / @prisma/client | 6.x | ORM and database toolkit | Locked decision; v6.x is current stable; type-safe queries, migrations |
| @shadcn/ui (via CLI) | latest | UI component library | Locked decision; Radix UI primitives + Tailwind CSS |
| next-themes | latest | Theme management | Official shadcn/ui recommendation for dark mode; uses class attribute strategy |
| tailwindcss | 4.x | Utility CSS | Required by shadcn/ui; v4 uses inline config in globals.css (no tailwind.config.ts needed) |
| zod | latest | Schema validation | Input validation for auth forms; integrates with Auth.js authorize function |
| bcryptjs | latest | Password hashing | Pure JS bcrypt implementation (avoids native addon issues with Bun/Docker) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | latest | Test runner | Locked decision; unit testing auth flows and business logic |
| @vitejs/plugin-react | latest | Vitest React support | Required for Vitest with React components |
| vite-tsconfig-paths | latest | Path alias resolution | Makes Vitest respect tsconfig paths |
| eslint | latest | Linting | Locked decision; use ESLint flat config (Next.js 15+) |
| prettier | latest | Formatting | Locked decision |
| typescript | 5.x | Type safety | Required by Next.js 15+ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js v5 | Better Auth | Better Auth is now the recommended path for new projects (Auth.js team joined Better Auth in Sep 2025), but Auth.js is the locked decision and remains production-ready with ongoing security patches |
| Next.js 15 | Next.js 16 | v16 is current but has Bun compatibility issues (segfaults, workspace errors) and renames middleware to proxy -- not yet well-supported by Auth.js ecosystem |
| bcryptjs | bcrypt | Native bcrypt has C++ addon issues with Bun and Alpine Docker images; bcryptjs is pure JS, slightly slower but fully portable |

**Installation:**
```bash
# Initialize project
bun create next-app autoapply --typescript --app --tailwind --eslint --src-dir --import-alias "@/*"

# Core dependencies
bun add next-auth@beta @auth/prisma-adapter @prisma/client next-themes zod bcryptjs

# Dev dependencies
bun add -d prisma vitest @vitejs/plugin-react vite-tsconfig-paths prettier @types/bcryptjs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/              # Auth route group (login, register pages)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx       # Minimal layout for auth pages (no nav)
│   ├── (dashboard)/         # Protected route group
│   │   ├── layout.tsx       # Dashboard layout with top nav bar
│   │   └── page.tsx         # Primary action view (placeholder for now)
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts # Auth.js API route handler
│   ├── layout.tsx           # Root layout with ThemeProvider + SessionProvider
│   ├── page.tsx             # Root redirect (-> login or dashboard)
│   └── globals.css          # Tailwind v4 directives + dark theme vars
├── auth.ts                  # Auth.js configuration (providers, adapter, callbacks)
├── auth.config.ts           # Auth.js edge-compatible config (for middleware)
├── components/
│   ├── ui/                  # shadcn/ui generated components
│   ├── nav/                 # Top navigation bar
│   ├── auth/                # Login/register forms
│   └── providers.tsx        # Client providers wrapper (Session + Theme)
├── lib/
│   ├── prisma.ts            # Prisma client singleton
│   ├── password.ts          # bcrypt hash/verify helpers
│   └── utils.ts             # shadcn/ui cn() utility
├── middleware.ts             # Auth.js route protection (Next.js 15 uses middleware.ts)
└── prisma/
    ├── schema.prisma        # Database schema
    └── migrations/          # Prisma migrations
```

### Pattern 1: Auth.js v5 Configuration with Credentials + OAuth
**What:** Single auth config exporting handlers, auth, signIn, signOut
**When to use:** Always -- this is the Auth.js v5 canonical pattern
**Example:**
```typescript
// src/auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { signInSchema } from "@/lib/validators"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },  // JWT required for Credentials provider
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } = await signInSchema.parseAsync(credentials)
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.hashedPassword) return null
        const valid = await verifyPassword(password, user.hashedPassword)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
```

### Pattern 2: Prisma Client Singleton
**What:** Prevent multiple Prisma Client instances in development (hot reload)
**When to use:** Always in Next.js with Prisma
**Example:**
```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### Pattern 3: Route Protection via Middleware
**What:** Redirect unauthenticated users away from protected routes
**When to use:** For all dashboard routes
**Example:**
```typescript
// src/middleware.ts (Next.js 15 -- still called middleware.ts)
import { auth } from "@/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/register")

  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/", req.url))
  }
  if (!isAuthPage && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Pattern 4: Providers Wrapper (Session + Theme)
**What:** Client component wrapping the app with SessionProvider and ThemeProvider
**When to use:** In root layout
**Example:**
```typescript
// src/components/providers.tsx
"use client"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
```

### Anti-Patterns to Avoid
- **Importing Prisma Client in client components:** Prisma must only run server-side. Use API routes or server actions.
- **Using database session strategy with Credentials provider:** Auth.js Credentials provider defaults to JWT and has known issues with database sessions. Use JWT strategy.
- **Storing passwords in plain text:** Always hash with bcrypt before storing.
- **Calling auth() in every component:** Use middleware for route protection; call auth() only when you need session data in a server component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | bcryptjs | Timing-safe comparison, salt management, configurable rounds |
| Session management | Cookie-based session from scratch | Auth.js v5 | CSRF protection, token rotation, provider abstraction |
| Form validation | Manual if/else checks | Zod schemas | Type-safe, composable, integrates with Auth.js authorize |
| Dark mode toggle | Manual class toggling + localStorage | next-themes | Handles SSR hydration mismatch, system preference detection |
| UI components | Custom button/input/card components | shadcn/ui | Accessible (Radix primitives), consistent, themeable |
| Database migrations | Raw SQL migration scripts | Prisma Migrate | Tracks migration history, generates type-safe client |
| OAuth flow | Manual redirect/callback handling | Auth.js providers | Handles PKCE, state validation, token exchange |

**Key insight:** Auth is deceptively complex. Even "simple" email/password auth needs CSRF protection, timing-safe comparison, rate limiting, and session management. Auth.js handles all of this.

## Common Pitfalls

### Pitfall 1: Credentials Provider + Database Sessions
**What goes wrong:** Auth.js Credentials provider does NOT automatically persist users or sessions to the database when using the database session strategy. Sessions return null.
**Why it happens:** By design, Credentials provider uses JWT sessions. The adapter's createSession is never called for credential logins.
**How to avoid:** Use `session: { strategy: "jwt" }` in auth config. Use jwt and session callbacks to pass user data through the token.
**Warning signs:** `auth()` returns null after credential login; OAuth login works but email/password doesn't.

### Pitfall 2: Auth.js Environment Variable Naming
**What goes wrong:** Auth doesn't work, providers fail silently.
**Why it happens:** Auth.js v5 uses `AUTH_` prefix, not `NEXTAUTH_`. The only exception is `AUTH_SECRET` (replaces `NEXTAUTH_SECRET`). Provider env vars follow the pattern `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
**How to avoid:** Use `AUTH_` prefix for all Auth.js env vars. Set `AUTH_SECRET` (use `openssl rand -base64 33` to generate).
**Warning signs:** "Missing secret" errors, OAuth redirects failing.

### Pitfall 3: Prisma Client in Development Hot Reload
**What goes wrong:** "Too many Prisma Clients" error in development.
**Why it happens:** Next.js hot reload creates new module instances, each instantiating a new PrismaClient.
**How to avoid:** Use the globalThis singleton pattern (see Pattern 2 above).
**Warning signs:** Connection pool exhaustion, "prepared statement already exists" errors.

### Pitfall 4: bcrypt Native Module in Docker/Bun
**What goes wrong:** Build fails or runtime crashes with native module errors.
**Why it happens:** The `bcrypt` package uses C++ native addons (N-API) that have issues with Bun and Alpine-based Docker images.
**How to avoid:** Use `bcryptjs` (pure JavaScript implementation) instead of `bcrypt`.
**Warning signs:** "Error loading shared library" or segfault during password operations.

### Pitfall 5: Missing suppressHydrationWarning on html Tag
**What goes wrong:** React hydration mismatch warning in console when using dark mode.
**Why it happens:** next-themes adds a class attribute to `<html>` before hydration, causing a mismatch between server and client HTML.
**How to avoid:** Add `suppressHydrationWarning` to the `<html>` tag in root layout.
**Warning signs:** Console warning about hydration mismatch on every page load.

### Pitfall 6: Bun as Runtime vs Package Manager
**What goes wrong:** Next.js build or dev server crashes, segfaults, or module resolution failures.
**Why it happens:** Bun's Node.js compatibility layer is not 100% complete, especially for native addons and some Node.js APIs that Next.js relies on.
**How to avoid:** Use bun as the **package manager** (bun install, bun add) but use **node** as the runtime (next dev, next build, next start run on Node.js). In Docker, use `oven/bun` for install step, then `node:20-alpine` for runtime.
**Warning signs:** Segfaults during build, "Module not found" errors that work with npm/node.

### Pitfall 7: Single-User App but Still Needs Auth
**What goes wrong:** Skipping auth entirely because "it's single user."
**Why it happens:** Tempting to skip login since only one person uses it.
**How to avoid:** The app supports OAuth (Google/GitHub) which requires proper session management. Implement full auth but skip multi-user registration features. Consider: disable registration after first user is created.
**Warning signs:** N/A -- architectural decision.

## Code Examples

### Prisma Schema for Auth.js
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(cuid())
  name           String?
  email          String    @unique
  emailVerified  DateTime?
  image          String?
  hashedPassword String?   // For credentials auth
  accounts       Account[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}
```

### Password Utilities
```typescript
// src/lib/password.ts
import bcrypt from "bcryptjs"

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
```

### Docker Compose Configuration
```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://autoapply:autoapply@postgres:5432/autoapply
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: autoapply
      POSTGRES_PASSWORD: autoapply
      POSTGRES_DB: autoapply
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U autoapply"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - redis_data:/var/lib/redis/data

volumes:
  postgres_data:
  redis_data:
```

### Multi-Stage Dockerfile (Bun install, Node runtime)
```dockerfile
# Dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npx", "next", "dev"]
```

### Registration API Route (Server Action)
```typescript
// src/app/(auth)/register/actions.ts
"use server"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { signInSchema } from "@/lib/validators"
import { signIn } from "@/auth"

export async function register(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Validate input
  const validated = signInSchema.parse({ email, password })

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  })
  if (existingUser) {
    return { error: "Account already exists" }
  }

  // Single-user check: prevent registration if a user already exists
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    return { error: "Registration is closed" }
  }

  // Create user
  const hashedPassword = await hashPassword(validated.password)
  await prisma.user.create({
    data: {
      email: validated.email,
      hashedPassword,
    },
  })

  // Auto sign-in after registration
  await signIn("credentials", {
    email: validated.email,
    password: validated.password,
    redirectTo: "/",
  })
}
```

### Vitest Configuration
```typescript
// vitest.config.mts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NEXTAUTH_ env prefix | AUTH_ env prefix | Auth.js v5 (2024) | All env vars must use AUTH_ prefix |
| @next-auth/prisma-adapter | @auth/prisma-adapter | Auth.js v5 (2024) | New package scope for adapters |
| next-auth (v4 stable) | next-auth@beta (v5) | 2024-present | New API surface: auth(), handlers export |
| tailwind.config.ts | Inline CSS config (Tailwind v4) | Feb 2025 | No config file needed; theme in globals.css |
| middleware.ts (Next.js 15) | proxy.ts (Next.js 16) | Oct 2025 | Renamed; we stay on Next.js 15 so middleware.ts |
| Auth.js independent project | Auth.js maintained by Better Auth team | Sep 2025 | Security patches continue; new features go to Better Auth |
| Prisma with Rust engine | Prisma Query Compiler (no Rust) | Prisma 6.7+ | Smaller Docker images, faster cold starts |

**Deprecated/outdated:**
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`: Use `AUTH_SECRET` / `AUTH_URL` in v5
- `@next-auth/*-adapter` packages: Use `@auth/*-adapter` scope
- `getServerSession()`: Use `auth()` in v5
- `next lint` command: Removed in Next.js 16; use ESLint CLI directly (still available in v15)

## Open Questions

1. **Setup Wizard: CLI vs First-Run Web Page**
   - What we know: User wants a guided setup wizard for first run (API keys, preferences)
   - What's unclear: Whether this should be a CLI script (run before `docker compose up`) or a first-run web wizard (shown on first visit when no user exists)
   - Recommendation: First-run web wizard is simpler -- detect no users in DB, show setup flow, create first user. CLI adds complexity and breaks the Docker Compose single-command workflow. The .env file handles API keys; the web wizard handles account creation.

2. **Next.js Version: 15 vs 16**
   - What we know: Next.js 16 is current but has Bun compatibility issues and Auth.js ecosystem hasn't fully adapted (proxy.ts rename)
   - What's unclear: Whether Bun issues will be resolved soon
   - Recommendation: Start with Next.js 15 (latest stable). Migration to 16 is straightforward later. The codemod handles most changes. This avoids known Bun segfaults and ensures Auth.js middleware works without workarounds.

3. **Auth.js Long-Term Maintenance**
   - What we know: Auth.js team joined Better Auth in Sep 2025. Auth.js will receive security patches but no new features.
   - What's unclear: How long maintenance will continue
   - Recommendation: Auth.js v5 is the locked decision and remains production-ready. For a single-user local app, the maintenance horizon is more than sufficient. Migration to Better Auth is documented if ever needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest) |
| Config file | vitest.config.mts (Wave 0 -- needs creation) |
| Quick run command | `bunx vitest run --reporter=verbose` |
| Full suite command | `bunx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01a | User can register with email/password | integration | `bunx vitest run src/__tests__/auth/register.test.ts -x` | No -- Wave 0 |
| AUTH-01b | User can log in with email/password | integration | `bunx vitest run src/__tests__/auth/login.test.ts -x` | No -- Wave 0 |
| AUTH-01c | Session persists across page refresh | integration | `bunx vitest run src/__tests__/auth/session.test.ts -x` | No -- Wave 0 |
| AUTH-01d | User can log out | integration | `bunx vitest run src/__tests__/auth/logout.test.ts -x` | No -- Wave 0 |
| AUTH-01e | Password hashing works correctly | unit | `bunx vitest run src/__tests__/lib/password.test.ts -x` | No -- Wave 0 |
| INFRA-01 | Docker Compose starts all services | manual-only | `docker compose up -d && docker compose ps` | N/A -- manual verification |

### Sampling Rate
- **Per task commit:** `bunx vitest run --reporter=verbose`
- **Per wave merge:** `bunx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts` -- Vitest configuration file
- [ ] `src/__tests__/auth/register.test.ts` -- covers AUTH-01a
- [ ] `src/__tests__/auth/login.test.ts` -- covers AUTH-01b
- [ ] `src/__tests__/auth/session.test.ts` -- covers AUTH-01c
- [ ] `src/__tests__/auth/logout.test.ts` -- covers AUTH-01d
- [ ] `src/__tests__/lib/password.test.ts` -- covers AUTH-01e (password hashing)
- [ ] Framework install: `bun add -d vitest @vitejs/plugin-react vite-tsconfig-paths`

## Sources

### Primary (HIGH confidence)
- [Auth.js official docs - Prisma adapter](https://authjs.dev/getting-started/adapters/prisma) - Schema models, adapter setup
- [Auth.js official docs - Credentials provider](https://authjs.dev/getting-started/authentication/credentials) - Authorize function, Zod validation, code examples
- [Auth.js official docs - Route protection](https://authjs.dev/getting-started/session-management/protecting) - Middleware/proxy pattern
- [Next.js official docs - Upgrading to v16](https://nextjs.org/docs/app/guides/upgrading/version-16) - Breaking changes, proxy.ts rename
- [Next.js official docs - Vitest setup](https://nextjs.org/docs/app/guides/testing/vitest) - Configuration, limitations
- [shadcn/ui official docs - Dark mode with Next.js](https://ui.shadcn.com/docs/dark-mode/next) - next-themes setup
- [Prisma official docs - Auth.js guide](https://www.prisma.io/docs/guides/authjs-nextjs) - Integration patterns

### Secondary (MEDIUM confidence)
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) - v4 to v5 changes, env var naming
- [Auth.js + Better Auth announcement](https://github.com/nextauthjs/next-auth/discussions/13252) - Maintenance status
- [Bun + Next.js 16 issues](https://github.com/oven-sh/bun/issues/24829) - Build compatibility problems
- [Better Auth vs Auth.js comparison](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/) - Ecosystem status

### Tertiary (LOW confidence)
- [Auth.js Credentials + database session workaround](https://github.com/nextauthjs/next-auth/discussions/4394) - Community workaround; not recommended, use JWT strategy instead

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official documentation; versions confirmed via npm/releases
- Architecture: HIGH - Patterns sourced from Auth.js and Next.js official docs and established community patterns
- Pitfalls: HIGH - Well-documented issues (Credentials+DB sessions, bcrypt native modules, Prisma hot reload) confirmed across multiple sources

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stack is mature and stable)
