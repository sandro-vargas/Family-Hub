'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Household,
  HouseholdMember,
  StoreCategory,
  CalendarEvent,
  Recipe,
  MealWish,
  MealPlan,
  ShoppingItem,
  HouseholdNeed,
  NeedPriority,
  TodoCategory,
  TodoItem,
  TodoPriority,
  LeisureActivity,
  GoogleSyncConfig,
} from '@/types/family';
import {
  INITIAL_HOUSEHOLD,
  INITIAL_MEMBERS,
  INITIAL_STORE_CATEGORIES,
  INITIAL_RECIPES,
  INITIAL_MEAL_PLANS,
  INITIAL_MEAL_WISHES,
  INITIAL_SHOPPING_ITEMS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_HOUSEHOLD_NEEDS,
  INITIAL_TODO_CATEGORIES,
  INITIAL_TODOS,
  INITIAL_LEISURE_ACTIVITIES,
  INITIAL_GOOGLE_SYNC_CONFIG,
  MEMBER_SANDRO_ID,
  MEMBER_FRAU_ID,
  MEMBER_TOCHTER_ID,
} from '@/lib/seed-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AddShoppingInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  store_category_slug?: string;
  source_meal_plan_id?: string | null;
}

interface AddTodoInput {
  title: string;
  notes?: string | null;
  category_slug: string;
  priority: TodoPriority;
  assigned_member_id?: string | null;
  due_date?: string | null;
}

interface FamilyContextValue {
  household: Household;
  members: HouseholdMember[];
  activeMember: HouseholdMember;
  setActiveMemberId: (id: string) => void;
  isKioskMode: boolean;
  setIsKioskMode: (val: boolean) => void;
  isLiveSupabase: boolean;

  // Store Categories & Shopping List
  categories: StoreCategory[];
  reorderCategories: (orderedIds: string[]) => void;
  shoppingItems: ShoppingItem[];
  addOrMergeShoppingItems: (items: AddShoppingInput[]) => void;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  clearCheckedShoppingItems: () => void;

  // Meals, Wishes & Recipes
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'household_id' | 'created_at' | 'created_by_member_id'>) => Recipe;
  mealWishes: MealWish[];
  addMealWish: (title: string, preferred_cooking_method: 'standard' | 'thermomix', notes?: string) => void;
  deleteMealWish: (id: string) => void;
  mealPlans: MealPlan[];
  addMealPlan: (plan: Omit<MealPlan, 'id' | 'household_id' | 'created_at' | 'created_by_member_id'>) => MealPlan;
  updateMealPlanPortions: (planId: string, portions: number) => void;
  deleteMealPlan: (id: string) => void;

  // Calendar Events & 2-Way Google Sync
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'household_id' | 'created_at' | 'created_by_member_id'>) => CalendarEvent;
  deleteCalendarEvent: (id: string) => void;
  googleSyncConfig: GoogleSyncConfig;
  updateGoogleSyncConfig: (partial: Partial<GoogleSyncConfig>) => void;
  isSyncingGoogle: boolean;
  syncWithGoogleCalendar: () => Promise<{ syncedCount: number; importedCount: number; mode: string; message: string }>;

  // Family ToDos & Categories
  todoCategories: TodoCategory[];
  addTodoCategory: (name: string, colorHex?: string) => TodoCategory;
  todos: TodoItem[];
  addTodo: (input: AddTodoInput) => TodoItem;
  toggleTodoCompleted: (id: string) => void;
  claimTodo: (id: string, memberId: string | null) => void;
  deleteTodo: (id: string) => void;

  // Leisure Activities (Zürcher Oberland)
  leisureActivities: LeisureActivity[];

  // Household Needs (Galaxus)
  householdNeeds: HouseholdNeed[];
  addHouseholdNeed: (need: {
    title: string;
    product_url?: string | null;
    image_url?: string | null;
    merchant?: string | null;
    notes?: string | null;
    priority?: NeedPriority;
  }) => void;
  toggleHouseholdNeedPurchased: (id: string) => void;
  deleteHouseholdNeed: (id: string) => void;

  // Member helper
  getMemberById: (id: string) => HouseholdMember | undefined;
  updateMemberColor: (memberId: string, colorHex: string) => void;
  updateDefaultPortions: (portions: number) => void;
}

