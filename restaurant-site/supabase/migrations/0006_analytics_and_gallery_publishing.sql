alter table reservations
  add column revenue_amount numeric(10, 2) check (revenue_amount is null or revenue_amount >= 0);

alter table gallery_images
  add column is_published boolean not null default true;

drop policy if exists "public can read gallery images" on gallery_images;
create policy "public can read published gallery images" on gallery_images
  for select using (
    is_published = true
    and exists (
      select 1 from tenants
      where tenants.id = gallery_images.tenant_id
        and tenants.status = 'active'
    )
  );