-- DDL for parlay tables. Run this in Supabase SQL editor.
create table if not exists public.active_parlays (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('basketball','football','soccer')),
  player_id text not null,
  player_name text not null,
  team text,
  opponent text,
  stat text not null,
  line numeric not null,
  base_prob numeric,
  secondary_stats jsonb default '[]'::jsonb,
  raw_markets jsonb,
  source text default 'seed',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(player_id, stat)
);

create table if not exists public.history_parlays (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  player_id text not null,
  player_name text not null,
  stat text not null,
  line numeric not null,
  base_prob numeric,
  hit boolean,
  settled_at timestamptz,
  source text default 'seed',
  created_at timestamptz default now()
);

create index if not exists idx_active_parlays_sport on public.active_parlays(sport);
create index if not exists idx_history_parlays_player_stat on public.history_parlays(player_id, stat);

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_active_parlays_updated on public.active_parlays;
create trigger trg_active_parlays_updated
before update on public.active_parlays
for each row execute function public.set_updated_at();

-- (Optional) RLS enable & simple policy (adjust as needed)
alter table public.active_parlays enable row level security;
alter table public.history_parlays enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='active_parlays' and policyname='Allow all read'
  ) then
    create policy "Allow all read" on public.active_parlays for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename='history_parlays' and policyname='Allow all read'
  ) then
    create policy "Allow all read" on public.history_parlays for select using (true);
  end if;
end $$;
