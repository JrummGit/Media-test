-- Playable previews per listing: an official 30-second audio clip (music) or a
-- trailer (film), matched in admin and approved by the owner.
-- Shape: { kind, provider, ref, url, title, attribution, link, enabled }
alter table items add column if not exists preview jsonb;
