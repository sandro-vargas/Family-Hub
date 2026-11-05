'use client';

import React, { useState } from 'react';
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
  RefreshCw,
  BookOpen,
  Sun,
  Moon,
  CalendarCheck2,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { VoiceInputButton } from '@/components/voice-input-button';
import { Recipe, RecipeIngredient } from '@/types/family';

function getUpcomingDays(count = 7): { iso: string; weekday: string; shortDay: string; label: string }[] {
  const days = [];
  const formatter = new Intl.DateTimeFormat('de-CH', { weekday: 'long' });
  const shortFormatter = new Intl.DateTimeFormat('de-CH', { weekday: 'short' });
  const dateFormatter = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit' });

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
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

function getPreviousDayIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) - 1));
  return dt.toISOString().split('T')[0];
}

export default function MealsPage() {
  const {
    household,
    recipes,
    addRecipe,
    mealWishes,
    addMealWish,
    deleteMealWish,
    mealPlans,
    addMealPlan,
    updateMealPlanPortions,
    deleteMealPlan,
    addOrMergeShoppingItems,
    categories,
  } = useFamily();

  const upcomingDays = getUpcomingDays(7);

  // AI Planner Input State
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedDate, setSelectedDate] = useState(upcomingDays[0].iso);
  const [portions, setPortions] = useState<number>(household.default_portions || 4);
  const [includesNextDayLunch, setIncludesNextDayLunch] = useState<boolean>(true);
  const [cookingMethod, setCookingMethod] = useState<'standard' | 'thermomix'>('standard');
  const [cookidooUrl, setCookidooUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal State for Ingredient Check ("Was ist schon zu Hause?") & Cooking View
  const [activeGeneratedRecipe, setActiveGeneratedRecipe] = useState<Recipe | null>(null);
  const [alreadyAtHomeIds, setAlreadyAtHomeIds] = useState<Record<string, boolean>>({});
  const [transferSuccessBanner, setTransferSuccessBanner] = useState<string | null>(null);

  // Wish List Input State
  const [wishTitle, setWishTitle] = useState('');
  const [wishMethod, setWishMethod] = useState<'standard' | 'thermomix'>('standard');
  const [wishNotes, setWishNotes] = useState('');
  const [recipeFilter, setRecipeFilter] = useState<'all' | 'standard' | 'thermomix'>('all');

  // Calculate 7-Day Meal Coverage (Lunch & Dinner)
  const dayCoverage = upcomingDays.map((day) => {
    const prevIso = getPreviousDayIso(day.iso);
    const explicitLunch = mealPlans.find(
      (p) => p.planned_date === day.iso && p.slot_type === 'lunch'
    );
    const warmupFromPrevDinner = mealPlans.find(
      (p) => p.planned_date === prevIso && p.includes_next_day_lunch
    );
    const dinnerPlan = mealPlans.find(
      (p) => p.planned_date === day.iso && p.slot_type !== 'lunch'
    );

    const hasLunch = Boolean(explicitLunch || warmupFromPrevDinner);
    const hasDinner = Boolean(dinnerPlan);
    const lunchTitle =
      explicitLunch?.custom_title ||
      (warmupFromPrevDinner ? `Aufwärmen: ${warmupFromPrevDinner.custom_title}` : null);
    const lunchPortions = explicitLunch?.portions || warmupFromPrevDinner?.portions || null;

    return {
      ...day,
      hasLunch,
      hasDinner,
      lunchTitle,
      lunchPortions,
      dinnerTitle: dinnerPlan?.custom_title || null,
      dinnerPortions: dinnerPlan?.portions || null,
    };
  });

  const lunchCoveredCount = dayCoverage.filter((d) => d.hasLunch).length;
  const dinnerCoveredCount = dayCoverage.filter((d) => d.hasDinner).length;
  const fullyCoveredDaysCount = dayCoverage.filter((d) => d.hasLunch && d.hasDinner).length;
  const totalPlannedPortions = mealPlans
    .filter((p) => upcomingDays.some((d) => d.iso === p.planned_date))
    .reduce((sum, p) => sum + (p.portions || 0), 0);

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
          store_category_slug: ing.store_category_slug || 'other',
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
        includes_next_day_lunch: includesNextDayLunch,
        cooking_method: cookingMethod,
        cookidoo_url: cookidooUrl.trim() || null,
        notes: includesNextDayLunch
          ? `${portions} Portionen (inkl. Mittagessen am nächsten Tag zum Aufwärmen)`
          : `${portions} Portionen`,
      });

      const initialHomeMap: Record<string, boolean> = {};
      savedRecipe.ingredients.forEach((ing) => {
        initialHomeMap[ing.id] = ing.is_pantry_staple;
      });
      setAlreadyAtHomeIds(initialHomeMap);
      setActiveGeneratedRecipe(savedRecipe);
      setAiPrompt('');
      setCookidooUrl('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenExistingRecipeCheck = (recipe: Recipe) => {
    const initialHomeMap: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      initialHomeMap[ing.id] = ing.is_pantry_staple;
    });
    setAlreadyAtHomeIds(initialHomeMap);
    setActiveGeneratedRecipe(recipe);
  };

  const handleSendMissingToShoppingList = () => {
    if (!activeGeneratedRecipe) return;

    const missingIngredients = activeGeneratedRecipe.ingredients.filter(
      (ing) => !alreadyAtHomeIds[ing.id]
    );

    addOrMergeShoppingItems(
      missingIngredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        store_category_slug: ing.store_category_slug,
      }))
    );

    setTransferSuccessBanner(
      `${missingIngredients.length} benötigte Zutaten für "${activeGeneratedRecipe.title}" wurden auf die Einkaufsliste übernommen!`
    );
    setActiveGeneratedRecipe(null);
    setTimeout(() => setTransferSuccessBanner(null), 5000);
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishTitle.trim()) return;
    addMealWish(wishTitle, wishMethod, wishNotes);
    setWishTitle('');
    setWishNotes('');
  };

  const filteredRecipes = recipes.filter((r) =>
    recipeFilter === 'all' ? true : r.cooking_method === recipeFilter
  );

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {transferSuccessBanner && (
        <div className="bg-[#74956C] text-white px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between text-sm font-bold">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span>{transferSuccessBanner}</span>
          </div>
        </div>
      )}

      {/* AI Recipe & Meal Plan Generator Box */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold">
                KI-Essensplanung & Rezept-Assistent
              </h1>
              <p className="text-xs text-white/90">
                Sag oder tippe z. B. „Dienstag Schnitzel mit Pommes“ – wird automatisch inkl. Portionengrösse als Kategorie „Essen“ im Familienkalender eingetragen
              </p>
            </div>
          </div>

          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold shrink-0"
          >
            <CalendarCheck2 className="h-4 w-4" />
            Im Kalender ansehen
          </Link>
        </div>

        <form onSubmit={handleGenerateRecipeAndPlan} className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='z.B. "Dienstag Schnitzel mit Pommes" oder "Poulet-Curry im Thermomix"'
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CA6CE]"
              />
              <VoiceInputButton onTranscript={(text) => setAiPrompt(text)} />
            </div>

            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-[#1E293B] bg-white font-bold focus:outline-none focus:ring-2 focus:ring-[#5CA6CE]"
            >
              {upcomingDays.map((d) => (
                <option key={d.iso} value={d.iso}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Cooking Method: Standard vs Thermomix */}
            <div className="bg-[#F4F7F5] p-3 rounded-xl border border-slate-200 flex items-center justify-between">
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

            {/* Portions Selector (4-5 Default) */}
            <div className="bg-[#F4F7F5] p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Users className="h-4 w-4 text-[#74956C]" />
                Portionengrösse:
              </span>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4, 5, 6].map((p) => (
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

            {/* Next Day Lunch Warm-Up Toggle */}
            <label className="bg-[#F4F7F5] p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">
                  + Morgen Mittag aufwärmen
                </span>
                <span className="text-[11px] text-slate-500">
                  Deckt Folgetag-Mittagessen ab
                </span>
              </div>
              <input
                type="checkbox"
                checked={includesNextDayLunch}
                onChange={(e) => setIncludesNextDayLunch(e.target.checked)}
                className="h-5 w-5 accent-[#74956C] rounded"
              />
            </label>
          </div>

          {cookingMethod === 'thermomix' && (
            <div className="flex items-center gap-2 bg-[#5CA6CE]/10 border border-[#5CA6CE]/30 p-3 rounded-xl">
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
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] disabled:opacity-50 text-white font-bold text-sm shadow-xs transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating
                ? 'Gemini berechnet Rezept & Migros-Zutaten...'
                : 'Einplanen, in Kalender eintragen & Zutaten abgleichen'}
            </button>
          </div>
        </form>
      </div>

      {/* NEW: Separate Compact Meal Coverage Overview (Mittag- & Abendessen Abdeckung) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#74956C]/15 text-[#74956C]">
              Mahlzeiten-Abdeckung (7-Tage-Übersicht)
            </span>
            <h2 className="font-extrabold text-base text-[#1E293B] mt-1">
              Wie viele Tage sind mit dem aktuellen Essensplan abgedeckt?
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-[#F4F7F5] border border-slate-200 text-[#1E293B] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#74956C]" />
              Gesamt geplant: {totalPlannedPortions} Portionen
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#74956C]/15 text-[#4d6847]">
              {fullyCoveredDaysCount} von 7 Tagen komplett (Mittag + Abend)
            </span>
          </div>
        </div>

        {/* 2 Summary Bars: Lunch Coverage & Dinner Coverage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-amber-500" />
                Mittagessen abgedeckt (inkl. Aufwärm-Tage)
              </span>
              <span className="text-sm font-extrabold text-[#74956C]">
                {lunchCoveredCount} / 7 Tage
              </span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#74956C] transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((lunchCoveredCount / 7) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {lunchCoveredCount === 0
                ? 'Noch kein Mittagessen / Aufwärm-Essen für die nächsten 7 Tage geplant.'
                : `Für ${lunchCoveredCount} Tage ist das Mittagessen (durch Vorabend-Portionen oder Mittagsmenü) gesichert.`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
                <Moon className="h-4 w-4 text-[#5CA6CE]" />
                Abendessen abgedeckt
              </span>
              <span className="text-sm font-extrabold text-[#5CA6CE]">
                {dinnerCoveredCount} / 7 Tage
              </span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#5CA6CE] transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((dinnerCoveredCount / 7) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {dinnerCoveredCount === 0
                ? 'Noch kein Abendessen für die nächsten 7 Tage eingeplant.'
                : `Für ${dinnerCoveredCount} Abende steht das Familien-Nachtessen inkl. Portionengrösse fest.`}
            </p>
          </div>
        </div>

        {/* 7-Day Mini Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-1">
          {dayCoverage.map((d) => (
            <div
              key={d.iso}
              className="p-2.5 rounded-xl bg-[#F4F7F5] border border-slate-200/90 flex flex-col justify-between gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#1E293B]">{d.shortDay}</span>
                <span className="text-[10px] text-slate-400">{d.iso.slice(8, 10)}.{d.iso.slice(5, 7)}.</span>
              </div>

              <div className="space-y-1">
                <div
                  title={d.lunchTitle || 'Kein Mittagessen geplant'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between ${
                    d.hasLunch
                      ? 'bg-[#74956C]/15 text-[#4d6847] border border-[#74956C]/30'
                      : 'bg-white text-slate-400 border border-slate-200/70'
                  }`}
                >
                  <span>Mittag</span>
                  <span>{d.hasLunch ? `${d.lunchPortions}P ✓` : '–'}</span>
                </div>

                <div
                  title={d.dinnerTitle || 'Kein Abendessen geplant'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between ${
                    d.hasDinner
                      ? 'bg-[#5CA6CE]/15 text-[#2d7ba4] border border-[#5CA6CE]/30'
                      : 'bg-white text-slate-400 border border-slate-200/70'
                  }`}
                >
                  <span>Abend</span>
                  <span>{d.hasDinner ? `${d.dinnerPortions}P ✓` : '–'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-Column Layout: Weekly Meal Plan (Left) & Wishes + Saved Recipes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Flexible Weekly Plan */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-[#1E293B] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#74956C]" />
              Euer Wochenplan (inkl. Portionengrösse & Aufwärm-Tage)
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Synchronisiert mit Kalender („Essen“)
            </span>
          </div>

          <div className="space-y-3">
            {upcomingDays.map((day) => {
              const dayPlans = mealPlans.filter((p) => p.planned_date === day.iso);
              const prevDayIso = getPreviousDayIso(day.iso);
              const prevDayWarmupPlan = mealPlans.find(
                (p) => p.planned_date === prevDayIso && p.includes_next_day_lunch
              );

              return (
                <div
                  key={day.iso}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#1E293B]">{day.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.iso);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-[#5CA6CE] hover:underline"
                    >
                      + Für diesen Tag planen
                    </button>
                  </div>

                  {/* Automatic Leftover Warmup Badge from Previous Evening */}
                  {prevDayWarmupPlan && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#74956C]/12 border border-[#74956C]/30 text-xs">
                      <div className="flex items-center gap-2 font-medium text-[#1E293B]">
                        <RefreshCw className="h-4 w-4 text-[#74956C] shrink-0" />
                        <span>
                          <strong>Mittagessen (Aufwärmen):</strong> {prevDayWarmupPlan.custom_title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-white text-[#4d6847] border border-[#74956C]/30 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Portionengrösse: {prevDayWarmupPlan.portions} Portionen (Vorabend)
                        </span>
                      </div>
                    </div>
                  )}

                  {dayPlans.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      Noch kein Abendessen geplant.
                    </p>
                  ) : (
                    dayPlans.map((plan) => {
                      const linkedRecipe = recipes.find((r) => r.id === plan.recipe_id);
                      return (
                        <div
                          key={plan.id}
                          className="p-3.5 rounded-xl bg-[#F4F7F5] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#74956C] text-white">
                                {plan.slot_type === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                              </span>

                              {/* Prominent Portion Size Badge + Stepper */}
                              <div className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-300 shadow-2xs">
                                <Users className="h-3.5 w-3.5 text-[#74956C]" />
                                <span className="text-[11px] font-extrabold text-[#1E293B]">
                                  Portionengrösse: {plan.portions} Port.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateMealPlanPortions(plan.id, plan.portions - 1)}
                                  className="ml-1 h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                                  title="1 Portion weniger"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateMealPlanPortions(plan.id, plan.portions + 1)}
                                  className="h-5 w-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                                  title="1 Portion mehr"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              {plan.cooking_method === 'thermomix' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#5CA6CE] text-white flex items-center gap-1">
                                  <Flame className="h-3 w-3" />
                                  Thermomix
                                </span>
                              )}
                              {plan.includes_next_day_lunch && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#74956C]/15 text-[#4d6847]">
                                  + Folgetag Mittag abgedeckt
                                </span>
                              )}
                            </div>

                            <h3 className="font-extrabold text-base text-[#1E293B]">
                              {plan.custom_title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <CreatorBadge memberId={plan.created_by_member_id} />
                              <span className="text-[11px] font-semibold text-[#74956C] flex items-center gap-1">
                                <CalendarCheck2 className="h-3.5 w-3.5" />
                                Im Kalender (Kategorie „Essen“)
                              </span>
                              {plan.cookidoo_url && (
                                <a
                                  href={plan.cookidoo_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Cookidoo öffnen
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {linkedRecipe && (
                              <button
                                type="button"
                                onClick={() => handleOpenExistingRecipeCheck(linkedRecipe)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#74956C] text-white hover:bg-[#618059]"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                Rezept & Zutaten
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteMealPlan(plan.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Aus Essensplan & Kalender entfernen"
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

        {/* Right 5 Columns: Meal Wishes & Saved Recipes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Meal Wish List */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 space-y-4">
            <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-[#5CA6CE]" />
              Essens-Wunschliste der Familie
            </h2>

            <form onSubmit={handleAddWish} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wishTitle}
                  onChange={(e) => setWishTitle(e.target.value)}
                  placeholder="Neuer Essenswunsch (z.B. Älplermagronen)..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
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
                  className="px-3 py-2 rounded-xl bg-[#74956C] text-white text-xs font-bold hover:bg-[#618059]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {mealWishes.map((wish) => (
                <div
                  key={wish.id}
                  className="p-3 rounded-xl bg-[#F4F7F5] border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-[#1E293B] truncate">
                        {wish.title}
                      </p>
                      {wish.preferred_cooking_method === 'thermomix' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5CA6CE]/15 text-[#3b82a6]">
                          TM6
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CreatorBadge memberId={wish.created_by_member_id} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAiPrompt(wish.title);
                        setCookingMethod(wish.preferred_cooking_method);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#5CA6CE]/15 text-[#2d7ba4] hover:bg-[#5CA6CE] hover:text-white text-xs font-bold transition-colors"
                    >
                      Einplanen
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMealWish(wish.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Family Recipes Repository */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-[#74956C]" />
                Gespeicherte Rezepte ({filteredRecipes.length})
              </h2>
              <div className="flex gap-1 bg-[#F4F7F5] p-1 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setRecipeFilter('all')}
                  className={`px-2.5 py-1 rounded-md ${
                    recipeFilter === 'all' ? 'bg-[#74956C] text-white' : 'text-slate-600'
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setRecipeFilter('thermomix')}
                  className={`px-2.5 py-1 rounded-md ${
                    recipeFilter === 'thermomix' ? 'bg-[#5CA6CE] text-white' : 'text-slate-600'
                  }`}
                >
                  Thermomix
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredRecipes.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => handleOpenExistingRecipeCheck(rec)}
                  className="p-3.5 rounded-xl bg-[#F4F7F5] hover:bg-[#74956C]/10 border border-slate-200 cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-[#1E293B]">{rec.title}</h3>
                    {rec.cooking_method === 'thermomix' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#5CA6CE] text-white shrink-0">
                        Thermomix
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{rec.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-[#74956C]" />
                      {rec.prep_time_minutes || 30} Min. • Standard: {rec.base_portions} Portionen
                    </span>
                    <CreatorBadge memberId={rec.created_by_member_id} showName={false} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Ingredient Check ("Was ist schon zu Hause?") & Recipe Steps */}
      {activeGeneratedRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/20 text-white">
                    {activeGeneratedRecipe.base_portions} Portionen
                  </span>
                  {activeGeneratedRecipe.cooking_method === 'thermomix' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white text-[#2d7ba4]">
                      Thermomix TM6 Modus
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold mt-1">{activeGeneratedRecipe.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveGeneratedRecipe(null)}
                className="text-white hover:bg-white/20 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/15"
              >
                Schliessen
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Step 1: Check what is already at home */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#1E293B]">
                    1. Zutaten-Check: Hake ab, was ihr schon zu Hause habt
                  </h3>
                  <span className="text-xs text-[#74956C] font-bold">
                    Rest kommt auf die Einkaufsliste
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeGeneratedRecipe.ingredients.map((ing) => {
                    const isAtHome = Boolean(alreadyAtHomeIds[ing.id]);
                    const catName =
                      categories.find((c) => c.slug === ing.store_category_slug)?.name ||
                      'Sonstiges';

                    return (
                      <div
                        key={ing.id}
                        onClick={() =>
                          setAlreadyAtHomeIds((prev) => ({
                            ...prev,
                            [ing.id]: !prev[ing.id],
                          }))
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
                          isAtHome
                            ? 'bg-slate-100 border-slate-200 text-slate-400'
                            : 'bg-[#74956C]/10 border-[#74956C] text-[#1E293B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                              isAtHome
                                ? 'bg-slate-500 text-white'
                                : 'bg-white border-2 border-[#74956C]'
                            }`}
                          >
                            {isAtHome && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate ${
                                isAtHome ? 'line-through' : ''
                              }`}
                            >
                              {ing.quantity ? `${ing.quantity} ${ing.unit || ''} ` : ''}
                              {ing.name}
                            </p>
                            <p className="text-[10px] text-slate-500">{catName}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-white">
                          {isAtHome ? 'Zu Hause' : 'Einkaufen'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Thermomix Steps or Standard Instructions */}
              {activeGeneratedRecipe.thermomix_steps &&
              activeGeneratedRecipe.thermomix_steps.length > 0 ? (
                <div className="space-y-2.5">
                  <h3 className="font-bold text-sm text-[#5CA6CE] flex items-center gap-1.5">
                    <Flame className="h-4 w-4" />
                    Thermomix Schritt-für-Schritt Anleitung
                  </h3>
                  <div className="space-y-2">
                    {activeGeneratedRecipe.thermomix_steps.map((step) => (
                      <div
                        key={step.step_number}
                        className="p-3.5 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1E293B]">
                            Schritt {step.step_number}: {step.title}
                          </span>
                          <div className="flex gap-1.5 text-[11px] font-bold">
                            {step.time_setting && (
                              <span className="px-2 py-0.5 rounded bg-slate-700 text-white">
                                {step.time_setting}
                              </span>
                            )}
                            {step.temp_setting && (
                              <span className="px-2 py-0.5 rounded bg-[#5CA6CE] text-white">
                                {step.temp_setting}
                              </span>
                            )}
                            {step.speed_setting && (
                              <span className="px-2 py-0.5 rounded bg-[#74956C] text-white">
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
                  <h3 className="font-bold text-sm text-[#1E293B]">Zubereitungsschritte</h3>
                  <ol className="space-y-2 list-decimal list-inside text-xs text-slate-600 bg-[#F4F7F5] p-4 rounded-xl">
                    {activeGeneratedRecipe.instructions.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[#F4F7F5] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-600">
                {
                  activeGeneratedRecipe.ingredients.filter((i) => !alreadyAtHomeIds[i.id])
                    .length
                }{' '}
                von {activeGeneratedRecipe.ingredients.length} Zutaten werden eingekauft
              </span>
              <button
                type="button"
                onClick={handleSendMissingToShoppingList}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-xs shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Fehlende Zutaten auf Einkaufsliste übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
