export type CookingMethod = 'standard' | 'thermomix' | 'both';
export type MemberRole = 'adult' | 'child' | 'kiosk';
export type EventCategory =
  | 'family'
  | 'child'
  | 'medical'
  | 'birthday'
  | 'meal'
  | 'todo'
  | 'leisure'
  | 'other';
export type NeedPriority = 'low' | 'normal' | 'high';
export type TodoPriority = 'low' | 'normal' | 'high';
export type MealSlotType = 'lunch' | 'dinner' | 'other';
export type LeisureCategory =
  | 'outdoor'
  | 'indoor'
  | 'animals_nature'
  | 'water_lake'
  | 'culture_events';

export interface Household {
  id: string;
  name: string;
  default_portions: number;
  weather_lat: number;
  weather_lon: number;
  weather_location_name: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  auth_user_id?: string | null;
  display_name: string;
  short_code: string;
  color_hex: string;
  role: MemberRole;
  is_selectable_actor: boolean;
  gamification_points: number;
}

export interface StoreCategory {
  id: string;
  household_id: string;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
}

export interface CalendarEvent {
  id: string;
  household_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string; // ISO string
  end_at: string;   // ISO string
  is_all_day: boolean;
  assigned_member_ids: string[];
  category: EventCategory;
  source_meal_plan_id?: string | null;
  source_todo_id?: string | null;
  external_url?: string | null;
  external_calendar_id?: string | null;
  external_event_id?: string | null;
  recurrence_rule?: string | null;
  sync_status?: 'synced' | 'pending' | 'local_only';
  created_by_member_id: string;
  created_at: string;
  updated_at?: string;
}

export interface ThermomixStep {
  step_number: number;
  title: string;
  instruction: string;
  time_setting?: string;   // z.B. "5 Min."
  temp_setting?: string;   // z.B. "100 °C" oder "Varoma"
  speed_setting?: string;  // z.B. "Stufe 2, Linkslauf"
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  name: string;
  normalized_name: string;
  quantity: number | null;
  unit: string | null;
  store_category_slug: string;
  is_pantry_staple: boolean;
}

export interface Recipe {
  id: string;
  household_id: string;
  title: string;
  description?: string | null;
  base_portions: number;
  prep_time_minutes?: number | null;
  cooking_method: CookingMethod;
  instructions: string[];
  thermomix_steps?: ThermomixStep[];
  cookidoo_recipe_url?: string | null;
  tags: string[];
  is_favorite: boolean;
  ingredients: RecipeIngredient[];
  created_by_member_id: string;
  created_at: string;
}

export interface MealWish {
  id: string;
  household_id: string;
  title: string;
  notes?: string | null;
  preferred_cooking_method: 'standard' | 'thermomix';
  linked_recipe_id?: string | null;
  is_fulfilled: boolean;
  created_by_member_id: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  household_id: string;
  planned_date: string; // YYYY-MM-DD
  slot_type: MealSlotType;
  custom_title: string;
  recipe_id?: string | null;
  portions: number;
  includes_next_day_lunch: boolean;
  cooking_method: 'standard' | 'thermomix';
  cookidoo_url?: string | null;
  notes?: string | null;
  created_by_member_id: string;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  household_id: string;
  name: string;
  normalized_name: string;
  quantity: number | null;
  unit: string | null;
  store_category_slug: string;
  source_meal_plan_id?: string | null;
  is_checked: boolean;
  checked_at?: string | null;
  created_by_member_id: string;
  created_at: string;
}

export interface HouseholdNeed {
  id: string;
  household_id: string;
  title: string;
  product_url?: string | null;
  image_url?: string | null;
  merchant?: string | null;
  notes?: string | null;
  priority: NeedPriority;
  is_purchased: boolean;
  purchased_at?: string | null;
  created_by_member_id: string;
  created_at: string;
}

export interface TodoCategory {
  id: string;
  household_id: string;
  slug: string;
  name: string;
  color_hex: string;
  is_default: boolean;
}

export interface TodoItem {
  id: string;
  household_id: string;
  title: string;
  notes?: string | null;
  category_slug: string;
  priority: TodoPriority;
  assigned_member_id?: string | null; // null = Offen für alle (jeder kann übernehmen)
  due_date?: string | null;           // YYYY-MM-DD (erscheint automatisch im Kalender)
  is_completed: boolean;
  completed_by_member_id?: string | null;
  completed_at?: string | null;
  created_by_member_id: string;
  created_at: string;
}

export interface LeisureActivity {
  id: string;
  title: string;
  municipality: string;
  drive_minutes_from_gruet: number;
  category: LeisureCategory;
  weather_suitability: 'sun' | 'rain' | 'any';
  age_recommendation: string;
  description: string;
  tip?: string;
  event_url: string;
  is_event_portal?: boolean;
}

export interface GoogleSyncConfig {
  enabled: boolean;
  calendar_id: string;
  sync_meals: boolean;
  sync_todos: boolean;
  last_synced_at?: string | null;
}

export interface WeatherData {
  location: string;
  temperature: number;
  weatherCode: number;
  conditionLabel: string;
  tempMin: number;
  tempMax: number;
  windSpeed: number;
  hourlyForecast: {
    time: string;
    temp: number;
    code: number;
  }[];
  updatedAt: string;
}
