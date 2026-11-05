'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CloudSun,
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  PackagePlus,
  Flame,
  Wind,
  ArrowRight,
  Plus,
  Sparkles,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  Sun,
  Moon,
  CheckSquare,
  Compass,
  Hand,
  Check,
  ChefHat,
  Settings,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { VoiceInputButton } from '@/components/voice-input-button';
import { WeatherData } from '@/types/family';

function getUpcoming7IsoDates(baseDate: Date): string[] {
  const list: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    list.push(d.toISOString().split('T')[0]);
  }
  return list;
}

function getPrevIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) - 1));
  return dt.toISOString().split('T')[0];
}

export default function AndroidHomeScreenPage() {
  const {
    household,
    activeMember,
    calendarEvents,
    mealPlans,
    recipes,
    shoppingItems,
    addOrMergeShoppingItems,
    householdNeeds,
    todos,
    todoCategories,
    toggleTodoCompleted,
    claimTodo,
    leisureActivities,
    isKioskMode,
  } = useFamily();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [quickShopInput, setQuickShopInput] = useState('');
  const [quickAddedFeedback, setQuickAddedFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch('/api/weather')
      .then((r) => r.json())
      .then((data) => setWeather(data))
      .catch(() => null);

    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayIso = now.toISOString().split('T')[0];
  const todayDinner = mealPlans.find((m) => m.planned_date === todayIso);

  // Calculate 7-day coverage for Widget 1
  const next7Isos = getUpcoming7IsoDates(now);
  const lunchCoveredDays = next7Isos.filter((iso) => {
    const prevIso = getPrevIso(iso);
    const hasExplicitLunch = mealPlans.some(
      (p) => p.planned_date === iso && p.slot_type === 'lunch'
    );
    const hasWarmupLunch = mealPlans.some(
      (p) => p.planned_date === prevIso && p.includes_next_day_lunch
    );
    return hasExplicitLunch || hasWarmupLunch;
  }).length;

  const dinnerCoveredDays = next7Isos.filter((iso) =>
    mealPlans.some((p) => p.planned_date === iso && p.slot_type !== 'lunch')
  ).length;

  const openShopping = shoppingItems.filter((i) => !i.is_checked);
  const openNeeds = householdNeeds.filter((n) => !n.is_purchased);
  const openTodos = todos.filter((t) => !t.is_completed);
  const topTodo = openTodos[0] || null;
  const topTodoCategory = topTodo
    ? todoCategories.find((c) => c.slug === topTodo.category_slug)
    : null;

  const handleQuickAddShopping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShopInput.trim()) return;
    const itemTitle = quickShopInput.trim();
    addOrMergeShoppingItems([
      {
        name: itemTitle,
        quantity: 1,
        unit: 'Stk',
        store_category_slug: 'produce',
      },
    ]);
    setQuickShopInput('');
    setQuickAddedFeedback(`„${itemTitle}“ auf Einkaufsliste gesetzt!`);
    setTimeout(() => setQuickAddedFeedback(null), 3500);
  };

  const formattedDate = mounted
    ? new Intl.DateTimeFormat('de-CH', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(now)
    : '';

  const formattedTime = mounted ? now.toTimeString().slice(0, 5) : '';

  // 8 Android Launcher App Icons (2x4 on Tablet/Desktop, 4x2 on Pixel Smartphone)
  const appIcons = [
    {
      id: 'app-shopping',
      href: '/shopping',
      label: 'Einkaufsliste',
      subLabel: openShopping.length > 0 ? `${openShopping.length} offen` : 'Alles erledigt',
      icon: ShoppingCart,
      gradient: 'from-[#74956C] via-[#63845B] to-[#4A6844]',
      badge: openShopping.length > 0 ? String(openShopping.length) : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'app-meals',
      href: '/meals',
      label: 'Essensplan',
      subLabel: `${dinnerCoveredDays}/7 Abende`,
      icon: UtensilsCrossed,
      gradient: 'from-[#5CA6CE] via-[#488EB5] to-[#327396]',
      badge: todayDinner ? `${todayDinner.portions}P` : null,
      badgeColor: 'bg-[#74956C] text-white',
    },
    {
      id: 'app-calendar',
      href: '/calendar',
      label: 'Kalender',
      subLabel: '2-Wege Google Sync',
      icon: CalendarDays,
      gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]',
      badge: calendarEvents.length > 0 ? String(calendarEvents.length) : null,
      badgeColor: 'bg-sky-500 text-white',
    },
    {
      id: 'app-todos',
      href: '/todos',
      label: 'ToDos',
      subLabel: 'Kita, Haushalt & Co.',
      icon: CheckSquare,
      gradient: 'from-[#F59E0B] via-[#D97706] to-[#B45309]',
      badge: openTodos.length > 0 ? String(openTodos.length) : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'app-leisure',
      href: '/leisure',
      label: 'Freizeit ZH',
      subLabel: '≤ 30 Min. ab Grüt',
      icon: Compass,
      gradient: 'from-[#10B981] via-[#059669] to-[#047857]',
      badge: `${leisureActivities.length}`,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'app-needs',
      href: '/needs',
      label: 'Bedarf',
      subLabel: 'Haushalt & Online',
      icon: PackagePlus,
      gradient: 'from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9]',
      badge: openNeeds.length > 0 ? String(openNeeds.length) : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'app-recipes',
      href: '/meals',
      label: 'Rezepte & TM6',
      subLabel: 'Thermomix & KI',
      icon: ChefHat,
      gradient: 'from-[#EC4899] via-[#DB2777] to-[#BE185D]',
      badge: `${recipes.length}`,
      badgeColor: 'bg-slate-800 text-white',
    },
    {
      id: 'app-settings',
      href: '/settings',
      label: 'Setup',
      subLabel: 'Profile & Kalender-ID',
      icon: Settings,
      gradient: 'from-[#64748B] via-[#475569] to-[#334155]',
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. iPad Kiosk Mode Header OR Compact Android "At a Glance" Status Bar */}
      {isKioskMode ? (
        <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white rounded-[32px] p-6 shadow-lg border border-white/30 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-white/20 text-white backdrop-blur-xs">
                iPad Home Screen
              </span>
              <span className="text-xs font-medium text-white/90">
                {household.weather_location_name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {formattedDate} • <span className="underline decoration-white/50">{formattedTime} Uhr</span>
            </h1>
            <p className="text-xs text-white/90">
              Aktives Familienprofil:{' '}
              <strong className="text-white font-bold">{activeMember.display_name}</strong>
            </p>
          </div>

          <div className="bg-white/95 text-[#1E293B] rounded-2xl p-4 shadow-sm flex items-center gap-4 min-w-[260px]">
            <div className="h-12 w-12 rounded-2xl bg-[#5CA6CE]/15 border border-[#5CA6CE]/30 flex items-center justify-center shrink-0">
              <CloudSun className="h-7 w-7 text-[#5CA6CE]" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-extrabold text-[#1E293B]">
                  {weather ? `${weather.temperature}°C` : '16°C'}
                </span>
                <span className="text-xs font-bold text-[#5CA6CE]">8624 Grüt (ZH)</span>
              </div>
              <p className="text-xs font-semibold text-slate-600">
                {weather?.conditionLabel || 'Freundlich & mild'}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-slate-500">
                <span>
                  Min {weather?.tempMin ?? 9}° / Max {weather?.tempMax ?? 19}°
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3 text-[#5CA6CE]" /> {weather?.windSpeed ?? 8} km/h
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#4d6847]">
              {household.weather_location_name}
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E293B] tracking-tight">
              {formattedDate} • {formattedTime} Uhr
            </h1>
          </div>

          <div className="inline-flex items-center gap-2.5 bg-white/85 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xs border border-white/90">
            <CloudSun className="h-5 w-5 text-[#5CA6CE]" />
            <div className="text-xs">
              <span className="font-extrabold text-[#1E293B]">
                {weather ? `${weather.temperature}°C` : '16°C'}
              </span>
              <span className="text-slate-500 ml-1.5">
                {weather?.conditionLabel || 'Grüt ZH'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP HALF: 2 Interactive Android Live Widgets Side-by-Side (Vorschlag 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* ANDROID WIDGET 1 (Left, 6 cols): Essen (Portionen) & 7-Tage-Abdeckung */}
        <div className="lg:col-span-6 bg-white/90 backdrop-blur-xl rounded-[30px] p-5 shadow-md border border-white flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[#74956C] to-[#55774E] flex items-center justify-center text-white shadow-xs">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#74956C] block">
                    LIVE-WIDGET • ESSENSPLAN
                  </span>
                  <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                    Essen ({todayDinner?.portions || household.default_portions} Port.) & 7-Tage Abdeckung
                  </h2>
                </div>
              </div>

              <Link
                href="/meals"
                className="px-3 py-1.5 rounded-xl bg-[#F4F7F5] hover:bg-[#74956C] hover:text-white text-xs font-bold text-[#4d6847] transition-colors flex items-center gap-1 shrink-0"
              >
                Planen <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Today's Planned Meal Box inside Widget */}
            {todayDinner ? (
              <Link
                href="/meals"
                className="block p-3.5 rounded-2xl bg-[#F4F7F5] hover:bg-[#74956C]/10 border border-slate-200/80 transition-colors space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-[#74956C] text-white text-[10px] font-extrabold uppercase flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Heute Abend • {todayDinner.portions} Portionen
                  </span>
                  <div className="flex items-center gap-1.5">
                    {todayDinner.cooking_method === 'thermomix' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5CA6CE] text-white flex items-center gap-1">
                        <Flame className="h-3 w-3" /> TM6
                      </span>
                    )}
                    <CreatorBadge memberId={todayDinner.created_by_member_id} showName={false} />
                  </div>
                </div>

                <p className="font-extrabold text-base text-[#1E293B]">
                  {todayDinner.custom_title}
                </p>

                {todayDinner.includes_next_day_lunch && (
                  <p className="text-[11px] font-bold text-[#4d6847] flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 text-[#74956C]" />
                    Reicht morgen Mittag direkt zum Aufwärmen
                  </p>
                )}
              </Link>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#F4F7F5] border border-slate-200/80 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Heute noch kein Abendessen geplant.
                </span>
                <Link
                  href="/meals"
                  className="px-3 py-1.5 rounded-xl bg-[#5CA6CE] text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" /> KI-Planer
                </Link>
              </div>
            )}

            {/* 7-Day Coverage Progress Bars inside Widget */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-[#F4F7F5] border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5 text-amber-500" /> Mittag
                  </span>
                  <span className="font-extrabold text-[#74956C]">
                    {lunchCoveredDays} / 7 Tage
                  </span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-[#74956C] rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((lunchCoveredDays / 7) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#F4F7F5] border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5 text-[#5CA6CE]" /> Abend
                  </span>
                  <span className="font-extrabold text-[#5CA6CE]">
                    {dinnerCoveredDays} / 7 Tage
                  </span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-[#5CA6CE] rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((dinnerCoveredDays / 7) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ANDROID WIDGET 2 (Right, 6 cols): Nächste Termine & Kita / Familien-ToDo */}
        <div className="lg:col-span-6 bg-white/90 backdrop-blur-xl rounded-[30px] p-5 shadow-md border border-white flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[#5CA6CE] to-[#3B82A6] flex items-center justify-center text-white shadow-xs">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2d7ba4] block">
                    LIVE-WIDGET • KALENDER & KITA-TODO
                  </span>
                  <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                    Nächste Termine & Offenes ToDo
                  </h2>
                </div>
              </div>

              <Link
                href="/calendar"
                className="px-3 py-1.5 rounded-xl bg-[#F4F7F5] hover:bg-[#5CA6CE] hover:text-white text-xs font-bold text-[#2d7ba4] transition-colors flex items-center gap-1 shrink-0"
              >
                Kalender <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Next 2 Appointments */}
            <div className="space-y-2">
              {calendarEvents.slice(0, 2).map((ev) => {
                const startD = new Date(ev.start_at);
                const dateLabel = new Intl.DateTimeFormat('de-CH', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                }).format(startD);
                const timeLabel = ev.is_all_day
                  ? 'Ganztägig'
                  : `${startD.toTimeString().slice(0, 5)} Uhr`;

                return (
                  <Link
                    key={ev.id}
                    href="/calendar"
                    className="p-3 rounded-2xl bg-[#F4F7F5] hover:bg-[#5CA6CE]/10 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#74956C]">
                        <span>{dateLabel}</span>
                        <span>•</span>
                        <span className="text-slate-600 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#5CA6CE]" /> {timeLabel}
                        </span>
                      </div>
                      <p className="font-extrabold text-xs sm:text-sm text-[#1E293B] truncate">
                        {ev.title}
                      </p>
                      {ev.location && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-[#5CA6CE]" /> {ev.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ev.assigned_member_ids.slice(0, 2).map((mId) => (
                        <CreatorBadge key={mId} memberId={mId} showName={false} />
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Highlighted Open Kita / Family ToDo inside Widget 2 */}
            {topTodo && (
              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleTodoCompleted(topTodo.id)}
                    className="h-5 w-5 rounded-md border-2 border-amber-600 bg-white hover:bg-amber-100 flex items-center justify-center shrink-0"
                    title="ToDo direkt erledigen"
                  >
                    <Check className="h-3 w-3 text-amber-700 opacity-0 hover:opacity-100" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-2 py-0.2 rounded-full text-[9px] font-extrabold text-white uppercase"
                        style={{ backgroundColor: topTodoCategory?.color_hex || '#EAB308' }}
                      >
                        {topTodoCategory?.name || 'ToDo'}
                      </span>
                      {topTodo.due_date && (
                        <span className="text-[10px] font-bold text-amber-800">
                          Deadline: {topTodo.due_date.slice(8, 10)}.{topTodo.due_date.slice(5, 7)}.
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-xs text-[#1E293B] truncate mt-0.5">
                      {topTodo.title}
                    </p>
                  </div>
                </div>

                {topTodo.assigned_member_id ? (
                  <CreatorBadge memberId={topTodo.assigned_member_id} showName={false} />
                ) : activeMember.role === 'adult' ? (
                  <button
                    type="button"
                    onClick={() => claimTodo(topTodo.id, activeMember.id)}
                    className="px-2.5 py-1 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] text-white text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                  >
                    <Hand className="h-3 w-3" /> Übernehmen
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM HALF: Android Launcher App Icon Grid (4 cols on Tablet/Desktop, 4 cols on Phone) */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[34px] p-5 sm:p-7 shadow-sm border border-white/80">
        <div className="grid grid-cols-4 gap-y-6 gap-x-3 sm:gap-x-6 max-w-4xl mx-auto">
          {appIcons.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                href={app.href}
                className="group flex flex-col items-center text-center select-none"
              >
                <div className="relative">
                  {/* Tactile 3D Android Squircle Icon */}
                  <div
                    className={`h-16 w-16 sm:h-20 sm:w-20 rounded-[22px] sm:rounded-[26px] bg-gradient-to-br ${app.gradient} flex items-center justify-center text-white shadow-lg ring-2 ring-white/80 transition-all duration-200 group-hover:scale-108 group-hover:-translate-y-1 group-active:scale-95`}
                  >
                    <Icon className="h-7 w-7 sm:h-9 sm:w-9 drop-shadow-xs" />
                  </div>

                  {/* Notification Badge on Top-Right of App Icon */}
                  {app.badge && (
                    <span
                      className={`absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full ${app.badgeColor} text-[11px] font-extrabold flex items-center justify-center shadow-md ring-2 ring-white`}
                    >
                      {app.badge}
                    </span>
                  )}
                </div>

                <span className="mt-2 font-extrabold text-xs sm:text-sm text-[#1E293B] tracking-tight group-hover:text-[#5CA6CE] transition-colors">
                  {app.label}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden sm:block">
                  {app.subLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Android Pixel Search / Quick-Add Bar (Direct Shopping Input + Voice Input) */}
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleQuickAddShopping}
          className="bg-white/95 backdrop-blur-xl rounded-full p-2 pl-5 shadow-md border border-white flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4 text-[#74956C] shrink-0" />
          <input
            type="text"
            value={quickShopInput}
            onChange={(e) => setQuickShopInput(e.target.value)}
            placeholder="Schnell-Eingabe: Artikel direkt auf die Einkaufsliste setzen (z.B. Milch, Brot, Windeln)..."
            className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-[#1E293B] placeholder:text-slate-400 focus:outline-none"
          />
          <VoiceInputButton onTranscript={(t) => setQuickShopInput(t)} />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-full bg-[#74956C] hover:bg-[#618059] text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Auf Liste</span>
          </button>
        </form>

        {quickAddedFeedback && (
          <p className="text-center text-xs font-extrabold text-[#4d6847] mt-2">
            ✓ {quickAddedFeedback}
          </p>
        )}
      </div>
    </div>
  );
}
