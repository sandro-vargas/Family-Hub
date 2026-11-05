-- ============================================================================
-- Seed-Daten: Haushalt "Ernesto Vargas", Mitglieder & Migros/Coop Kategorien
-- ============================================================================

do $$
declare
  v_household_id uuid := '00000000-0000-4000-a000-000000000001';
  v_sandro_id uuid    := '00000000-0000-4000-a000-000000000101';
  v_frau_id uuid      := '00000000-0000-4000-a000-000000000102';
  v_tochter_id uuid   := '00000000-0000-4000-a000-000000000103';
  v_ipad_id uuid      := '00000000-0000-4000-a000-000000000104';
begin
  insert into public.households (id, name, default_portions, weather_lat, weather_lon, weather_location_name)
  values (v_household_id, 'Family Hub', 4, 47.29720, 8.76110, '8624 Grüt (ZH)')
  on conflict (id) do nothing;

  insert into public.household_members (id, household_id, display_name, short_code, color_hex, role, is_selectable_actor, gamification_points)
  values
    (v_sandro_id,  v_household_id, 'Sandro',      'SA', '#74956C', 'adult', true,  120),
    (v_frau_id,    v_household_id, 'Jenni',       'JE', '#5CA6CE', 'adult', true,  140),
    (v_tochter_id, v_household_id, 'Chiara',      'CH', '#EAB308', 'child', false, 50),
    (v_ipad_id,    v_household_id, 'iPad (Haus)', 'IP', '#53565A', 'kiosk', false, 0)
  on conflict (id) do nothing;

  insert into public.store_categories (household_id, slug, name, icon, sort_order, is_default)
  values
    (v_household_id, 'produce',        'Früchte & Gemüse',             'Apple',       10,  true),
    (v_household_id, 'bakery',         'Brot & Backwaren',             'Croissant',   20,  false),
    (v_household_id, 'meat_fish',      'Fleisch, Fisch & Vegi',        'Beef',        30,  false),
    (v_household_id, 'dairy_eggs',     'Milchprodukte, Käse & Eier',   'Milk',        40,  false),
    (v_household_id, 'pantry',         'Vorrat, Teigwaren & Konserven','Package',     50,  false),
    (v_household_id, 'spices_oils',    'Gewürze, Öle & Backzutaten',   'Sparkles',    60,  false),
    (v_household_id, 'frozen',         'Tiefkühlprodukte',             'Snowflake',   70,  false),
    (v_household_id, 'beverages',      'Getränke',                     'CupSoda',     80,  false),
    (v_household_id, 'household_care', 'Haushalt & Körperpflege',      'SprayCan',    90,  false),
    (v_household_id, 'other',          'Sonstiges',                    'ShoppingBag', 100, false)
  on conflict (household_id, slug) do nothing;
end $$;

