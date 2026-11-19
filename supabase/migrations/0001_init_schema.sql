-- Core multi-tenant schema for the restaurant SaaS.
-- One row in `tenants` per restaurant; every other table is scoped by tenant_id.

create extension if not exists "pgcrypto";

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  address text,
  phone text,
  email text,
  hours jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('trial', 'active', 'suspended')),
  created_at timestamptz not null default now()
);

create table tenant_admins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  category_id uuid not null references menu_categories (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  date date not null,
  time text not null,
  guests text not null,
  occasion text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz not null default now()
);

create index on tenant_admins (user_id);
create index on menu_categories (tenant_id);
create index on menu_items (tenant_id, category_id);
create index on gallery_images (tenant_id);
create index on reservations (tenant_id);
create index on contact_messages (tenant_id);

-- Helper: is the current auth user an admin of the given tenant?
create function is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from tenant_admins
    where tenant_admins.tenant_id = target_tenant_id
      and tenant_admins.user_id = auth.uid()
  );
$$;

alter table tenants enable row level security;
alter table tenant_admins enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table gallery_images enable row level security;
alter table reservations enable row level security;
alter table contact_messages enable row level security;

-- tenants: public can read active tenants; admins can read/update their own.
create policy "public can read active tenants" on tenants
  for select using (status = 'active');

create policy "admins can read own tenant" on tenants
  for select using (is_tenant_admin(id));

create policy "admins can update own tenant" on tenants
  for update using (is_tenant_admin(id));

-- tenant_admins: a user can see their own membership rows only.
create policy "users can read own admin rows" on tenant_admins
  for select using (user_id = auth.uid());

-- menu_categories / menu_items / gallery_images: public read, admin full CRUD.
create policy "public can read menu categories" on menu_categories
  for select using (exists (select 1 from tenants where tenants.id = menu_categories.tenant_id and tenants.status = 'active'));

create policy "admins can manage menu categories" on menu_categories
  for all using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy "public can read available menu items" on menu_items
  for select using (
    is_available = true
    and exists (select 1 from tenants where tenants.id = menu_items.tenant_id and tenants.status = 'active')
  );

create policy "admins can manage menu items" on menu_items
  for all using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy "public can read gallery images" on gallery_images
  for select using (exists (select 1 from tenants where tenants.id = gallery_images.tenant_id and tenants.status = 'active'));

create policy "admins can manage gallery images" on gallery_images
  for all using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

-- reservations / contact_messages: anon can insert only; admins can read/update their own.
create policy "public can submit reservations" on reservations
  for insert with check (exists (select 1 from tenants where tenants.id = reservations.tenant_id and tenants.status = 'active'));

create policy "admins can read reservations" on reservations
  for select using (is_tenant_admin(tenant_id));

create policy "admins can update reservations" on reservations
  for update using (is_tenant_admin(tenant_id));

create policy "public can submit contact messages" on contact_messages
  for insert with check (exists (select 1 from tenants where tenants.id = contact_messages.tenant_id and tenants.status = 'active'));

create policy "admins can read contact messages" on contact_messages
  for select using (is_tenant_admin(tenant_id));

create policy "admins can update contact messages" on contact_messages
  for update using (is_tenant_admin(tenant_id));

-- Storage bucket for gallery photos: public read, tenant-admin write, keyed by gallery/{tenant_id}/...
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "public can read gallery bucket" on storage.objects
  for select using (bucket_id = 'gallery');

create policy "admins can upload to own tenant gallery folder" on storage.objects
  for insert with check (
    bucket_id = 'gallery'
    and is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

create policy "admins can delete from own tenant gallery folder" on storage.objects
  for delete using (
    bucket_id = 'gallery'
    and is_tenant_admin((storage.foldername(name))[1]::uuid)
  );
