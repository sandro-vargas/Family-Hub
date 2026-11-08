'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Sparkles,
  Flame,
  Calendar,
  Check,
  ShoppingCart,
  ExternalLink,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Clock,
  Users,
  BookOpen,
  CalendarCheck2,
  ChevronDown,
  ChevronUp,
  Pencil,
  ArrowRightLeft,
  X,
  Leaf,
  Beef,
} from 'lucide-react';
import { useFamily, detectStoreCategorySlug } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { VoiceInputButton } from '@/components/voice-input-button';
import { MealPlan, Recipe, RecipeIngredient } from '@/types/family';
import { MEMBER_SANDRO_ID, MEMBER_FRAU_ID } from '@/lib/seed-data';

function getUpcomingDays(count = 7): { iso: string; weekday: string; shortDay: string; label: string }[] {
  const days = [];
  const formatter = new Intl.DateTimeFormat('de-CH', { weekday: 'long' });
  const shortFormatter = new Intl.DateTimeFormat('de-CH', { weekday: 'short' });
  const dateFormatter = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit' });

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const iso = `${year}-${month}-${dayNum}`;
    const weekday = formatter.format(d);
    const shortDay = shortFormatter.format(d).replace('.', '');
    const label =
      i === 0
        ? `Heute (${weekday})`
        : i === 1
        ? `Morgen (${weekday})`
        : `${weekday}, ${dateFormatter.format(d)}`;
    days.push({ iso, weekday, shortDay, label });
  }
  return days;
}

const MEAT_KEYWORDS = [
  'poulet',
  'hähnchen',
  'chicken',
  'schnitzel',
  'fleisch',
  'hackfleisch',
  'rind',
  'beef',
  'schwein',
  'kalb',
  'lamm',
  'speck',
  'schinken',
  'wurst',
  'bratwurst',
  'cervelat',
  'salami',
  'chorizo',
  'bolognese',
  'geschnetzeltes',
  'lachs',
  'fisch',
  'thunfisch',
  'crevetten',
  'garnelen',
];

function getDietCategory(recipe: Recipe): 'fleisch' | 'vegi' {
  const explicitVegi = recipe.tags.some((t) =>
    ['vegi', 'vegetarisch', 'vegan'].includes(t.toLowerCase())
  );
  if (explicitVegi) return 'vegi';

  const explicitMeat = recipe.tags.some((t) =>
    ['fleisch', 'fisch', 'poulet', 'rind'].includes(t.toLowerCase())
  );
  if (explicitMeat) return 'fleisch';

  const text = [
    recipe.title,
    recipe.description || '',
    ...recipe.ingredients.map((i) => i.name),
  ]
    .join(' ')
    .toLowerCase();

  return MEAT_KEYWORDS.some((kw) => text.includes(kw)) ? 'fleisch' : 'vegi';
}

function getDurationBucket(minutes: number | null | undefined): 'fast' | 'medium' | 'long' {
  const m = minutes || 30;
  if (m <= 20) return 'fast';
  if (m <= 35) return 'medium';
  return 'long';
}

