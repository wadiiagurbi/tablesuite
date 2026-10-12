-- Atomically provisions a brand-new tenant for the calling (already authenticated) user.
-- Runs as SECURITY DEFINER because ordinary RLS can't authorize creating the very
-- tenant_admins row that would authorize the insert.
create function create_tenant_for_user(tenant_name text, tenant_slug text)
returns tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant tenants;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to create a tenant';
  end if;

  if exists (select 1 from tenant_admins where user_id = auth.uid()) then
    raise exception 'this user already administers a restaurant';
  end if;

  insert into tenants (slug, name, status)
  values (tenant_slug, tenant_name, 'active')
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
end;
$$;

grant execute on function create_tenant_for_user(text, text) to authenticated;
