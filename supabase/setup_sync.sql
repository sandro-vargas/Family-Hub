-- ============================================================================
-- Family Hub: Vollständiges Supabase Echtzeit-Schema & Multi-Geräte Synchronisation
-- In den Supabase SQL Editor einfügen und auf "RUN" klicken.
-- ============================================================================

-- 1. HAUSHALTE
create table if not exists public.households (
  id text primary key,
  name text not null default 'Family Hub',
  default_portions int not null default 4,
  weather_lat numeric(8,5) not null default 47.29720,
  weather_lon numeric(8,5) not null default 8.76110,
  weather_location_name text not null default '8624 Grüt (ZH)',
  created_at timestamptz not null default now()
);

-- 2. HAUSHALTSMITGLIEDER
create table if not exists public.household_members (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  display_name text not null,
  short_code text not null,
  color_hex text not null default '#74956C',
  role text not null default 'adult',
  is_selectable_actor boolean not null default true,
  gamification_points int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. STORE KATEGORIEN
create table if not exists public.store_categories (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text not null default 'ShoppingBag',
  sort_order int not null default 100,
  is_default boolean not null default false
);

-- 4. EINKAUFSLISTE
create table if not exists public.shopping_items (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity numeric(10,2),
  unit text,
  store_category_slug text not null default 'other',
  source_meal_plan_id text,
  is_checked boolean not null default false,
  checked_at timestamptz,
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now()
);

-- 5. HAUSHALTSBEDARF (Bedarf / ehemals Galaxus)
create table if not exists public.household_needs (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  product_url text,
  image_url text,
  merchant text,
  notes text,
  priority text not null default 'normal',
  is_purchased boolean not null default false,
  purchased_at timestamptz,
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now()
);

-- 6. FAMILIEN-TODOS
create table if not exists public.todos (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  notes text,
  category_slug text not null default 'family',
  priority text not null default 'normal',
  assigned_member_id text references public.household_members(id) on delete set null,
  due_date text,
  is_completed boolean not null default false,
  completed_by_member_id text references public.household_members(id) on delete set null,
  completed_at timestamptz,
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now()
);

-- 7. REZEPTE
create table if not exists public.recipes (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  base_portions int not null default 4,
  prep_time_minutes int,
  cooking_method text not null default 'standard',
  instructions jsonb not null default '[]'::jsonb,
  thermomix_steps jsonb default '[]'::jsonb,
  cookidoo_recipe_url text,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  ingredients jsonb not null default '[]'::jsonb,
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now()
);

-- 8. ESSENSWÜNSCHE
create table if not exists public.meal_wishes (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  notes text,
  preferred_cooking_method text not null default 'standard',
  linked_recipe_id text references public.recipes(id) on delete set null,
  is_fulfilled boolean not null default false,
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now()
);

-- 9. ESSENSPLANUNG
create table if not exists public.meal_plans (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  planned_date text not null,
  slot_type text not null default 'dinner',
  custom_title text not null,
  recipe_id text references public.recipes(id) on delete set null,
  portions int not null default 4,
  includes_next_day_lunch boolean not null default true,
  cooking_method text not null default 'standard',
  cookidoo_url text,
  notes text,
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now()
);

-- 10. FAMILIENKALENDER
create table if not exists public.calendar_events (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  assigned_member_ids text[] not null default '{}',
  category text not null default 'family',
  source_meal_plan_id text,
  source_todo_id text,
  external_url text,
  external_calendar_id text,
  external_event_id text,
  recurrence_rule text,
  sync_status text default 'pending',
  created_by_member_id text not null references public.household_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- BASISDATEN (HAUSHALT & FAMILIENMITGLIEDER)
-- ============================================================================
insert into public.households (id, name, default_portions, weather_lat, weather_lon, weather_location_name)
values ('00000000-0000-4000-a000-000000000001', 'Family Hub', 4, 47.29720, 8.76110, '8624 Grüt (ZH)')
on conflict (id) do update set 
  weather_location_name = excluded.weather_location_name;

insert into public.household_members (id, household_id, display_name, short_code, color_hex, role, is_selectable_actor, gamification_points)
values 
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000001', 'Sandro', 'SA', '#74956C', 'adult', true, 120),
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000001', 'Jenni', 'JE', '#5CA6CE', 'adult', true, 145),
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000001', 'Chiara', 'CH', '#EAB308', 'child', false, 85),
  ('00000000-0000-4000-a000-000000000104', '00000000-0000-4000-a000-000000000001', 'Wand-iPad', 'IP', '#3B82A6', 'kiosk', false, 0)
on conflict (id) do update set 
  display_name = excluded.display_name,
  short_code = excluded.short_code,
  color_hex = excluded.color_hex;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FÜR DIE FAMILIEN-APP (ANON & AUTH)
-- ============================================================================
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.store_categories enable row level security;
alter table public.shopping_items enable row level security;
alter table public.household_needs enable row level security;
alter table public.todos enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_wishes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.calendar_events enable row level security;

-- Existierende restriktive Policies sicher entfernen
drop policy if exists "Family access households" on public.households;
drop policy if exists "Family access household_members" on public.household_members;
drop policy if exists "Family access store_categories" on public.store_categories;
drop policy if exists "Family access shopping_items" on public.shopping_items;
drop policy if exists "Family access household_needs" on public.household_needs;
drop policy if exists "Family access todos" on public.todos;
drop policy if exists "Family access recipes" on public.recipes;
drop policy if exists "Family access meal_wishes" on public.meal_wishes;
drop policy if exists "Family access meal_plans" on public.meal_plans;
drop policy if exists "Family access calendar_events" on public.calendar_events;

-- Freigabe für Family-Hub Lese- und Schreibzugriff
create policy "Family access households" on public.households for all using (true) with check (true);
create policy "Family access household_members" on public.household_members for all using (true) with check (true);
create policy "Family access store_categories" on public.store_categories for all using (true) with check (true);
create policy "Family access shopping_items" on public.shopping_items for all using (true) with check (true);
create policy "Family access household_needs" on public.household_needs for all using (true) with check (true);
create policy "Family access todos" on public.todos for all using (true) with check (true);
create policy "Family access recipes" on public.recipes for all using (true) with check (true);
create policy "Family access meal_wishes" on public.meal_wishes for all using (true) with check (true);
create policy "Family access meal_plans" on public.meal_plans for all using (true) with check (true);
create policy "Family access calendar_events" on public.calendar_events for all using (true) with check (true);

-- ============================================================================
-- SUPABASE REALTIME (WEBSOCKETS) SCHALTUNG
-- ============================================================================
alter table public.shopping_items replica identity full;
alter table public.household_needs replica identity full;
alter table public.todos replica identity full;
alter table public.calendar_events replica identity full;
alter table public.meal_plans replica identity full;
alter table public.meal_wishes replica identity full;
alter table public.recipes replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.shopping_items;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.household_needs;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.todos;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.calendar_events;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.meal_plans;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.meal_wishes;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.recipes;
  exception when duplicate_object then null; end;
end
$$;