export default function MealsPage() {
  const {
    household,
    recipes,
    addRecipe,
    updateRecipe,
    mealWishes,
    addMealWish,
    deleteMealWish,
    mealPlans,
    addMealPlan,
    updateMealPlan,
    updateMealPlanPortions,
    deleteMealPlan,
    addOrMergeShoppingItems,
    categories,
    calendarEvents,
    getMemberById,
  } = useFamily();

  const upcomingDays = useMemo(() => getUpcomingDays(7), []);

  // Wish List Input State (Top of Page)
  const [wishTitle, setWishTitle] = useState('');
  const [wishMethod, setWishMethod] = useState<'standard' | 'thermomix'>('standard');
  const [wishNotes, setWishNotes] = useState('');
  const [scheduledWishId, setScheduledWishId] = useState<string | null>(null);

  // AI Planner Input State
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedDate, setSelectedDate] = useState(upcomingDays[0].iso);
  const [portions, setPortions] = useState<number>(household.default_portions || 4);
  const [cookingMethod, setCookingMethod] = useState<'standard' | 'thermomix'>('standard');
  const [cookidooUrl, setCookidooUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal State for Recipe & Ingredients Overview
  const [activeGeneratedRecipe, setActiveGeneratedRecipe] = useState<Recipe | null>(null);
  // Track which ingredients are selected to be bought (missing at home)
  const [selectedToBuyIds, setSelectedToBuyIds] = useState<Record<string, boolean>>({});
  const [editableIngredients, setEditableIngredients] = useState<RecipeIngredient[]>([]);
  const [editableRecipeTitle, setEditableRecipeTitle] = useState('');
  const [editablePrepMinutes, setEditablePrepMinutes] = useState<number>(30);
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('Stk');
  const [transferSuccessBanner, setTransferSuccessBanner] = useState<string | null>(null);

  // Edit Scheduled Meal Plan State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanTitle, setEditPlanTitle] = useState('');
  const [editPlanDate, setEditPlanDate] = useState('');
  const [editPlanSlot, setEditPlanSlot] = useState<'lunch' | 'dinner'>('dinner');
  const [editPlanPortions, setEditPlanPortions] = useState<number>(4);
  const [editPlanMethod, setEditPlanMethod] = useState<'standard' | 'thermomix'>('standard');

  // Saved Recipes State (Default: collapsed!)
  const [isRecipesExpanded, setIsRecipesExpanded] = useState(false);
  const [dietFilter, setDietFilter] = useState<'all' | 'fleisch' | 'vegi'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'fast' | 'medium' | 'long'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'standard' | 'thermomix'>('all');

  // Combine saved recipes + any scheduled meal plans that don't have a recipe object yet
  const allAvailableRecipes = useMemo(() => {
    const list = [...recipes];
    const existingIds = new Set(recipes.map((r) => r.id));
    const existingTitles = new Set(recipes.map((r) => r.title.trim().toLowerCase()));

    mealPlans.forEach((plan) => {
      if (plan.recipe_id && existingIds.has(plan.recipe_id)) return;
      if (existingTitles.has(plan.custom_title.trim().toLowerCase())) return;
      existingTitles.add(plan.custom_title.trim().toLowerCase());
      list.push({
        id: plan.recipe_id || `rec-from-plan-${plan.id}`,
        household_id: household.id,
        title: plan.custom_title,
        description: 'Eingeplantes Familiengericht aus dem Wochenplan',
        base_portions: plan.portions || 4,
        prep_time_minutes: 30,
        cooking_method: plan.cooking_method,
        instructions: ['Gemäss Familienrezept zubereiten.'],
        thermomix_steps: [],
        cookidoo_recipe_url: plan.cookidoo_url || null,
        tags: [plan.cooking_method === 'thermomix' ? 'Thermomix' : 'Wochenplan'],
        is_favorite: false,
        created_by_member_id: plan.created_by_member_id,
        created_at: plan.created_at,
        ingredients: [],
      });
    });

    return list;
  }, [household.id, mealPlans, recipes]);

  const filteredRecipes = useMemo(() => {
    return allAvailableRecipes.filter((rec) => {
      if (methodFilter !== 'all' && rec.cooking_method !== methodFilter) return false;
      if (dietFilter !== 'all' && getDietCategory(rec) !== dietFilter) return false;
      if (durationFilter !== 'all' && getDurationBucket(rec.prep_time_minutes) !== durationFilter) {
        return false;
      }
      return true;
    });
  }, [allAvailableRecipes, methodFilter, dietFilter, durationFilter]);

  // 28-Meal Coverage Calculation (7 days * 2 meals * 2 adult persons = 28 base portions)
  // Check calendarEvents for evening plans (Abendplan) of Sandro or Jenni to reduce required portions
  const coverageStats = useMemo(() => {
    const BASE_WEEKLY_MEALS = 28; // 7 days * 2 meals * 2 persons
    let eveningPlanReductions = 0;

    const perDay = upcomingDays.map((day) => {
      // Find evening calendar events (non-auto events starting >= 17:00)
      const eveningEvents = calendarEvents.filter((ev) => {
        if (ev.start_at.slice(0, 10) !== day.iso) return false;
        if (ev.category === 'meal' || ev.category === 'todo' || ev.category === 'leisure') {
          return false;
        }
        if (ev.is_all_day) return false;
        const hour = new Date(ev.start_at).getHours();
        return hour >= 17;
      });

      const adultsBusyInEvening = new Set<string>();
      eveningEvents.forEach((ev) => {
        if (ev.assigned_member_ids.includes(MEMBER_SANDRO_ID)) {
          adultsBusyInEvening.add(MEMBER_SANDRO_ID);
        }
        if (ev.assigned_member_ids.includes(MEMBER_FRAU_ID)) {
          adultsBusyInEvening.add(MEMBER_FRAU_ID);
        }
      });

      const dayReduction = adultsBusyInEvening.size;
      eveningPlanReductions += dayReduction;

      const dayRequiredPortions = Math.max(0, 4 - dayReduction); // 2 meals * 2 persons = 4 portions/day minus evening plans
      const dayPlans = mealPlans.filter((p) => p.planned_date === day.iso);
      const dayPlannedPortions = dayPlans.reduce((sum, p) => sum + (p.portions || 0), 0);

      const busyNames = Array.from(adultsBusyInEvening)
        .map((id) => getMemberById(id)?.display_name)
        .filter(Boolean);

      return {
        ...day,
        dayRequiredPortions,
        dayPlannedPortions,
        dayReduction,
        busyNames,
        eveningEventTitles: eveningEvents.map((e) => e.title),
      };
    });

    const targetMeals = Math.max(1, BASE_WEEKLY_MEALS - eveningPlanReductions);
    const plannedMeals = perDay.reduce((sum, d) => sum + d.dayPlannedPortions, 0);
    const percentage = Math.min(100, Math.round((plannedMeals / targetMeals) * 100));

    return {
      baseWeeklyMeals: BASE_WEEKLY_MEALS,
      eveningPlanReductions,
      targetMeals,
      plannedMeals,
      percentage,
      perDay,
    };
  }, [calendarEvents, getMemberById, mealPlans, upcomingDays]);

  const openRecipeModal = (recipe: Recipe) => {
    const initialToBuy: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      // Ingredients that are NOT pantry staples are selected to buy by default
      initialToBuy[ing.id] = !ing.is_pantry_staple;
    });
    setSelectedToBuyIds(initialToBuy);
    setEditableIngredients(recipe.ingredients.map((i) => ({ ...i })));
    setEditableRecipeTitle(recipe.title);
    setEditablePrepMinutes(recipe.prep_time_minutes || 30);
    setActiveGeneratedRecipe(recipe);
  };

  const handleGenerateRecipeAndPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const lowerPrompt = aiPrompt.toLowerCase();
    let targetDate = selectedDate;
    for (const dayObj of upcomingDays) {
      if (lowerPrompt.includes(dayObj.weekday.toLowerCase())) {
        targetDate = dayObj.iso;
        break;
      }
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          portions,
          cookingMethod,
        }),
      });

      const data = await response.json();
      const aiRecipe = data.recipe;

      const mappedIngredients: RecipeIngredient[] = (aiRecipe.ingredients || []).map(
        (ing: any, idx: number) => ({
          id: `ing-${Date.now()}-${idx}`,
          recipe_id: 'temp',
          name: ing.name,
          normalized_name: ing.normalized_name || ing.name.toLowerCase(),
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? 'Stk',
          store_category_slug:
            ing.store_category_slug && ing.store_category_slug !== 'other'
              ? ing.store_category_slug
              : detectStoreCategorySlug(ing.name),
          is_pantry_staple: Boolean(ing.is_pantry_staple),
        })
      );

      const savedRecipe = addRecipe({
        title: aiRecipe.title || aiPrompt,
        description: aiRecipe.description || null,
        base_portions: aiRecipe.portions || portions,
        prep_time_minutes: aiRecipe.prep_time_minutes || 30,
        cooking_method: cookingMethod,
        instructions: aiRecipe.instructions || [],
        thermomix_steps: aiRecipe.thermomix_steps || [],
        cookidoo_recipe_url: cookidooUrl.trim() || null,
        tags: [
          cookingMethod === 'thermomix' ? 'Thermomix' : 'Familienküche',
          `${portions} Portionen`,
        ],
        is_favorite: false,
        ingredients: mappedIngredients,
      });

      addMealPlan({
        planned_date: targetDate,
        slot_type: 'dinner',
        custom_title: savedRecipe.title,
        recipe_id: savedRecipe.id,
        portions,
        includes_next_day_lunch: false,
        cooking_method: cookingMethod,
        cookidoo_url: cookidooUrl.trim() || null,
        notes: `${portions} Portionen`,
      });

      // If this came from a wish on the wish list, remove that wish automatically!
      if (scheduledWishId) {
        deleteMealWish(scheduledWishId);
        setScheduledWishId(null);
      }

      openRecipeModal(savedRecipe);
      setAiPrompt('');
      setCookidooUrl('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleWishDirectly = (wish: {
    id: string;
    title: string;
    preferred_cooking_method: 'standard' | 'thermomix';
  }) => {
    setAiPrompt(wish.title);
    setCookingMethod(wish.preferred_cooking_method);
    setScheduledWishId(wish.id);
    const aiSection = document.getElementById('ai-meal-assistant');
    if (aiSection) {
      aiSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveRecipeChangesOnly = () => {
    if (!activeGeneratedRecipe) return;
    const updatedIngredients = editableIngredients.map((ing) => ({
      ...ing,
      // Persist whether it's at home (pantry staple = not selected to buy)
      is_pantry_staple: !selectedToBuyIds[ing.id],
    }));

    updateRecipe(activeGeneratedRecipe.id, {
      title: editableRecipeTitle.trim() || activeGeneratedRecipe.title,
      prep_time_minutes: editablePrepMinutes,
      ingredients: updatedIngredients,
    });

    setTransferSuccessBanner(
      `Änderungen an Rezept & Zutaten („${editableRecipeTitle}“) wurden gespeichert!`
    );
    setActiveGeneratedRecipe(null);
    setTimeout(() => setTransferSuccessBanner(null), 4000);
  };

  const handleSaveAndSendToShoppingList = () => {
    if (!activeGeneratedRecipe) return;

    const updatedIngredients = editableIngredients.map((ing) => ({
      ...ing,
      is_pantry_staple: !selectedToBuyIds[ing.id],
    }));

    // 1. Save changes to Recipe & Ingredients overview
    updateRecipe(activeGeneratedRecipe.id, {
      title: editableRecipeTitle.trim() || activeGeneratedRecipe.title,
      prep_time_minutes: editablePrepMinutes,
      ingredients: updatedIngredients,
    });

    // 2. Add clicked / missing ingredients to shopping list
    const toBuyList = updatedIngredients.filter((ing) => selectedToBuyIds[ing.id]);
    if (toBuyList.length > 0) {
      addOrMergeShoppingItems(
        toBuyList.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          store_category_slug:
            ing.store_category_slug || detectStoreCategorySlug(ing.name),
        }))
      );
    }

    setTransferSuccessBanner(
      `Rezept gespeichert & ${toBuyList.length} Zutaten auf die Einkaufsliste übernommen!`
    );
    setActiveGeneratedRecipe(null);
    setTimeout(() => setTransferSuccessBanner(null), 5000);
  };

  const handleAddIngredientToModal = () => {
    if (!newIngName.trim() || !activeGeneratedRecipe) return;
    const qtyNum = newIngQty.trim() ? Number(newIngQty.replace(',', '.')) : 1;
    const newId = `ing-custom-${Date.now()}`;
    const newIng: RecipeIngredient = {
      id: newId,
      recipe_id: activeGeneratedRecipe.id,
      name: newIngName.trim(),
      normalized_name: newIngName.trim().toLowerCase(),
      quantity: qtyNum,
      unit: newIngUnit,
      store_category_slug: detectStoreCategorySlug(newIngName.trim()),
      is_pantry_staple: false,
    };
    setEditableIngredients((prev) => [...prev, newIng]);
    setSelectedToBuyIds((prev) => ({ ...prev, [newId]: true }));
    setNewIngName('');
    setNewIngQty('');
  };

  const handleStartEditPlan = (plan: MealPlan) => {
    setEditingPlanId(plan.id);
    setEditPlanTitle(plan.custom_title);
    setEditPlanDate(plan.planned_date);
    setEditPlanSlot(plan.slot_type === 'lunch' ? 'lunch' : 'dinner');
    setEditPlanPortions(plan.portions);
    setEditPlanMethod(plan.cooking_method);
  };

  const handleSaveEditPlan = (id: string) => {
    if (!editPlanTitle.trim()) return;
    updateMealPlan(id, {
      custom_title: editPlanTitle.trim(),
      planned_date: editPlanDate,
      slot_type: editPlanSlot,
      portions: editPlanPortions,
      cooking_method: editPlanMethod,
    });
    setEditingPlanId(null);
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishTitle.trim()) return;
    addMealWish(wishTitle, wishMethod, wishNotes);
    setWishTitle('');
    setWishNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Compact Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90">
        <div className="flex items-center gap-2.5">
          <UtensilsCrossed className="h-5 w-5 text-[#74956C]" />
          <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
            Essensplanung & Rezepte
          </h1>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7F5] hover:bg-[#5CA6CE] hover:text-white text-xs font-bold text-[#2d7ba4] transition-colors"
        >
          <CalendarCheck2 className="h-3.5 w-3.5" />
          Im Kalender ansehen
        </Link>
      </div>

      {/* Success Banner */}
      {transferSuccessBanner && (
        <div className="bg-[#74956C] text-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>{transferSuccessBanner}</span>
          </div>
        </div>
      )}

      {/* 1. VERY TOP: Essenswunschliste der Familie */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-[#5CA6CE]" />
            <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
              Essenswunschliste der Familie
            </h2>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Wird beim Einplanen automatisch aus der Wunschliste entfernt)
            </span>
          </div>
        </div>

        <form onSubmit={handleAddWish} className="flex flex-wrap sm:flex-nowrap gap-2">
          <input
            type="text"
            value={wishTitle}
            onChange={(e) => setWishTitle(e.target.value)}
            placeholder="Neuer Essenswunsch (z.B. Älplermagronen, Lasagne, Fajitas)..."
            className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
          />
          <select
            value={wishMethod}
            onChange={(e) => setWishMethod(e.target.value as 'standard' | 'thermomix')}
            className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-[#1E293B] bg-white font-bold"
          >
            <option value="standard">Herkömmlich</option>
            <option value="thermomix">Thermomix</option>
          </select>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-[#74956C] text-white text-xs font-bold hover:bg-[#618059] flex items-center gap-1 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Wunsch hinzufügen</span>
          </button>
        </form>

        {mealWishes.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Aktuell keine offenen Essenswünsche – alle Wünsche wurden bereits eingeplant.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {mealWishes.map((wish) => (
              <div
                key={wish.id}
                className="p-2.5 rounded-xl bg-[#F4F7F5] border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-[#1E293B] truncate">{wish.title}</p>
                    {wish.preferred_cooking_method === 'thermomix' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#5CA6CE]/15 text-[#3b82a6]">
                        TM6
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <CreatorBadge memberId={wish.created_by_member_id} />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleScheduleWishDirectly(wish)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#5CA6CE] text-white hover:bg-[#488eb5] text-xs font-bold transition-colors"
                  >
                    Einplanen
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMealWish(wish.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    title="Wunsch löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Meal Coverage Overview (28 Mahlzeiten = 7 Tage x 2 Mahlzeiten x 2 Personen, inkl. Kalender-Abendplan-Check) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#74956C]/15 text-[#74956C]">
                Essensabdeckung (7 Tage)
              </span>
              {coverageStats.eveningPlanReductions > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  -{coverageStats.eveningPlanReductions} Port. wegen Abendtermin im Kalender
                </span>
              )}
            </div>
            <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B] mt-1">
              {coverageStats.plannedMeals} von {coverageStats.targetMeals} benötigten Mahlzeiten (Portionen) abgedeckt
            </h2>
            <p className="text-[11px] text-slate-500">
              Basis: 7 Tage × 2 Mahlzeiten × 2 Personen = 28 Mahlzeiten (unabhängig ob Mittag oder Abend). Bei Abendplänen im Kalender wird automatisch 1 Portion pro Person abgezogen.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xl font-extrabold text-[#74956C]">
              {coverageStats.percentage}%
            </span>
            <span className="block text-[10px] font-bold text-slate-500">Wochenziel</span>
          </div>
        </div>

        {/* Single Unified Progress Bar */}
        <div className="w-full h-3 bg-[#F4F7F5] rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-[#74956C] to-[#5CA6CE] transition-all duration-300 rounded-full"
            style={{ width: `${coverageStats.percentage}%` }}
          />
        </div>

        {/* 7-Day Mini Overview with Calendar Evening Check */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-1">
          {coverageStats.perDay.map((d) => {
            const isCovered = d.dayPlannedPortions >= d.dayRequiredPortions;
            return (
              <div
                key={d.iso}
                className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 ${
                  isCovered
                    ? 'bg-[#74956C]/10 border-[#74956C]/40'
                    : 'bg-[#F4F7F5] border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1E293B]">{d.shortDay}</span>
                  <span className="text-[10px] text-slate-500">
                    {d.iso.slice(8, 10)}.{d.iso.slice(5, 7)}.
                  </span>
                </div>

                <div className="text-xs font-extrabold text-[#1E293B]">
                  {d.dayPlannedPortions} / {d.dayRequiredPortions} Port.
                </div>

                {d.dayReduction > 0 ? (
                  <p
                    className="text-[10px] font-bold text-amber-800 truncate"
                    title={`Abendtermin: ${d.eveningEventTitles.join(', ')}`}
                  >
                    📅 {d.busyNames.join(', ')} verplant (-{d.dayReduction}P)
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">Standard (4 Port.)</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. AI Recipe & Meal Plan Assistant (without "+ Morgen Mittag aufwärmen") */}
      <div
        id="ai-meal-assistant"
        className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold">
                KI-Rezept-Assistent & Wochenplaner
              </h2>
            </div>
          </div>
          {scheduledWishId && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              Aus Wunschliste ausgewählt
            </span>
          )}
        </div>

        <form onSubmit={handleGenerateRecipeAndPlan} className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='z.B. "Dienstag Schnitzel mit Pommes" oder "Gemüse-Curry im Thermomix"'
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CA6CE]"
              />
              <VoiceInputButton onTranscript={(text) => setAiPrompt(text)} />
            </div>

            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-[#1E293B] bg-white font-bold focus:outline-none focus:ring-2 focus:ring-[#5CA6CE]"
            >
              {upcomingDays.map((d) => (
                <option key={d.iso} value={d.iso}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Cooking Method: Standard vs Thermomix */}
            <div className="bg-[#F4F7F5] px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Zubereitung:</span>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCookingMethod('standard')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    cookingMethod === 'standard'
                      ? 'bg-[#74956C] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Herkömmlich
                </button>
                <button
                  type="button"
                  onClick={() => setCookingMethod('thermomix')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                    cookingMethod === 'thermomix'
                      ? 'bg-[#5CA6CE] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  Thermomix
                </button>
              </div>
            </div>

            {/* Portions Selector */}
            <div className="bg-[#F4F7F5] px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Users className="h-4 w-4 text-[#74956C]" />
                Portionen (Mahlzeiten):
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPortions(p)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                      portions === p
                        ? 'bg-[#74956C] text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {cookingMethod === 'thermomix' && (
            <div className="flex items-center gap-2 bg-[#5CA6CE]/10 border border-[#5CA6CE]/30 p-2.5 rounded-xl">
              <Flame className="h-4 w-4 text-[#5CA6CE] shrink-0" />
              <input
                type="url"
                value={cookidooUrl}
                onChange={(e) => setCookidooUrl(e.target.value)}
                placeholder="Optional: Cookidoo Rezept-Link verknüpfen (https://cookidoo.ch/recipes/...)"
                className="w-full bg-transparent text-xs text-[#1E293B] placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating || !aiPrompt.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating
                ? 'KI erstellt Rezept & Zutatenliste...'
                : 'Einplanen & Zutaten prüfen'}
            </button>
          </div>
        </form>
      </div>

      {/* 4. Editable Weekly Meal Plan (Days can be moved & edited) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base text-[#1E293B] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#74956C]" />
            Euer Wochenplan (Editierbar & Tage verschiebbar)
          </h2>
        </div>

        <div className="space-y-2.5">
          {upcomingDays.map((day) => {
            const dayPlans = mealPlans.filter((p) => p.planned_date === day.iso);

            return (
              <div
                key={day.iso}
                className="rounded-2xl p-3.5 bg-[#F4F7F5]/70 border border-slate-200/90 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1E293B]">{day.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.iso);
                      const el = document.getElementById('ai-meal-assistant');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#5CA6CE] hover:underline"
                  >
                    + Für diesen Tag planen
                  </button>
                </div>

                {dayPlans.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Noch keine Mahlzeit geplant.</p>
                ) : (
                  dayPlans.map((plan) => {
                    const linkedRecipe = allAvailableRecipes.find(
                      (r) =>
                        r.id === plan.recipe_id ||
                        r.title.toLowerCase() === plan.custom_title.toLowerCase()
                    );
                    const isEditing = editingPlanId === plan.id;

                    if (isEditing) {
                      return (
                        <div
                          key={plan.id}
                          className="p-3 rounded-xl bg-white border-2 border-[#5CA6CE] space-y-2.5"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="text"
                              value={editPlanTitle}
                              onChange={(e) => setEditPlanTitle(e.target.value)}
                              className="sm:col-span-5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-[#1E293B]"
                              placeholder="Gericht"
                            />
                            <select
                              value={editPlanDate}
                              onChange={(e) => setEditPlanDate(e.target.value)}
                              className="sm:col-span-3 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-[#1E293B] bg-white"
                            >
                              {upcomingDays.map((d) => (
                                <option key={d.iso} value={d.iso}>
                                  Tag: {d.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editPlanSlot}
                              onChange={(e) =>
                                setEditPlanSlot(e.target.value as 'lunch' | 'dinner')
                              }
                              className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-[#1E293B] bg-white"
                            >
                              <option value="lunch">Mittag</option>
                              <option value="dinner">Abend</option>
                            </select>
                            <select
                              value={editPlanMethod}
                              onChange={(e) =>
                                setEditPlanMethod(e.target.value as 'standard' | 'thermomix')
                              }
                              className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-[#1E293B] bg-white"
                            >
                              <option value="standard">Standard</option>
                              <option value="thermomix">Thermomix</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                              <span>Portionen:</span>
                              {[1, 2, 3, 4, 5, 6].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setEditPlanPortions(p)}
                                  className={`h-6 w-6 rounded text-xs font-bold ${
                                    editPlanPortions === p
                                      ? 'bg-[#74956C] text-white'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingPlanId(null)}
                                className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold"
                              >
                                Abbrechen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditPlan(plan.id)}
                                className="px-3 py-1 rounded-lg bg-[#74956C] text-white text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Speichern
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={plan.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#74956C] text-white">
                              {plan.slot_type === 'lunch' ? 'Mittag' : 'Abend'}
                            </span>

                            {/* Quick Day Mover Dropdown */}
                            <div className="inline-flex items-center gap-1 bg-[#F4F7F5] px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700">
                              <ArrowRightLeft className="h-3 w-3 text-[#5CA6CE]" />
                              <select
                                value={plan.planned_date}
                                onChange={(e) =>
                                  updateMealPlan(plan.id, { planned_date: e.target.value })
                                }
                                className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#1E293B]"
                                title="Mahlzeit auf einen anderen Tag verschieben"
                              >
                                {upcomingDays.map((d) => (
                                  <option key={d.iso} value={d.iso}>
                                    {d.shortDay}, {d.iso.slice(8, 10)}.{d.iso.slice(5, 7)}.
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Portion Stepper */}
                            <div className="inline-flex items-center gap-1 bg-[#F4F7F5] px-2 py-0.5 rounded-lg border border-slate-200">
                              <Users className="h-3 w-3 text-[#74956C]" />
                              <span className="text-[11px] font-extrabold text-[#1E293B]">
                                {plan.portions} Port.
                              </span>
                              <button
                                type="button"
                                onClick={() => updateMealPlanPortions(plan.id, plan.portions - 1)}
                                className="h-4 w-4 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateMealPlanPortions(plan.id, plan.portions + 1)}
                                className="h-4 w-4 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>

                            {plan.cooking_method === 'thermomix' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#5CA6CE] text-white flex items-center gap-1">
                                <Flame className="h-3 w-3" /> TM6
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                            {plan.custom_title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2">
                            <CreatorBadge memberId={plan.created_by_member_id} />
                            {plan.cookidoo_url && (
                              <a
                                href={plan.cookidoo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" /> Cookidoo
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {linkedRecipe && (
                            <button
                              type="button"
                              onClick={() => openRecipeModal(linkedRecipe)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#74956C] text-white hover:bg-[#618059]"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Rezept & Zutaten
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditPlan(plan)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#5CA6CE] hover:bg-sky-50"
                            title="Mahlzeit bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMealPlan(plan.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Aus Essensplan entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Saved Recipes Accordion (Collapsed by default, categorized & filterable by Diet & Duration) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsRecipesExpanded((prev) => !prev)}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <ChefHat className="h-5 w-5 text-[#74956C]" />
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                Gespeicherte & Eingeplante Rezepte ({allAvailableRecipes.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Kategorisiert & filterbar nach Ernährungsart (Fleisch / Vegi) und Dauer
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F4F7F5] text-xs font-bold text-slate-700">
            {isRecipesExpanded ? (
              <>
                Einklappen <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Ausklappen <ChevronDown className="h-4 w-4" />
              </>
            )}
          </span>
        </button>

        {isRecipesExpanded && (
          <div className="p-4 border-t border-slate-200 space-y-4">
            {/* Filter Controls: Diet (Fleisch / Vegi), Duration, Cooking Method */}
            <div className="flex flex-wrap items-center gap-3 bg-[#F4F7F5] p-3 rounded-xl border border-slate-200/80">
              {/* Diet Filter */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Ernährung:</span>
                <button
                  type="button"
                  onClick={() => setDietFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    dietFilter === 'all' ? 'bg-[#1E293B] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setDietFilter('fleisch')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    dietFilter === 'fleisch' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  <Beef className="h-3.5 w-3.5" /> Fleisch
                </button>
                <button
                  type="button"
                  onClick={() => setDietFilter('vegi')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    dietFilter === 'vegi' ? 'bg-[#74956C] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  <Leaf className="h-3.5 w-3.5" /> Vegi
                </button>
              </div>

              {/* Duration Filter */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Dauer:</span>
                <button
                  type="button"
                  onClick={() => setDurationFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    durationFilter === 'all' ? 'bg-[#1E293B] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter('fast')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    durationFilter === 'fast'
                      ? 'bg-[#5CA6CE] text-white'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  ⚡ ≤ 20 Min.
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter('medium')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    durationFilter === 'medium'
                      ? 'bg-[#5CA6CE] text-white'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  ⏱️ 21–35 Min.
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter('long')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    durationFilter === 'long'
                      ? 'bg-[#5CA6CE] text-white'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  🍲 &gt; 35 Min.
                </button>
              </div>

              {/* Method Filter */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Gerät:</span>
                <button
                  type="button"
                  onClick={() => setMethodFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    methodFilter === 'all' ? 'bg-[#1E293B] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setMethodFilter('thermomix')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    methodFilter === 'thermomix'
                      ? 'bg-[#5CA6CE] text-white'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  Thermomix
                </button>
                <button
                  type="button"
                  onClick={() => setMethodFilter('standard')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    methodFilter === 'standard'
                      ? 'bg-[#74956C] text-white'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  Herkömmlich
                </button>
              </div>
            </div>

            {filteredRecipes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Keine Rezepte für diese Filterkombination gefunden.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRecipes.map((rec) => {
                  const diet = getDietCategory(rec);
                  return (
                    <div
                      key={rec.id}
                      onClick={() => openRecipeModal(rec)}
                      className="p-3.5 rounded-xl bg-[#F4F7F5] hover:bg-[#74956C]/10 border border-slate-200 cursor-pointer transition-colors space-y-1.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm text-[#1E293B]">{rec.title}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                diet === 'fleisch'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {diet === 'fleisch' ? '🥩 Fleisch' : '🥕 Vegi'}
                            </span>
                            {rec.cooking_method === 'thermomix' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#5CA6CE] text-white">
                                TM6
                              </span>
                            )}
                          </div>
                        </div>
                        {rec.description && (
                          <p className="text-xs text-slate-600 line-clamp-2">{rec.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-[#74956C]" />
                          {rec.prep_time_minutes || 30} Min. • {rec.base_portions} Port.
                        </span>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              addMealPlan({
                                planned_date: selectedDate,
                                slot_type: 'dinner',
                                custom_title: rec.title,
                                recipe_id: rec.id,
                                portions: rec.base_portions || 4,
                                includes_next_day_lunch: false,
                                cooking_method:
                                  rec.cooking_method === 'thermomix' ? 'thermomix' : 'standard',
                              });
                              openRecipeModal(rec);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#5CA6CE] text-white font-bold text-[11px] hover:bg-[#488eb5]"
                          >
                            + Einplanen
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Recipe & Ingredients Overview (Positioned z-[100] with bottom clearance so it's never covered by the menu!) */}
      {activeGeneratedRecipe && (
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 pt-16 pb-24 sm:p-6">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[80vh] sm:max-h-[85vh] flex flex-col">
            {/* Sticky Modal Header */}
            <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/20 text-white">
                    {activeGeneratedRecipe.base_portions} Portionen
                  </span>
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">
                    <Clock className="h-3 w-3" />
                    <input
                      type="number"
                      value={editablePrepMinutes}
                      onChange={(e) => setEditablePrepMinutes(Number(e.target.value) || 15)}
                      className="w-10 bg-transparent text-white font-extrabold focus:outline-none text-center"
                    />
                    <span>Min.</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={editableRecipeTitle}
                  onChange={(e) => setEditableRecipeTitle(e.target.value)}
                  className="text-base sm:text-lg font-extrabold mt-1 bg-transparent border-b border-white/40 focus:border-white focus:outline-none w-full text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveGeneratedRecipe(null)}
                className="text-white hover:bg-white/20 text-xs font-bold p-2 rounded-xl bg-white/15 shrink-0"
                title="Schliessen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
              {/* Step 1: Ingredients Check & Edit */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#1E293B]">
                    1. Zutaten-Übersicht (Anklicken = auf die Einkaufsliste)
                  </h3>
                  <span className="text-[11px] text-[#74956C] font-bold">
                    Grün markiert = wird eingekauft • Grau = schon zu Hause
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {editableIngredients.map((ing, idx) => {
                    const isSelectedToBuy = Boolean(selectedToBuyIds[ing.id]);
                    const catName =
                      categories.find((c) => c.slug === ing.store_category_slug)?.name ||
                      'Sonstiges';

                    return (
                      <div
                        key={ing.id}
                        onClick={() =>
                          setSelectedToBuyIds((prev) => ({
                            ...prev,
                            [ing.id]: !prev[ing.id],
                          }))
                        }
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
                          isSelectedToBuy
                            ? 'bg-[#74956C]/12 border-[#74956C] text-[#1E293B]'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelectedToBuy
                                ? 'bg-[#74956C] text-white'
                                : 'bg-white border border-slate-300'
                            }`}
                          >
                            {isSelectedToBuy && <ShoppingCart className="h-3 w-3" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold truncate ${
                                !isSelectedToBuy ? 'line-through' : ''
                              }`}
                            >
                              {ing.name}
                            </p>
                            <p className="text-[10px] text-slate-500">{catName}</p>
                          </div>
                        </div>

                        {/* Inline Editable Quantity & Delete */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="number"
                            step="any"
                            value={ing.quantity ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              setEditableIngredients((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, quantity: val } : item
                                )
                              );
                            }}
                            className="w-12 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#1E293B] text-right"
                          />
                          <span className="text-[11px] font-semibold text-slate-600">
                            {ing.unit || 'Stk'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditableIngredients((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Zutat aus Rezept entfernen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add New Ingredient to Recipe */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    placeholder="Weitere Zutat zum Rezept hinzufügen..."
                    className="flex-1 min-w-[160px] rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-[#1E293B]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={newIngQty}
                    onChange={(e) => setNewIngQty(e.target.value)}
                    placeholder="Menge"
                    className="w-20 rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-[#1E293B]"
                  />
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="rounded-xl border border-slate-300 px-2 py-1.5 text-xs text-[#1E293B] bg-white"
                  >
                    <option value="Stk">Stk</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="Pack">Pack</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddIngredientToModal}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                  >
                    + Zutat
                  </button>
                </div>
              </div>

              {/* Step 2: Thermomix Steps or Standard Instructions */}
              {activeGeneratedRecipe.thermomix_steps &&
              activeGeneratedRecipe.thermomix_steps.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-bold text-xs sm:text-sm text-[#5CA6CE] flex items-center gap-1.5">
                    <Flame className="h-4 w-4" />
                    Thermomix Schritt-für-Schritt Anleitung
                  </h3>
                  <div className="space-y-2">
                    {activeGeneratedRecipe.thermomix_steps.map((step) => (
                      <div
                        key={step.step_number}
                        className="p-3 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1E293B]">
                            Schritt {step.step_number}: {step.title}
                          </span>
                          <div className="flex gap-1 text-[10px] font-bold">
                            {step.time_setting && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-700 text-white">
                                {step.time_setting}
                              </span>
                            )}
                            {step.temp_setting && (
                              <span className="px-1.5 py-0.5 rounded bg-[#5CA6CE] text-white">
                                {step.temp_setting}
                              </span>
                            )}
                            {step.speed_setting && (
                              <span className="px-1.5 py-0.5 rounded bg-[#74956C] text-white">
                                {step.speed_setting}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{step.instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-bold text-xs sm:text-sm text-[#1E293B]">
                    Zubereitungsschritte
                  </h3>
                  <ol className="space-y-1.5 list-decimal list-inside text-xs text-slate-600 bg-[#F4F7F5] p-3.5 rounded-xl">
                    {activeGeneratedRecipe.instructions.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="px-5 py-3.5 bg-[#F4F7F5] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleSaveRecipeChangesOnly}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-[#1E293B] font-bold text-xs"
              >
                Nur Rezept-Änderungen speichern
              </button>
              <button
                type="button"
                onClick={handleSaveAndSendToShoppingList}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-xs shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Speichern & {editableIngredients.filter((i) => selectedToBuyIds[i.id]).length}{' '}
                Zutaten auf Einkaufsliste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
