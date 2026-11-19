<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1c1410,50:b8541f,100:f3d9b1&height=200&section=header&text=🍕%20TableSuite&fontSize=56&fontColor=ffffff&fontAlignY=38&desc=Every%20restaurant%20gets%20its%20own%20website,%20in%20minutes&descAlignY=60&descSize=18&animation=fadeIn" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" />
</p>

<p align="center">
  <b>Multi-tenant</b> · <b>Row Level Security</b> · <b>Edge Functions</b> · <b>47 tests</b> · <b>No server to run</b>
</p>

---

**TableSuite** is a multi-tenant website builder for independent restaurants. A restaurant owner signs up, goes through a short onboarding, and gets their **own public site**: menu, gallery, reservations and contact. They manage it all from an admin dashboard. Every restaurant's data stays private from the others, enforced by the database itself.

<p align="center">
  <img src="docs/screenshots/landing.png" width="49%" alt="TableSuite landing page" />
  <img src="docs/screenshots/tenant-site.png" width="49%" alt="A restaurant site made with TableSuite" />
</p>

## ✨ Features

**For restaurant owners**
- 🚀 **Sign up → onboarding → live site.** Each restaurant gets its own site at `/site/<slug>`
- 🍽️ **Menu manager:** categories, dishes, prices
- 🖼️ **Gallery manager:** upload photos to Supabase Storage, publish or hide them
- 📅 **Reservations inbox** and 💬 **contact inbox**, with **email notifications** for new requests
- ⚙️ **Restaurant settings:** name, address, hours, phone

**For their guests**
- A clean, fast public site: Home · Menu · About · Gallery · Reservations · Contact
- Gallery lightbox, scroll-driven chapters, reveal animations and a mobile-first layout

**Under the hood**
- 🔒 **Row Level Security** keeps tenants apart, enforced by Postgres, not by app code
- 🪝 **Notifications fire from Postgres webhooks** → Edge Functions → email, so they work even if someone skips the UI
- 🛡️ **Production hardening:** a locked-down RPC, guards against status forgery, storage policies and a notification delivery log
- 🧊 **3D pizza hero** on the landing page, built with React Three Fiber

<p align="center">
  <img src="docs/screenshots/gallery.png" width="49%" alt="Restaurant gallery page" />
  <img src="docs/screenshots/reservations.png" width="49%" alt="Reservation form" />
</p>

## 🏗️ Architecture

```
Browser (React SPA)
   │  supabase-js (anon key, RLS applies)
   ▼
Supabase ── Postgres (schema + RLS + RPC) ── Storage (gallery photos)
   │  database webhook on new reservation / message
   ▼
Edge Functions (notify-reservation, notify-contact-message) ──▶ Resend email
```

- **Tenancy is path-based** (`/site/<slug>/...`), so no wildcard DNS or certificates are needed. Moving to subdomains only means changing the slug lookup in `src/context/TenantContext.jsx`.
- **No backend server.** The app builds to static files and runs on Vercel, Netlify or any static host. `vercel.json` and `public/_redirects` handle deep links.

```
tablesuite/
├── src/
│   ├── pages/            public site · admin/ · auth/ · onboarding/ · marketing/
│   ├── components/       Navbar · ScrollChapters · PizzaScene · SteamCanvas · Reveal…
│   ├── context/          Auth · Tenant · AdminTenant
│   ├── hooks/            useMenu · useGallery
│   └── layouts/          TenantLayout · AdminLayout
├── supabase/
│   ├── migrations/       0001 schema+RLS → 0006 analytics & gallery publishing
│   ├── functions/        email notification Edge Functions
│   └── seed*.mjs         demo tenants: The Golden Fork, Ember & Oak
└── public/               favicon, icons, static-host redirects
```

## 🚀 Getting started

**Requirements:** Node 20+, a [Supabase](https://supabase.com) project (or the Supabase CLI for a local stack)

```sh
git clone https://github.com/wadiiagurbi/tablesuite.git
cd tablesuite
npm install
cp .env.example .env.local   # add your Supabase URL + anon key
```

**1. Database:** link your project and run the migrations

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

**2. Email notifications** (optional). Deploy the functions and set their secrets:

```sh
supabase functions deploy notify-reservation --no-verify-jwt
supabase functions deploy notify-contact-message --no-verify-jwt
supabase secrets set EDGE_FUNCTION_SHARED_SECRET=<random-secret> RESEND_API_KEY=<key> RESEND_FROM=<sender>
```

Then store the same secret and your project URL in Supabase Vault, so the database webhooks can call the functions:

```sql
select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
select vault.create_secret('<random-secret>', 'edge_function_key');
```

> Use a dedicated secret (`openssl rand -hex 32`), never the anon key. Without `RESEND_API_KEY`, the functions log the email instead of sending it.

**3. Demo data** (optional)

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

**4. Run it**

```sh
npm run dev
```

Open `/` for the landing page, `/site/golden-fork` for the demo restaurant, or sign up at `/signup` to create your own.

## 🧪 Scripts

```sh
npm run dev      # dev server
npm test         # 47 Vitest + Testing Library tests
npm run lint     # oxlint
npm run build    # static build → dist/
npm run check    # lint + test + build
```

## 🗺️ Roadmap

- 💳 Billing and subscriptions
- 🌐 Subdomains and custom domains per restaurant
- ⚙️ CI/CD

---

<p align="center">
  My first full SaaS 🍕 Made by <a href="https://github.com/wadiiagurbi">wadiiagurbi</a> · MIT License
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:f3d9b1,50:b8541f,100:1c1410&height=110&section=footer" width="100%" />
</p>
