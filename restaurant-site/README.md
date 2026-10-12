# Restaurant SaaS

A multi-tenant site builder for restaurants: each signed-up restaurant gets its own
public site (menu, gallery, reservations, contact) at `/site/<slug>`, managed from an
admin dashboard at `/admin`. Frontend is React + Vite + Tailwind; the backend is
Supabase (Postgres, Auth, Storage, Edge Functions) — there is no separate server to run.

## Local setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) (or run
   `supabase start` locally if you have the [Supabase CLI](https://supabase.com/docs/guides/cli)
   installed, using the config already in `supabase/config.toml`).

3. **Apply the database schema.** Using the Supabase CLI, linked to your project:
   ```
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
    This runs the migrations in `supabase/migrations/` — schema, Row Level Security
    policies, the `create_tenant_for_user` function, the reservation/contact
    notification triggers, and the production hardening in `0005` (locked-down
    RPC, status-forgery guards, storage policies, notification delivery log).

4. **Configure environment variables.** Copy `.env.example` to `.env.local` and fill in
   your project's URL and anon key (Project Settings → API in the Supabase dashboard).

5. **Deploy the Edge Functions** that send email notifications (with gateway JWT
    verification off — these functions verify a dedicated shared secret in code
    instead, so the DB webhook's secret reaches the in-code check):
    ```
    supabase functions deploy notify-reservation --no-verify-jwt
    supabase functions deploy notify-contact-message --no-verify-jwt
    supabase secrets set EDGE_FUNCTION_SHARED_SECRET=<the-secret-from-step-6> RESEND_API_KEY=<your-resend-api-key> RESEND_FROM=<verified-sender-email>
    ```
    (Any transactional email provider works — the functions in
    `supabase/functions/` call [Resend](https://resend.com)'s API directly; swap it out
    if you use something else. Without `RESEND_API_KEY` they log instead of sending.)

6. **Wire up the notification triggers to your Edge Functions**, since the migration
    reads these from Supabase Vault rather than hardcoding them (they're project-specific
    secrets, so they don't belong in a committed SQL file). Generate one dedicated
    random secret — NOT the anon key, which ships to every browser and is public by
    design — and store the same value on both sides:
    ```bash
    openssl rand -hex 32   # save this value
    ```
    ```sql
    select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
    select vault.create_secret('<the-secret-from-above>', 'edge_function_key');
    ```
    Until both sides share the same secret the functions fail closed (500/401) and no
    notification email is sent. See `supabase/migrations/0004_webhook_shared_secret.sql`
    if you previously stored the anon key and need to replace it.

7. **Seed the demo tenant** ("The Golden Fork") — optional, but useful to see the
   product working end-to-end:
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
   ```
   Real photos can be dropped into `supabase/seed-assets/gallery/` first (see the
   README there); anything missing gets a generated placeholder tile instead of a
   broken image.

8. **Run the app**
   ```
   npm run dev
   ```
   Visit `/` for the marketing/signup page, `/site/golden-fork` for the seeded demo
   site, or sign up as a new restaurant owner and go through `/signup` → `/onboarding`.

## Deploying

The app builds to static files (`npm run build` → `dist/`) and can be hosted on any
static host. `vercel.json` and `public/_redirects` are included so deep links like
`/site/golden-fork/menu` or `/admin/menu` resolve correctly on Vercel or Netlify.

## Architecture notes

- **Tenancy** is path-based (`/site/<slug>/...`) rather than subdomain-based, so no
  wildcard DNS/certs are required. Subdomains are a natural later upgrade — only the
  slug-resolution step in `src/context/TenantContext.jsx` would need to change.
- **Row Level Security** in `supabase/migrations/0001_init_schema.sql` is what actually
  keeps one restaurant's data private from another's admin — not application code.
- **Reservation and contact notifications** are triggered by Postgres Database Webhooks
  (`supabase/migrations/0003_notification_webhooks.sql`), not by the browser, so a
  notification fires even if a submission bypasses the UI.

## Not in scope yet

Billing/subscriptions, CI/CD, automated tests, analytics, and subdomain-based tenancy
with custom domains per restaurant are all deliberately left for a later pass.
