# GrumpyWhales

Paid-event hosting for UK organisers. Create an event (one-off or recurring), share a link, attendees sign up per session and pay by card. Hosts pick the final attendee list when running curated events, mark attendance after each session, and publish a notification email with one click.

## Stack

- Next.js 16 (App Router) + Tailwind v4 + TypeScript
- Supabase (Postgres + service_role from server only)
- NextAuth (Google + email/password)
- Stripe (card payments — test mode by default)
- Mapbox (UK address autocomplete on the location field)
- Resend (transactional email)
- Vercel (hosting)

## Local setup

```bash
cp .env.example .env.local        # fill in real values
npm install
npm run dev
```

## First-time database setup

Open Supabase SQL editor and run `db/schema.sql` once, then every `db/migration_*.sql` in numeric order.

## Architecture notes

- Server-side Supabase calls go through `lib/supabase-admin.ts` (service_role). The anon client in `lib/supabase.ts` is kept for future client-side use but currently unused.
- All public tables have RLS enabled with **zero policies** — the anon key in the browser bundle has no read/write access. Anything the browser needs goes through an API route.
- Event signups are per-(event × profile × occurrence_date) so each session of a recurring event has its own roster and payment.
- Stripe checkout uses the signup id as `client_reference_id`; the webhook flips `payment_status` to `'paid'`, and the post-checkout redirect verifies synchronously via `stripe.checkout.sessions.retrieve` so users don't have to wait for the webhook.
