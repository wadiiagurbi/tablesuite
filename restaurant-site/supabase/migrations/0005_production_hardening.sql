-- Production hardening: close RLS gaps, enforce data integrity, add delivery log.
-- Safe to apply on top of 0001-0004 on any environment (all statements are
-- additive except policy replacements, which are dropped + recreated).

-- 1. Lock down SECURITY DEFINER helpers: never directly callable via PostgREST.
-- NOTE: is_tenant_admin is deliberately NOT revoked: RLS policies evaluate it
-- as the querying user, so revoking EXECUTE would break every table read.
revoke all on function notify_edge_function(text, jsonb) from public;
revoke all on function handle_new_reservation() from public;
revoke all on function handle_new_contact_message() from public;
revoke all on function create_tenant_for_user(text, text) from public;
grant execute on function create_tenant_for_user(text, text) to authenticated;

-- 2. Anon must not forge status on insert: force clean defaults.
drop policy if exists "public can submit reservations" on reservations;
create policy "public can submit reservations" on reservations
  for insert with check (
    status = 'pending'
    and exists (select 1 from tenants where tenants.id = reservations.tenant_id and tenants.status = 'active')
  );

drop policy if exists "public can submit contact messages" on contact_messages;
create policy "public can submit contact messages" on contact_messages
  for insert with check (
    status = 'new'
    and exists (select 1 from tenants where tenants.id = contact_messages.tenant_id and tenants.status = 'active')
  );

-- 3. Menu items must belong to a category of the same tenant.
create or replace function check_menu_item_tenant()
returns trigger
language plpgsql
as $$
declare
  cat_tenant uuid;
begin
  select tenant_id into cat_tenant from menu_categories where id = new.category_id;
  if cat_tenant is null or cat_tenant <> new.tenant_id then
    raise exception 'category does not belong to this tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists menu_item_tenant_check on menu_items;
create trigger menu_item_tenant_check
  before insert or update on menu_items
  for each row execute function check_menu_item_tenant();

-- 4a. Idempotency keys for seed + admin flows.
alter table menu_items
  add constraint menu_items_tenant_category_name_unique unique (tenant_id, category_id, name);
alter table gallery_images
  add constraint gallery_images_tenant_path_unique unique (tenant_id, storage_path);

-- 4b. One restaurant per user, enforced at the database level (race-safe).
create unique index if not exists one_tenant_per_user on tenant_admins (user_id);

-- 5. Validate tenant slug + name at creation (routing-safe slugs only).
create or replace function create_tenant_for_user(tenant_name text, tenant_slug text)
returns tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
  clean_slug text;
  new_tenant tenants;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to create a tenant';
  end if;

  clean_name := btrim(coalesce(tenant_name, ''));
  clean_slug := lower(btrim(coalesce(tenant_slug, '')));
  if clean_name = '' then
    raise exception 'restaurant name must not be empty';
  end if;
  if clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(clean_slug) < 3 or char_length(clean_slug) > 63 then
    raise exception 'slug must be 3-63 chars of lowercase letters, numbers, and single hyphens';
  end if;

  if exists (select 1 from tenant_admins where user_id = auth.uid()) then
    raise exception 'this user already administers a restaurant';
  end if;

  insert into tenants (slug, name, status)
  values (clean_slug, clean_name, 'active')
  returning * into new_tenant;

  insert into tenant_admins (tenant_id, user_id, role)
  values (new_tenant.id, auth.uid(), 'owner');

  insert into menu_categories (tenant_id, name, sort_order)
  values
    (new_tenant.id, 'Appetizers', 0),
    (new_tenant.id, 'Mains', 1),
    (new_tenant.id, 'Desserts', 2),
    (new_tenant.id, 'Drinks', 3);

  return new_tenant;
exception
  when unique_violation then
    raise exception 'that restaurant URL is already taken';
end;
$$;

-- 6. Admins can delete spam from their own inboxes.
create policy "admins can delete reservations" on reservations
  for delete using (is_tenant_admin(tenant_id));
create policy "admins can delete contact messages" on contact_messages
  for delete using (is_tenant_admin(tenant_id));

-- 7. Storage: safe folder-to-tenant resolution (malformed keys deny, not 500).
create or replace function storage_folder_tenant(object_name text)
returns uuid
language sql
stable
as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
    else null
  end;
$$;

-- Suspended/trial tenants: files no longer publicly readable.
drop policy if exists "public can read gallery bucket" on storage.objects;
create policy "public can read gallery bucket" on storage.objects
  for select using (
    bucket_id = 'gallery'
    and exists (
      select 1 from tenants
      where tenants.id = storage_folder_tenant(name)
        and tenants.status = 'active'
    )
  );

drop policy if exists "admins can upload to own tenant gallery folder" on storage.objects;
create policy "admins can upload to own tenant gallery folder" on storage.objects
  for insert with check (
    bucket_id = 'gallery'
    and is_tenant_admin(storage_folder_tenant(name))
  );

-- Upsert (re-upload) needs an UPDATE policy; plain upload does not.
create policy "admins can update own tenant gallery folder" on storage.objects
  for update using (
    bucket_id = 'gallery'
    and is_tenant_admin(storage_folder_tenant(name))
  )
  with check (
    bucket_id = 'gallery'
    and is_tenant_admin(storage_folder_tenant(name))
  );

drop policy if exists "admins can delete from own tenant gallery folder" on storage.objects;
create policy "admins can delete from own tenant gallery folder" on storage.objects
  for delete using (
    bucket_id = 'gallery'
    and is_tenant_admin(storage_folder_tenant(name))
  );

-- 8. Notification delivery log: every trigger attempt recorded, functions report back.
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  function_name text not null,
  record_id uuid,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  last_error text,
  attempts int not null default 1,
  created_at timestamptz not null default now()
);
alter table notification_log enable row level security;
-- No public/authenticated access: only service_role (Edge Functions) writes.
drop policy if exists "service full access notification log" on notification_log;
create policy "service full access notification log" on notification_log
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 9. Webhook sender: fail loudly when secrets are missing, log + pass log id.
create or replace function notify_edge_function(function_name text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text;
  edge_function_key text;
  log_id uuid;
begin
  select decrypted_secret into project_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into edge_function_key
    from vault.decrypted_secrets where name = 'edge_function_key';

  if project_url is null or edge_function_key is null then
    -- Loud in Postgres logs so a prod misconfiguration can never look healthy.
    -- The triggering insert still succeeds: a missing email must never lose
    -- a paying guest's reservation.
    raise warning 'notification secrets missing (project_url / edge_function_key): skipping % call', function_name;
    return;
  end if;

  -- The log insert must never break the guest's reservation: any failure here
  -- only loses observability, never data.
  begin
    insert into notification_log (function_name, record_id)
    values (function_name, nullif(payload -> 'record' ->> 'id', '')::uuid)
    returning id into log_id;
  exception when others then
    log_id := null;
  end;

  perform net.http_post(
    url := project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || edge_function_key
    ),
    body := jsonb_build_object('record', payload -> 'record', 'log_id', log_id)
  );
end;
$$;
