-- Checkout holds: an item is reserved while its buyer is on Stripe Checkout.

alter table items add column if not exists hold_token text;
create index if not exists items_hold_token_idx on items (hold_token);

-- Orders reference items by slug (stable, human-readable in the dashboard).
alter table orders drop column if exists item_ids;
alter table orders add column if not exists item_slugs text[] not null default '{}';

-- Reserve every slug or none. A hold whose time ran out can be taken over.
create or replace function reserve_items(p_slugs text[], p_token text, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update items
     set status = 'reserved', hold_token = p_token, reserved_until = p_until, updated_at = now()
   where slug = any (p_slugs)
     and (status = 'active' or (status = 'reserved' and reserved_until < now()));
  get diagnostics n = row_count;
  if n <> cardinality(p_slugs) then
    raise exception 'ITEMS_UNAVAILABLE';  -- rolls back the update above
  end if;
end;
$$;

create or replace function release_items(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update items
     set status = 'active', hold_token = null, reserved_until = null, updated_at = now()
   where hold_token = p_token and status = 'reserved';
$$;

create or replace function mark_items_sold(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update items
     set status = 'sold', reserved_until = null, updated_at = now()
   where hold_token = p_token;
$$;

-- Only the server (service role) may change holds.
revoke all on function reserve_items(text[], text, timestamptz) from public, anon, authenticated;
revoke all on function release_items(text) from public, anon, authenticated;
revoke all on function mark_items_sold(text) from public, anon, authenticated;
