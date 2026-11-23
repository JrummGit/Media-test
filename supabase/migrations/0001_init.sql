-- Press Play Media: initial schema
create extension if not exists "pgcrypto";

create type media_format as enum ('vhs', 'cassette', 'cd');
create type item_status as enum ('draft', 'active', 'reserved', 'sold');
create type image_role as enum ('front', 'back', 'spine', 'inside', 'disc', 'detail');

create table items (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  creator         text not null,
  format          media_format not null,
  release_year    int not null check (release_year between 1950 and 2100),
  decade          int generated always as ((release_year / 10) * 10) stored,
  genres          text[] not null default '{}',
  tags            text[] not null default '{}',
  condition       text not null,
  sealed          boolean not null default false,
  notes           text,
  price_cents     int not null check (price_cents >= 0),
  shipping_class  text not null default 'standard',
  status          item_status not null default 'draft',
  reserved_until  timestamptz,
  featured        boolean not null default false,
  accent          text,
  etsy_listing_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index items_status_format_idx on items (status, format);

create table item_images (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items(id) on delete cascade,
  role         image_role not null,
  storage_path text not null,
  width        int not null,
  height       int not null,
  sort         int not null default 0
);
create index item_images_item_idx on item_images (item_id);

create table orders (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  email             text,
  item_ids          uuid[] not null,
  subtotal_cents    int not null,
  shipping_cents    int not null default 0,
  tax_cents         int not null default 0,
  total_cents       int not null,
  shipping_address  jsonb,
  status            text not null default 'paid', -- paid | shipped | refunded
  tracking_number   text,
  created_at        timestamptz not null default now(),
  shipped_at        timestamptz
);

create table trend_reports (
  id                    uuid primary key default gen_random_uuid(),
  run_at                timestamptz not null default now(),
  summary_md            text not null,
  signals               jsonb not null default '[]',
  matched_item_ids      uuid[] not null default '{}',
  suggestions_to_source jsonb not null default '[]'
);

create table promotions (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references items(id) on delete cascade,
  reason     text not null,
  source     text not null default 'manual', -- manual | trend_agent
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz
);

-- Row level security: the public can read live listings and their images;
-- every write goes through the server with the service role key.
alter table items enable row level security;
alter table item_images enable row level security;
alter table orders enable row level security;
alter table trend_reports enable row level security;
alter table promotions enable row level security;

create policy "public reads live items" on items
  for select using (status in ('active', 'reserved'));
create policy "public reads images of live items" on item_images
  for select using (exists (
    select 1 from items i where i.id = item_id and i.status in ('active', 'reserved')
  ));
create policy "public reads active promotions" on promotions
  for select using (starts_at <= now() and (ends_at is null or ends_at > now()));

-- Public bucket for listing photos.
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;
