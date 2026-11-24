# GARVHEM

Marketing website and HR/operations portal for GARVHEM.

- **Public site**: services, dedicated talent with a savings calculator, contact form that creates leads.
- **Portal** (`/portal`): attendance, lunch, leave ledger, tasks, daily reports, leads CRM, employees, settings, audit log.

Built with Next.js 16, TypeScript, Tailwind CSS 4, Prisma 7 and PostgreSQL. Conventions and design decisions are in
[CLAUDE.md](CLAUDE.md).

## Run it locally

You need Node.js 20.19 or newer.

```bash
npm i
cp .env.example .env            # then set JWT_SECRET and CRON_SECRET
docker compose up -d            # PostgreSQL in Docker
npx prisma migrate dev          # create the tables
npm run seed                    # admin, employees, leave types, holidays
npm run dev                     # http://localhost:3000
```

No Docker? Run `npm run db:local` in a second terminal instead of `docker compose up -d`. It starts a real PostgreSQL
server from npm, with its data in `.local/pg`. Both use `127.0.0.1:5432` and the default `DATABASE_URL`.

Generate secrets with `openssl rand -base64 48`.

### First login

`npm run seed` prints temporary passwords **once** (unless you set `SEED_ADMIN_PASSWORD` and
`SEED_EMPLOYEE_PASSWORD`). Everyone must change theirs at the first login. Accounts use `SEED_EMAIL_DOMAIN`:

| Person                             | Email                 | Role     |
| ---------------------------------- | --------------------- | -------- |
| Hemant Singh                       | hemant@garvhem.com    | Admin    |
| Abhishek Chaudhary                 | abhishek@garvhem.com  | Employee |
| Yuvraj, Pushpendra, Rakshit, Mohit | firstname@garvhem.com | Employee |

Lost the printed passwords? Delete the database and seed again, or let the admin reset them under **Employees**.

`npm run seed:demo` also adds 30 days of sample activity. It refuses to run in production or on a remote database.

## Environment variables

Every variable is documented in [.env.example](.env.example) and validated at startup. Required:
`DATABASE_URL`, `APP_URL`, `JWT_SECRET`, `CRON_SECRET`. Everything else has a working default:

- **Email**: without a provider, emails are skipped and everything else works. Set `EMAIL_PROVIDER` to `smtp` or
  `resend` to send notifications and switch on password reset by email.
- **Turnstile**: set both keys to add the challenge to the lead form.
- **Upstash**: set both variables to move rate limiting from the database to Redis.

## Supabase

1. Create a project. Under **Connect**, copy two connection strings:
   - **Transaction pooler** (port 6543): use it as `DATABASE_URL`.
   - **Session pooler** (port 5432): use it as `DIRECT_URL` (migrations only).

   The _direct_ string (`db.<ref>.supabase.co`) is IPv6 only. It works from networks with IPv6 but **not from Vercel**.
   URL-encode special characters in the password (`@` becomes `%40`).

2. `npx prisma migrate deploy` creates the tables. It also enables row level security with no policies and removes
   the API roles' access, so nothing is readable through Supabase's public REST API.
3. `npm run seed` once. Save the printed passwords.
4. Files: create a **private** Storage bucket named `garvhem-private`, then set `STORAGE_PROVIDER=supabase`,
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose it).
5. Connections are encrypted and the server certificate is verified. Supabase's root certificate is built in
   (`src/lib/supabase-ca.ts`); other providers with a private CA need `DATABASE_CA_CERT`.

If your `.env` points at Supabase, `npm run dev` works on the **live** data. For experiments, put the local
`DATABASE_URL` in `.env` instead.

Never run `prisma migrate dev` or `prisma migrate reset` against Supabase: use `prisma migrate deploy`.

## Deploy to Vercel

1. Push the repository and import it in Vercel.
2. Add the variables: `DATABASE_URL`, `DIRECT_URL`, `APP_URL` (your https domain), `JWT_SECRET`, `CRON_SECRET`,
   `STORAGE_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the email ones if you use email.
   Use new secrets, not the local ones.
3. Deploy. [vercel.json](vercel.json) runs `prisma migrate deploy` before the build.
4. Seed once from your machine with the production `DATABASE_URL`.

Vercel limits request bodies to 4.5 MB, so larger attachments are refused there even though the app allows 10 MB.
Self-hosting (`npm run build && npm start`) has no such limit. Behind your own reverse proxy, set `TRUST_PROXY=true`
and make the proxy overwrite `X-Forwarded-For`: rate limits rely on it.

### Cron

`vercel.json` calls `/api/cron/daily` at 21:35 UTC (03:05 IST). It closes forgotten punch-outs and cleans old data.
Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Elsewhere, schedule:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/daily
```

If you change the auto-close cutoff in Settings, move the schedule to just after it. A missed run is harmless: the next
punch closes the old day too.

## How to

**Replace images and videos.** Put files in `public/media/` and point [src/config/media.ts](src/config/media.ts) at
them. [public/media/README.md](public/media/README.md) lists every file with its size and place. Until a file exists,
the site shows a generated visual.

**Change texts and prices.** Services, pricing, FAQ, industries, careers and testimonials live in `src/config/`.
Savings-calculator numbers are illustrative: check them in [src/config/pricing.ts](src/config/pricing.ts). Contact
details come from **Settings > Company**. Have a lawyer review `/privacy` and `/terms` before launch.

**Add a manager.** Log in as admin, open **Employees > Add employee**, choose the role _Manager_ and share the one-time
password. Then edit each team member and set that person as **Manager**. Extra rights (attendance corrections, balance
adjustments, leads) are switches under **Settings > Managers**, where you can also let managers see everyone.

**Reset a password.** Employees > person > **Reset password**. Temporary passwords made by an admin expire after
7 days.

**Start a new year of leave.** Leave requests > **Yearly allocation**. Running it twice never credits twice. Then add
the year's holidays under **Settings > Holidays**.

## Tests and checks

```bash
npm run lint
npm run typecheck
npm test            # unit tests: auth, permissions, attendance and leave maths
npm run test:e2e    # Playwright, production build, wipes the LOCAL garvhem_test database
npm run build
npm audit
```

The end-to-end tests use the local PostgreSQL server and installed Google Chrome. They refuse any database that is not
local and named `*_test`. With Docker, create it once:
`docker compose exec db createdb -U postgres garvhem_test`.

## Security notes

- 15-minute JWT access tokens and rotating refresh tokens in httpOnly cookies, with reuse detection.
- argon2id passwords, login lockout, rate limits, strict CSP with nonces, origin checks on every write.
- Every page, action and API checks permission and ownership on the server.
- Uploads are checked by magic bytes, stored outside `public/`, and streamed through authorised routes.
- Never commit `.env`. If a secret leaks, rotate it: changing `JWT_SECRET` signs everyone out.
