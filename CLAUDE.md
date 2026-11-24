# GARVHEM: project guide

Marketing site + HR/operations portal for GARVHEM. Source of truth for scope: the build brief
(summarised here). Every change follows this file. **Schema, auth and the permission layer are owned
by the main agent: nobody changes them without updating this file.**

## Stack

Next.js 16 (App Router, React 19, TypeScript strict + `noUncheckedIndexedAccess`, `src/`), Tailwind CSS 4,
Radix primitives, lucide-react, framer-motion, PostgreSQL + Prisma 7 (`@prisma/adapter-pg`), zod 4,
react-hook-form, jose, @node-rs/argon2, TanStack Query, recharts, date-fns(-tz), nodemailer, dnd-kit,
Vitest, Playwright.

## Commands

| Task                | Command                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| Local database      | `docker compose up -d` **or** `npm run db:local` (no Docker)               |
| Migrate / seed      | `npx prisma migrate dev`, `npm run seed`, `npm run seed:demo` (local only) |
| Dev / build / start | `npm run dev`, `npm run build`, `npm start`                                |
| Checks              | `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`        |

## Structure

```
src/app/(marketing)   public pages, Navbar/Footer layout
src/app/(auth)        login, change-password, forgot/reset password
src/app/portal        protected shell; employee pages + admin/*
src/app/api           auth/*, leads, portal/*, cron/*
src/actions           Server Actions (thin; every one uses createAction)
src/server            domain services; *-math.ts files are pure and unit-tested
src/lib               auth, db, env, time, validators, email, storage, rate-limit, audit
src/components/ui     design system (only place for primitives)
src/components/{brand,marketing,portal}
src/config            site, services, pricing, media, navigation
prisma                schema, migrations, seed
tests/unit, tests/e2e
```

## Conventions

- No `any`, `@ts-ignore`, `eslint-disable`, TODOs or placeholder handlers.
- Server Components by default; `"use client"` only for interaction. Client components may import
  `@/lib/validators/*`, `@/lib/time`, `@/lib/utils`, `@/server/*-math`, and **types** from `@/server/*`.
- Mutations: Server Action built with `createAction({ name, permission, schema }, handler)`, called through
  `useAction` from `@/components/ui/use-action` (pending state, toasts, field errors). Route handlers use
  `handler()` from `@/lib/api`, and `assertSameOrigin(req)` for anything that writes.
- Pages call `requirePageUser()` / `requirePagePermission("…")` themselves, even inside guarded layouts.
- Object-level checks live in `src/server` (`assertInTeam`, `visibleTasks`, ownership in the `where`).
- Throw `AppError` (`invalid`, `conflict`, `notFound`…) for messages users may see. Anything else is generic.
- Times: instants are UTC `Date`; dates are `YYYY-MM-DD` work dates in the company timezone (`@/lib/time`).
  Never use the client clock for data.
- Audit every sensitive write with `audit()`, inside the same transaction when there is one.
- Use design tokens (`bg-surface`, `text-muted`, `border-border`, `bg-brand`…), never raw hex in components.
  Headings use `font-display`. Portal must work in light and dark; marketing is light with dark (ink) sections.
- Copy: plain, specific, honest. No fake clients, testimonials or numbers. Sentence case. Avoid em dashes.
- Charts: `@/components/portal/charts` only (`--chart-1..5`, fixed order, validated for colour blindness).
  One axis, thin marks, tooltip always, legend for two or more series.
- Accessibility: labels on every control, visible focus, AA contrast, keyboard paths, reduced motion.

## Roles and permissions (`src/lib/auth/permissions.ts`)

| Permission                                                                        | Employee | Manager            | Admin |
| --------------------------------------------------------------------------------- | -------- | ------------------ | ----- |
| own.attendance / own.leaves / own.tasks / own.reports                             | yes      | yes                | yes   |
| team.attendance.view, leaves.approve, tasks.create, tasks.assign, reports.viewAll | no       | yes                | yes   |
| team.attendance.edit, leaves.adjustBalance, leads.view, leads.manage              | no       | configurable (off) | yes   |
| users.manage, settings.manage, audit.view                                         | no       | no                 | yes   |

`users.manage` marks company-wide accounts. Managers see direct reports only while
`settings.team.managerTeamScope` is on (default). Nobody but an admin acts on their own records.

## Decisions

- **`src/proxy.ts` instead of `middleware.ts`.** Next.js 16 renamed it (Node runtime). Same job.
- **Refresh cookie is scoped to `/api/auth`**, so the proxy cannot read it. Expired access tokens get a 307 to
  `/api/auth/refresh?next=…`, which rotates and 307s back (method and body survive). A non-secret hint cookie
  `gv_s` says whether a refresh is worth trying.
- **JWT `sid` is the session family id**, stable across rotation. Parallel refreshes inside 15 s get an access
  token only; later reuse revokes every session and bumps `tokenVersion`.
- **Every request re-checks** user, `isActive`, `tokenVersion` and session in the DB: deactivation is immediate.
- **Palette comes from the supplied logo** (ink navy, chrome, signal red) rather than the suggested indigo/amber.
- **Overnight work**: events attach to the open day, so punching out after midnight belongs to the day it began.
- **Auto-close** runs at the cutoff (default 03:00 next morning) and by default records the shift end, so nobody is
  credited for unworked hours; `autoCloseAt` switches to the cutoff. Also runs lazily on the next punch.
- **Half-day threshold**: net hours under 5 h on a working day = Half-day. Multiple in/out sessions allowed.
- **Leave** can be backdated 30 days. Approval re-checks balance and recounts days. Year-spanning leave is split.
- **Daily report cutoff** defaults to midnight but stays open while the person is still punched in for that date.
- **Punch-out rule** defaults to _reminder_ (can skip); Settings can make it _required_.
- **Login limits**: 5 tries per email / 15 min (counted for unknown emails too), then lock; 30 per IP / 15 min.
- **Manager team scope** is on by default (least privilege).
- **RLS** is enabled with no policies and API roles are revoked, so Supabase's REST API exposes nothing.
- **Local Postgres without Docker** via `embedded-postgres` (dev only).
- **Admins are not expected to punch**: never Absent or Missing, shown on the board only once punched in.
- **Careers**: positions from config, applications by email.
- **`unsafe-inline` for styles only**: framer-motion and Radix set inline styles. Scripts are nonce-only.
- **Session changes take the user's row lock** (`lockUserSessions`) and sessions carry `tokenVersion`, so a refresh can
  never outrun a "revoke all".
- **Lockout uses one counter per email address**, real or not; `User.lockedUntil` is for display only.
- **Managers may edit or delete only** tasks they created or tasks whose assignees are all in their scope; admins are
  never inside a manager's scope.
- **Production cookies** are `__Host-gv_at`, `__Secure-gv_rt`, `__Host-gv_s`.
- **Remote database TLS is verified** by default; Supabase's root CA is bundled.
- **Client IP** is trusted on Vercel or with `TRUST_PROXY=true` only; otherwise IP limits share one larger bucket.
- **zod runs `jitless`** because the CSP forbids eval; the lead form loads zod on first interaction.
- **XLSX export** was optional in the brief and is not included; CSV opens in Excel.
