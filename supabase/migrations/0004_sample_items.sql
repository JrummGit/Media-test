-- Sample inventory support: a cover background colour for generated previews,
-- and a flag so the sample items can be removed in one step:
--   delete from items where is_sample;
alter table items add column if not exists ground text;
alter table items add column if not exists is_sample boolean not null default false;
