-- Fires the notify-reservation / notify-contact-message Edge Functions whenever a row
-- is inserted, regardless of whether the insert came from the public site's forms or
-- directly through the API — the client never decides whether a notification is sent.
--
-- Project URL and the Edge Function invocation secret are read from Supabase Vault
-- rather than hardcoded here, since this migration file is committed to source control.
-- One-time setup after linking this migration to a real Supabase project (see README):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<anon-or-dedicated-invoke-key>', 'edge_function_key');

create extension if not exists pg_net;

create function notify_edge_function(function_name text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text;
  edge_function_key text;
begin
  select decrypted_secret into project_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into edge_function_key
    from vault.decrypted_secrets where name = 'edge_function_key';

  if project_url is null or edge_function_key is null then
    -- Vault secrets not configured yet (e.g. local dev without them set) — skip silently
    -- rather than failing the insert that triggered this.
    return;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || edge_function_key
    ),
    body := payload
  );
end;
$$;

create function handle_new_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform notify_edge_function('notify-reservation', jsonb_build_object('record', row_to_json(new)));
  return new;
end;
$$;

create trigger on_reservation_created
  after insert on reservations
  for each row execute function handle_new_reservation();

create function handle_new_contact_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform notify_edge_function('notify-contact-message', jsonb_build_object('record', row_to_json(new)));
  return new;
end;
$$;

create trigger on_contact_message_created
  after insert on contact_messages
  for each row execute function handle_new_contact_message();
