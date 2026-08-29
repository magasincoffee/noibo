-- MAGASIN NOIBO — stable initial store identities
-- Store codes are logical identities and intentionally do not contain physical addresses.
-- Physical locations can be modeled separately later without changing CN1..CN4.
insert into public.stores (code, name, status, notes)
values
  ('CN1', 'MAGASIN COFFEE CN1', 'ACTIVE', null),
  ('CN2', 'MAGASIN COFFEE CN2', 'ACTIVE', null),
  ('CN3', 'MAGASIN COFFEE CN3', 'ACTIVE', null),
  ('CN4', 'MAGASIN COFFEE CN4', 'ACTIVE', null)
on conflict (code) do update
set name = excluded.name,
    status = excluded.status,
    notes = excluded.notes,
    updated_at = now();