const STORAGE_KEY = 'family_hub_app_state_v3';

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function normalizeIngredientName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^bio\s+/i, '');
}

function getNextDayIso(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
  return dt.toISOString().split('T')[0];
}

function buildMealCalendarEvents(
  plan: MealPlan,
  householdId: string,
  allMemberIds: string[],
  createdByMemberId: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const startHour = plan.slot_type === 'lunch' ? '12:00:00' : '18:30:00';
  const endHour = plan.slot_type === 'lunch' ? '13:00:00' : '19:30:00';
  const slotLabel = plan.slot_type === 'lunch' ? 'Mittagessen' : 'Abendessen';

  events.push({
    id: `ev-meal-${plan.id}-main`,
    household_id: householdId,
    title: `🍽️ ${slotLabel}: ${plan.custom_title} (${plan.portions} Portionen)`,
    description: `Essensplan (${
      plan.cooking_method === 'thermomix' ? 'Thermomix' : 'Herkömmlich'
    }) • ${plan.portions} Portionen${
      plan.includes_next_day_lunch ? ' (inkl. Mittagessen am Folgetag zum Aufwärmen)' : ''
    }`,
    location: 'Zuhause (8624 Grüt)',
    start_at: new Date(`${plan.planned_date}T${startHour}`).toISOString(),
    end_at: new Date(`${plan.planned_date}T${endHour}`).toISOString(),
    is_all_day: false,
    assigned_member_ids: allMemberIds,
    category: 'meal',
    source_meal_plan_id: plan.id,
    external_url: plan.cookidoo_url || null,
    sync_status: 'pending',
    created_by_member_id: createdByMemberId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (plan.includes_next_day_lunch) {
    const nextDay = getNextDayIso(plan.planned_date);
    events.push({
      id: `ev-meal-${plan.id}-warmup`,
      household_id: householdId,
      title: `🥡 Mittagessen (Aufwärmen): ${plan.custom_title} (${plan.portions} Port.)`,
      description: `Reste vom Vorabend aufwärmen (gekocht: ${plan.portions} Portionen)`,
      location: 'Zuhause (8624 Grüt)',
      start_at: new Date(`${nextDay}T12:00:00`).toISOString(),
      end_at: new Date(`${nextDay}T13:00:00`).toISOString(),
      is_all_day: false,
      assigned_member_ids: allMemberIds,
      category: 'meal',
      source_meal_plan_id: plan.id,
      sync_status: 'pending',
      created_by_member_id: createdByMemberId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return events;
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [household, setHousehold] = useState<Household>(INITIAL_HOUSEHOLD);
  const [members, setMembers] = useState<HouseholdMember[]>(INITIAL_MEMBERS);
  const [activeMemberId, setActiveMemberIdState] = useState<string>(MEMBER_SANDRO_ID);
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);
  const [categories, setCategories] = useState<StoreCategory[]>(INITIAL_STORE_CATEGORIES);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [mealWishes, setMealWishes] = useState<MealWish[]>(INITIAL_MEAL_WISHES);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(INITIAL_MEAL_PLANS);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(INITIAL_SHOPPING_ITEMS);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [householdNeeds, setHouseholdNeeds] = useState<HouseholdNeed[]>(INITIAL_HOUSEHOLD_NEEDS);
  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>(INITIAL_TODO_CATEGORIES);
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
  const [leisureActivities] = useState<LeisureActivity[]>(INITIAL_LEISURE_ACTIVITIES);
  const [googleSyncConfig, setGoogleSyncConfig] = useState<GoogleSyncConfig>(INITIAL_GOOGLE_SYNC_CONFIG);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  const isLiveSupabase = isSupabaseConfigured();

  // Load persisted state from localStorage + listen across tabs
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.household) setHousehold(parsed.household);
        if (parsed.members) {
          // Migration: Falls noch 'Frau' oder 'Tochter' gespeichert ist, Namen & Kürzel auf Jenni / Chiara aktualisieren
          const updatedMembers = (parsed.members as HouseholdMember[]).map((m) => {
            if (m.id === MEMBER_FRAU_ID && (m.display_name === 'Frau' || m.short_code === 'FR')) {
              return { ...m, display_name: 'Jenni', short_code: 'JE' };
            }
            if (m.id === MEMBER_TOCHTER_ID && (m.display_name === 'Tochter' || m.short_code === 'TO')) {
              return { ...m, display_name: 'Chiara', short_code: 'CH' };
            }
            return m;
          });
          setMembers(updatedMembers);
        }
        if (parsed.activeMemberId) setActiveMemberIdState(parsed.activeMemberId);
        if (typeof parsed.isKioskMode === 'boolean') setIsKioskMode(parsed.isKioskMode);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.recipes) setRecipes(parsed.recipes);
        if (parsed.mealWishes) setMealWishes(parsed.mealWishes);
        if (parsed.mealPlans) setMealPlans(parsed.mealPlans);
        if (parsed.shoppingItems) setShoppingItems(parsed.shoppingItems);
        if (parsed.calendarEvents) setCalendarEvents(parsed.calendarEvents);
        if (parsed.householdNeeds) setHouseholdNeeds(parsed.householdNeeds);
        if (parsed.todoCategories) setTodoCategories(parsed.todoCategories);
        if (parsed.todos) setTodos(parsed.todos);
        if (parsed.googleSyncConfig) setGoogleSyncConfig(parsed.googleSyncConfig);
      }
    } catch (e) {
      console.warn('Could not load local state:', e);
    } finally {
      setHydrated(true);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed.shoppingItems) setShoppingItems(parsed.shoppingItems);
          if (parsed.mealPlans) setMealPlans(parsed.mealPlans);
          if (parsed.mealWishes) setMealWishes(parsed.mealWishes);
          if (parsed.calendarEvents) setCalendarEvents(parsed.calendarEvents);
          if (parsed.householdNeeds) setHouseholdNeeds(parsed.householdNeeds);
          if (parsed.todoCategories) setTodoCategories(parsed.todoCategories);
          if (parsed.todos) setTodos(parsed.todos);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          household,
          members,
          activeMemberId,
          isKioskMode,
          categories,
          recipes,
          mealWishes,
          mealPlans,
          shoppingItems,
          calendarEvents,
          householdNeeds,
          todoCategories,
          todos,
          googleSyncConfig,
        })
      );
    } catch (e) {
      console.warn('Could not persist local state:', e);
    }
  }, [
    hydrated,
    household,
    members,
    activeMemberId,
    isKioskMode,
    categories,
    recipes,
    mealWishes,
    mealPlans,
    shoppingItems,
    calendarEvents,
    householdNeeds,
    todoCategories,
    todos,
    googleSyncConfig,
  ]);

  // Optional Supabase Realtime Subscription when configured
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('household-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, async () => {
        const { data } = await supabase.from('shopping_items').select('*').order('created_at', { ascending: false });
        if (data) setShoppingItems(data as ShoppingItem[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLiveSupabase]);

  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members.find((m) => m.is_selectable_actor) ||
    members[0];

  const nonKioskMemberIds = members.filter((m) => m.role !== 'kiosk').map((m) => m.id);
  const adultMemberIds = members.filter((m) => m.role === 'adult').map((m) => m.id);

  const setActiveMemberId = useCallback((id: string) => {
    setActiveMemberIdState(id);
  }, []);

  const getMemberById = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members]
  );

  // Category Reordering
  const reorderCategories = useCallback((orderedIds: string[]) => {
    setCategories((prev) =>
      orderedIds
        .map((id, idx) => {
          const found = prev.find((c) => c.id === id);
          return found ? { ...found, sort_order: (idx + 1) * 10 } : null;
        })
        .filter((c): c is StoreCategory => c !== null)
    );
  }, []);

  // Smart Merge Shopping Items (combines identical normalized_name + unit if unchecked)
  const addOrMergeShoppingItems = useCallback(
    (newInputs: AddShoppingInput[]) => {
      setShoppingItems((prev) => {
        const updated = [...prev];

        for (const input of newInputs) {
          if (!input.name.trim()) continue;
          const norm = normalizeIngredientName(input.name);
          const unitNorm = (input.unit || '').trim().toLowerCase();

          const existingIdx = updated.findIndex(
            (item) =>
              !item.is_checked &&
              item.normalized_name === norm &&
              (item.unit || '').trim().toLowerCase() === unitNorm
          );

          if (existingIdx > -1) {
            const existing = updated[existingIdx];
            const combinedQty =
              existing.quantity !== null && input.quantity !== undefined && input.quantity !== null
                ? Number((existing.quantity + input.quantity).toFixed(2))
                : existing.quantity ?? input.quantity ?? null;

            updated[existingIdx] = {
              ...existing,
              quantity: combinedQty,
              created_by_member_id: activeMember.id,
            };
          } else {
            updated.unshift({
              id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              household_id: household.id,
              name: input.name.trim(),
              normalized_name: norm,
              quantity: input.quantity ?? null,
              unit: input.unit ?? null,
              store_category_slug: input.store_category_slug || 'other',
              source_meal_plan_id: input.source_meal_plan_id ?? null,
              is_checked: false,
              created_by_member_id: activeMember.id,
              created_at: new Date().toISOString(),
            });
          }
        }
        return updated;
      });
    },
    [activeMember.id, household.id]
  );

  const toggleShoppingItem = useCallback((id: string) => {
    setShoppingItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              is_checked: !item.is_checked,
              checked_at: !item.is_checked ? new Date().toISOString() : null,
            }
          : item
      )
    );
  }, []);

  const deleteShoppingItem = useCallback((id: string) => {
    setShoppingItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCheckedShoppingItems = useCallback(() => {
    setShoppingItems((prev) => prev.filter((item) => !item.is_checked));
  }, []);

  // Recipes
  const addRecipe = useCallback(
    (recipeInput: Omit<Recipe, 'id' | 'household_id' | 'created_at' | 'created_by_member_id'>): Recipe => {
      const newRecipe: Recipe = {
        ...recipeInput,
        id: `rec-${Date.now()}`,
        household_id: household.id,
        created_by_member_id: activeMember.id,
        created_at: new Date().toISOString(),
      };
      setRecipes((prev) => [newRecipe, ...prev]);
      return newRecipe;
    },
    [activeMember.id, household.id]
  );

  // Meal Wishes
  const addMealWish = useCallback(
    (title: string, preferred_cooking_method: 'standard' | 'thermomix', notes?: string) => {
      if (!title.trim()) return;
      const newWish: MealWish = {
        id: `mw-${Date.now()}`,
        household_id: household.id,
        title: title.trim(),
        notes: notes?.trim() || null,
        preferred_cooking_method,
        is_fulfilled: false,
        created_by_member_id: activeMember.id,
        created_at: new Date().toISOString(),
      };
      setMealWishes((prev) => [newWish, ...prev]);
    },
    [activeMember.id, household.id]
  );

  const deleteMealWish = useCallback((id: string) => {
    setMealWishes((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Meal Plans + Automatic Calendar Sync (Category: 'meal')
  const addMealPlan = useCallback(
    (planInput: Omit<MealPlan, 'id' | 'household_id' | 'created_at' | 'created_by_member_id'>): MealPlan => {
      const newPlan: MealPlan = {
        ...planInput,
        id: `mp-${Date.now()}`,
        household_id: household.id,
        created_by_member_id: activeMember.id,
        created_at: new Date().toISOString(),
      };
      setMealPlans((prev) => [...prev, newPlan]);

      // Automatically link MealPlan to Calendar as category 'meal'
      const generatedMealEvents = buildMealCalendarEvents(
        newPlan,
        household.id,
        nonKioskMemberIds,
        activeMember.id
      );

      setCalendarEvents((prev) =>
        [...prev, ...generatedMealEvents].sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        )
      );

      return newPlan;
    },
    [activeMember.id, household.id, nonKioskMemberIds]
  );

  const updateMealPlanPortions = useCallback(
    (planId: string, newPortions: number) => {
      const clamped = Math.max(1, Math.min(12, newPortions));
      let updatedTargetPlan: MealPlan | null = null;

      setMealPlans((prev) =>
        prev.map((p) => {
          if (p.id === planId) {
            updatedTargetPlan = {
              ...p,
              portions: clamped,
              notes: p.includes_next_day_lunch
                ? `${clamped} Portionen (inkl. Mittagessen am nächsten Tag zum Aufwärmen)`
                : `${clamped} Portionen`,
            };
            return updatedTargetPlan;
          }
          return p;
        })
      );

      // Update linked calendar entries with new portion size
      setCalendarEvents((prev) =>
        prev.map((ev) => {
          if (ev.source_meal_plan_id !== planId) return ev;
          const isWarmup = ev.id.endsWith('-warmup') || ev.title.includes('Aufwärmen');
          const baseTitle = updatedTargetPlan?.custom_title || ev.title;
          if (isWarmup) {
            return {
              ...ev,
              title: `🥡 Mittagessen (Aufwärmen): ${baseTitle} (${clamped} Port.)`,
              description: `Reste vom Vorabend aufwärmen (gekocht: ${clamped} Portionen)`,
              sync_status: 'pending',
              updated_at: new Date().toISOString(),
            };
          }
          const slotLabel = updatedTargetPlan?.slot_type === 'lunch' ? 'Mittagessen' : 'Abendessen';
          return {
            ...ev,
            title: `🍽️ ${slotLabel}: ${baseTitle} (${clamped} Portionen)`,
            description: `Essensplan • ${clamped} Portionen${
              updatedTargetPlan?.includes_next_day_lunch
                ? ' (inkl. Mittagessen am Folgetag zum Aufwärmen)'
                : ''
            }`,
            sync_status: 'pending',
            updated_at: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const deleteMealPlan = useCallback((id: string) => {
    setMealPlans((prev) => prev.filter((p) => p.id !== id));
    setCalendarEvents((prev) => prev.filter((e) => e.source_meal_plan_id !== id));
  }, []);

  // Calendar Events
  const addCalendarEvent = useCallback(
    (eventInput: Omit<CalendarEvent, 'id' | 'household_id' | 'created_at' | 'created_by_member_id'>): CalendarEvent => {
      const newEvent: CalendarEvent = {
        ...eventInput,
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        household_id: household.id,
        sync_status: eventInput.sync_status || 'pending',
        created_by_member_id: activeMember.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCalendarEvents((prev) =>
        [...prev, newEvent].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      );
      return newEvent;
    },
    [activeMember.id, household.id]
  );

  const deleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ToDo Categories & ToDos (with Automatic Calendar Deadline Sync)
  const addTodoCategory = useCallback(
    (name: string, colorHex = '#74956C'): TodoCategory => {
      const slug =
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9äöüß]+/g, '-')
          .replace(/^-|-$/g, '') || `cat-${Date.now()}`;

      const existing = todoCategories.find((c) => c.slug === slug);
      if (existing) return existing;

      const newCat: TodoCategory = {
        id: `tcat-${Date.now()}`,
        household_id: household.id,
        slug,
        name: name.trim(),
        color_hex: colorHex,
        is_default: false,
      };
      setTodoCategories((prev) => [...prev, newCat]);
      return newCat;
    },
    [household.id, todoCategories]
  );

  const addTodo = useCallback(
    (input: AddTodoInput): TodoItem => {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        household_id: household.id,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        category_slug: input.category_slug || 'family',
        priority: input.priority || 'normal',
        assigned_member_id: input.assigned_member_id || null,
        due_date: input.due_date || null,
        is_completed: false,
        created_by_member_id: activeMember.id,
        created_at: new Date().toISOString(),
      };

      setTodos((prev) => [newTodo, ...prev]);

      // If ToDo has a deadline, automatically create a CalendarEvent in category 'todo'
      if (newTodo.due_date) {
        const catObj = todoCategories.find((c) => c.slug === newTodo.category_slug);
        const catLabel = catObj ? catObj.name : 'ToDo';
        const assignedIds = newTodo.assigned_member_id
          ? [newTodo.assigned_member_id]
          : adultMemberIds;

        const deadlineEvent: CalendarEvent = {
          id: `ev-todo-${newTodo.id}`,
          household_id: household.id,
          title: `📌 Deadline [${catLabel}]: ${newTodo.title}`,
          description: `${
            newTodo.notes ? `${newTodo.notes} • ` : ''
          }${
            newTodo.assigned_member_id
              ? 'Zugewiesenes Familien-ToDo'
              : 'Offen für alle (jeder kann übernehmen)'
          }`,
          location: '8624 Grüt (ZH)',
          start_at: `${newTodo.due_date}T00:00:00.000Z`,
          end_at: `${newTodo.due_date}T23:59:59.000Z`,
          is_all_day: true,
          assigned_member_ids: assignedIds,
          category: 'todo',
          source_todo_id: newTodo.id,
          sync_status: 'pending',
          created_by_member_id: activeMember.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setCalendarEvents((prev) =>
          [...prev, deadlineEvent].sort(
            (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          )
        );
      }

      return newTodo;
    },
    [activeMember.id, adultMemberIds, household.id, todoCategories]
  );

  const toggleTodoCompleted = useCallback(
    (id: string) => {
      let nowCompleted = false;
      setTodos((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          nowCompleted = !t.is_completed;
          return {
            ...t,
            is_completed: nowCompleted,
            completed_by_member_id: nowCompleted ? activeMember.id : null,
            completed_at: nowCompleted ? new Date().toISOString() : null,
          };
        })
      );

      // Update linked deadline in Calendar
      setCalendarEvents((prev) =>
        prev.map((ev) => {
          if (ev.source_todo_id !== id) return ev;
          const cleanTitle = ev.title.replace(/^✅ Erledigt:\s*/, '');
          return {
            ...ev,
            title: nowCompleted ? `✅ Erledigt: ${cleanTitle}` : cleanTitle,
            sync_status: 'pending',
            updated_at: new Date().toISOString(),
          };
        })
      );
    },
    [activeMember.id]
  );

  const claimTodo = useCallback(
    (id: string, memberId: string | null) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, assigned_member_id: memberId } : t))
      );

      setCalendarEvents((prev) =>
        prev.map((ev) => {
          if (ev.source_todo_id !== id) return ev;
          return {
            ...ev,
            assigned_member_ids: memberId ? [memberId] : adultMemberIds,
            sync_status: 'pending',
            updated_at: new Date().toISOString(),
          };
        })
      );
    },
    [adultMemberIds]
  );

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setCalendarEvents((prev) => prev.filter((ev) => ev.source_todo_id !== id));
  }, []);

  // Bidirectional Google Calendar Sync
  const updateGoogleSyncConfig = useCallback((partial: Partial<GoogleSyncConfig>) => {
    setGoogleSyncConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const syncWithGoogleCalendar = useCallback(async () => {
    setIsSyncingGoogle(true);
    try {
      const response = await fetch('/api/calendar/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: googleSyncConfig.calendar_id || 'primary',
          syncMeals: googleSyncConfig.sync_meals,
          syncTodos: googleSyncConfig.sync_todos,
          events: calendarEvents,
          members: members.map((m) => ({ id: m.id, display_name: m.display_name })),
        }),
      });

      const data = await response.json();
      if (data.mergedEvents && Array.isArray(data.mergedEvents)) {
        setCalendarEvents(
          data.mergedEvents.sort(
            (a: CalendarEvent, b: CalendarEvent) =>
              new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          )
        );
      }

      const nowIso = new Date().toISOString();
      setGoogleSyncConfig((prev) => ({ ...prev, last_synced_at: nowIso }));

      return {
        syncedCount: data.pushedCount ?? 0,
        importedCount: data.pulledCount ?? 0,
        mode: data.mode || 'local-bridge',
        message:
          data.message ||
          'Bidirektionale Synchronisation mit Google Kalender erfolgreich abgeschlossen.',
      };
    } catch (err: any) {
      return {
        syncedCount: 0,
        importedCount: 0,
        mode: 'error',
        message: err?.message || 'Synchronisation fehlgeschlagen.',
      };
    } finally {
      setIsSyncingGoogle(false);
    }
  }, [calendarEvents, googleSyncConfig, members]);

  // Household Needs (Galaxus)
  const addHouseholdNeed = useCallback(
    (needInput: {
      title: string;
      product_url?: string | null;
      image_url?: string | null;
      merchant?: string | null;
      notes?: string | null;
      priority?: NeedPriority;
    }) => {
      if (!needInput.title.trim()) return;
      const newNeed: HouseholdNeed = {
        id: `need-${Date.now()}`,
        household_id: household.id,
        title: needInput.title.trim(),
        product_url: needInput.product_url || null,
        image_url: needInput.image_url || null,
        merchant: needInput.merchant || (needInput.product_url?.includes('galaxus') ? 'galaxus.ch' : null),
        notes: needInput.notes || null,
        priority: needInput.priority || 'normal',
        is_purchased: false,
        created_by_member_id: activeMember.id,
        created_at: new Date().toISOString(),
      };
      setHouseholdNeeds((prev) => [newNeed, ...prev]);
    },
    [activeMember.id, household.id]
  );

  const toggleHouseholdNeedPurchased = useCallback((id: string) => {
    setHouseholdNeeds((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              is_purchased: !n.is_purchased,
              purchased_at: !n.is_purchased ? new Date().toISOString() : null,
            }
          : n
      )
    );
  }, []);

  const deleteHouseholdNeed = useCallback((id: string) => {
    setHouseholdNeeds((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateMemberColor = useCallback((memberId: string, colorHex: string) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, color_hex: colorHex } : m)));
  }, []);

  const updateDefaultPortions = useCallback((portions: number) => {
    setHousehold((prev) => ({ ...prev, default_portions: portions }));
  }, []);

  return (
    <FamilyContext.Provider
      value={{
        household,
        members,
        activeMember,
        setActiveMemberId,
        isKioskMode,
        setIsKioskMode,
        isLiveSupabase,
        categories: [...categories].sort((a, b) => a.sort_order - b.sort_order),
        reorderCategories,
        shoppingItems,
        addOrMergeShoppingItems,
        toggleShoppingItem,
        deleteShoppingItem,
        clearCheckedShoppingItems,
        recipes,
        addRecipe,
        mealWishes,
        addMealWish,
        deleteMealWish,
        mealPlans,
        addMealPlan,
        updateMealPlanPortions,
        deleteMealPlan,
        calendarEvents,
        addCalendarEvent,
        deleteCalendarEvent,
        googleSyncConfig,
        updateGoogleSyncConfig,
        isSyncingGoogle,
        syncWithGoogleCalendar,
        todoCategories,
        addTodoCategory,
        todos,
        addTodo,
        toggleTodoCompleted,
        claimTodo,
        deleteTodo,
        leisureActivities,
        householdNeeds,
        addHouseholdNeed,
        toggleHouseholdNeedPurchased,
        deleteHouseholdNeed,
        getMemberById,
        updateMemberColor,
        updateDefaultPortions,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return ctx;
}
