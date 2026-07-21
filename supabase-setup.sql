-- Shared cloud state for the Seoul × Busan travel site.
-- Run this entire file once in Supabase Dashboard → SQL Editor.

create table if not exists public.trip_shared_state (
  trip_id text primary key,
  itinerary jsonb not null default '[]'::jsonb,
  bookings jsonb not null default '[]'::jsonb,
  packing jsonb not null default '[]'::jsonb,
  entry_tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.trip_shared_state enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.trip_shared_state to anon;

drop policy if exists "public trip read" on public.trip_shared_state;
drop policy if exists "public trip insert" on public.trip_shared_state;
drop policy if exists "public trip update" on public.trip_shared_state;

create policy "public trip read"
on public.trip_shared_state
for select
to anon
using (trip_id = 'seoul-busan-2026');

create policy "public trip insert"
on public.trip_shared_state
for insert
to anon
with check (trip_id = 'seoul-busan-2026');

create policy "public trip update"
on public.trip_shared_state
for update
to anon
using (trip_id = 'seoul-busan-2026')
with check (trip_id = 'seoul-busan-2026');

do $$
begin
  alter publication supabase_realtime add table public.trip_shared_state;
exception
  when duplicate_object then null;
end $$;
