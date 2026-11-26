-- Newer Supabase projects grant nothing to the API roles by default, so each
-- role gets exactly what it needs. Row level security (0001) still decides
-- which rows the public can see.

-- Shoppers (publishable key): read-only listings, images and promotions.
grant usage on schema public to anon, authenticated, service_role;
grant select on items, item_images, promotions to anon, authenticated;

-- The shop's server (secret key): everything, including orders and reports.
grant select, insert, update, delete on items, item_images, orders, trend_reports, promotions to service_role;
grant execute on function reserve_items(text[], text, timestamptz) to service_role;
grant execute on function release_items(text) to service_role;
grant execute on function mark_items_sold(text) to service_role;
