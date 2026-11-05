-- ============================================================================
-- Migration: 0001_initial_schema.sql
-- Projekt:   Familien-Applikation ("Ernesto Vargas" Family Edition)
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. HAUSHALTE
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Family Hub',
  default_portions int not null default 4,
  weather_lat numeric(8,5) not null default 47.29720,
  weather_lon numeric(8,5) not null default 8.76110,
  weather_location_name text not null default '8624 Grüt (ZH)',
  created_at timestamptz not null default now()
);

-- 2. HAUSHALTSMITGLIEDER (inkl. iPad-Kiosk-Unterstützung & V2 Gamification-Punkte)
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  short_code text not null,
  color_hex text not null default '#74956C',
  role text not null default 'adult' check (role in ('adult', 'child', 'kiosk')),
  is_selectable_actor boolean not null default true,
  gamification_points int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, auth_user_id)
);

create index idx_household_members_household_id on public.household_members(household_id);
create index idx_household_members_auth_user_id on public.household_members(auth_user_id);

-- 3. SUPERMARKT-KATEGORIEN (Migros / Coop Standard, Reihenfolge anpassbar)
create table public.store_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text not null default 'ShoppingBag',
  sort_order int not null default 100,
  is_default boolean not null default false,
  unique (household_id, slug)
);

create index idx_store_categories_household_sort on public.store_categories(household_id, sort_order);

-- 4. FAMILIENKALENDER (inkl. Bidirektionalem Google Kalender Sync, Essensplan & ToDo-Deadlines)
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  assigned_member_ids uuid[] not null default '{}',
  category text not null default 'family' check (category in ('family', 'child', 'medical', 'birthday', 'meal', 'todo', 'leisure', 'other')),
  source_meal_plan_id uuid,
  source_todo_id uuid,
  external_url text,
  external_calendar_id text,
  external_event_id text,
  recurrence_rule text,
  sync_status text default 'local_only' check (sync_status in ('synced', 'pending', 'local_only')),
  created_by_member_id uuid not null references public.household_members(id),
  created_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_calendar_events_household_start on public.calendar_events(household_id, start_at);

-- 5. REZEPTE (inkl. Thermomix / Cookidoo Unterstützung)
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  base_portions int not null default 4,
  prep_time_minutes int,
  cooking_method text not null default 'standard' check (cooking_method in ('standard', 'thermomix', 'both')),
  instructions jsonb not null default '[]'::jsonb,
  thermomix_steps jsonb default '[]'::jsonb,
  cookidoo_recipe_url text,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_by_member_id uuid not null references public.household_members(id),
  created_at timestamptz not null default now()
);

create index idx_recipes_household_id on public.recipes(household_id);

-- 6. REZEPT-ZUTATEN
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity numeric(10,2),
  unit text,
  store_category_slug text not null default 'other',
  store_category_id uuid references public.store_categories(id) on delete set null,
  is_pantry_staple boolean not null default false
);

create index idx_recipe_ingredients_recipe_id on public.recipe_ingredients(recipe_id);

-- 7. ESSENS-WUNSCHLISTE
create table public.meal_wishes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  notes text,
  preferred_cooking_method text not null default 'standard' check (preferred_cooking_method in ('standard', 'thermomix')),
  linked_recipe_id uuid references public.recipes(id) on delete set null,
  is_fulfilled boolean not null default false,
  created_by_member_id uuid not null references public.household_members(id),
  created_at timestamptz not null default now()
);

create index idx_meal_wishes_household_id on public.meal_wishes(household_id);

-- 8. ESSENSPLANUNG (Flexibel: Kochen + Aufwärm-Tage für 4-5 Portionen)
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  planned_date date not null,
  slot_type text not null default 'dinner' check (slot_type in ('lunch', 'dinner', 'other')),
  custom_title text not null,
  recipe_id uuid references public.recipes(id) on delete set null,
  portions int not null default 4,
  includes_next_day_lunch boolean not null default true,
  cooking_method text not null default 'standard' check (cooking_method in ('standard', 'thermomix')),
  cookidoo_url text,
  notes text,
  created_by_member_id uuid not null references public.household_members(id),
  created_at timestamptz not null default now()
);

create index idx_meal_plans_household_date on public.meal_plans(household_id, planned_date);

-- 9. EINKAUFSLISTE
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity numeric(10,2),
  unit text,
  store_category_slug text not null default 'other',
  store_category_id uuid references public.store_categories(id) on delete set null,
  source_meal_plan_id uuid references public.meal_plans(id) on delete set null,
  is_checked boolean not null default false,
  checked_at timestamptz,
  created_by_member_id uuid not null references public.household_members(id),
  created_at timestamptz not null default now()
);

create index idx_shopping_items_household_checked on public.shopping_items(household_id, is_checked);

-- 10. HAUSHALTSBEDARF (inkl. Galaxus Web Share Target)
create table public.household_needs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  product_url text,
  image_url text,
  merchant text,
  notes text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  is_purchased boolean not null default false,
  purchased_at timestamptz,
  created_by_member_id uuid not null references public.household_members(id),
  created_at timestamptz not null default now()
);

create index idx_household_needs_household_purchased on public.household_needs(household_id, is_purchased);

-- 11. WEB PUSH SUBSCRIPTIONS
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now()
);

-- 12. FAMILIEN-TODO-KATEGORIEN (Kita, Haushalt, Familie + eigene Kategorien)
create table public.todo_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  slug text not null,
  name text not null,
  color_hex text not null default '#74956C',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, slug)
);

-- 13. FAMILIEN-TODOS & AUFGABEN (inkl. Zuweisung oder Offen für alle, Priorität & Kalender-Deadline)
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  notes text,
  category_slug text not null default 'family',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  assigned_member_id uuid references public.household_members(id) on delete set null,
  points_value int not null default 10,
  is_completed boolean not null default false,
  completed_by_member_id uuid references public.household_members(id),
  completed_at timestamptz,
  created_by_member_id uuid references public.household_members(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

create schema if not exists private;

create or replace function private.get_my_household_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id
  from public.household_members
  where auth_user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.get_my_household_id() from public;
grant execute on function private.get_my_household_id() to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.store_categories enable row level security;
alter table public.calendar_events enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_wishes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_items enable row level security;
alter table public.household_needs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.chores enable row level security;

create policy "Household access" on public.households
  for all to authenticated
  using (id = private.get_my_household_id())
  with check (id = private.get_my_household_id());

create policy "Members access" on public.household_members
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Store categories access" on public.store_categories
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Calendar events access" on public.calendar_events
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Recipes access" on public.recipes
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Recipe ingredients access" on public.recipe_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.household_id = private.get_my_household_id()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.household_id = private.get_my_household_id()
    )
  );

create policy "Meal wishes access" on public.meal_wishes
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Meal plans access" on public.meal_plans
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Shopping items access" on public.shopping_items
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Household needs access" on public.household_needs
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Push subscriptions access" on public.push_subscriptions
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

create policy "Chores access" on public.chores
  for all to authenticated
  using (household_id = private.get_my_household_id())
  with check (household_id = private.get_my_household_id());

