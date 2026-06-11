# GrumpyWhales

Invoice-tracking SaaS for UK freelancers and small businesses. Send invoices, automatically detect bank payments via Plaid Open Banking, chase overdue clients, thank them when they pay.

## Stack

- Next.js 16 (App Router) + Tailwind v4 + TypeScript
- Supabase (Postgres + service_role from server only)
- NextAuth (Google + email/password)
- Plaid (UK Open Banking, sandbox to start)
- Resend (transactional email)
- Vercel (hosting + cron)

## Local setup

```bash
cp .env.example .env.local        # fill in real values
npm install
npm run dev
```

## First-time database setup

Open Supabase SQL editor and run `db/schema.sql` once.

## Architecture notes

- Server-side Supabase calls go through `lib/supabase-admin.ts` (service_role). The anon client in `lib/supabase.ts` is kept for future client-side use but currently unused.
- All public tables have RLS enabled with **zero policies** — the anon key in the browser bundle has no read/write access. Anything the browser needs goes through an API route.
- Plaid amounts are flipped on ingest: positive = money in.
