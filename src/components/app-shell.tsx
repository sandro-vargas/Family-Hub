'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ShoppingCart,
  UtensilsCrossed,
  CalendarDays,
  CheckSquare,
  Compass,
  PackagePlus,
  Settings,
  Tablet,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';

const DOCK_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: LayoutGrid,
    gradient: 'from-[#74956C] to-[#5CA6CE]',
  },
  {
    href: '/shopping',
    label: 'Einkauf',
    icon: ShoppingCart,
    gradient: 'from-[#74956C] to-[#55774E]',
    badgeKey: 'shopping' as const,
  },
  {
    href: '/meals',
    label: 'Essensplan',
    icon: UtensilsCrossed,
    gradient: 'from-[#689F77] to-[#4A7C59]',
  },
  {
    href: '/calendar',
    label: 'Kalender',
    icon: CalendarDays,
    gradient: 'from-[#5CA6CE] to-[#3B82A6]',
  },
  {
    href: '/todos',
    label: 'ToDos',
    icon: CheckSquare,
    gradient: 'from-[#EAB308] to-[#CA8A04]',
    badgeKey: 'todos' as const,
  },
  {
    href: '/leisure',
    label: 'Freizeit',
    icon: Compass,
    gradient: 'from-[#3B9B78] to-[#267357]',
  },
  {
    href: '/needs',
    label: 'Bedarf',
    icon: PackagePlus,
    gradient: 'from-[#7E6BCE] to-[#5E4BA8]',
    badgeKey: 'needs' as const,
  },
  {
    href: '/settings',
    label: 'Setup',
    icon: Settings,
    gradient: 'from-[#64748B] to-[#475569]',
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    household,
    members,
    activeMember,
    setActiveMemberId,
    isKioskMode,
    setIsKioskMode,
    shoppingItems,
    householdNeeds,
    todos,
  } = useFamily();

  const selectableMembers = members.filter((m) => m.is_selectable_actor);
  const openShoppingCount = shoppingItems.filter((i) => !i.is_checked).length;
  const openNeedsCount = householdNeeds.filter((n) => !n.is_purchased).length;
  const openTodosCount = todos.filter((t) => !t.is_completed).length;

  const isHomeScreen = pathname === '/';

  const getBadgeCount = (key?: 'shopping' | 'todos' | 'needs') => {
    if (key === 'shopping') return openShoppingCount;
    if (key === 'todos') return openTodosCount;
    if (key === 'needs') return openNeedsCount;
    return 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#DCE8DF] via-[#EBF2EE] to-[#D6E7F2] text-[#1E293B] relative overflow-x-hidden">
      {/* Subtle Ambient Android Wallpaper Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-[#74956C]/15 blur-3xl" />
        <div className="absolute top-1/3 -right-28 w-96 h-96 rounded-full bg-[#5CA6CE]/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      {/* Android Launcher Top Status & Profile Bar */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-white/60 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Left: Home Launcher Brand OR Back-to-Home-Screen Pill */}
          <div className="flex items-center gap-2">
            {!isHomeScreen ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-extrabold shadow-xs transition-all active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Home Screen</span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-[#74956C] to-[#5CA6CE] flex items-center justify-center shadow-sm text-white transition-transform group-hover:scale-105">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-extrabold tracking-tight text-sm sm:text-base text-[#1E293B] block leading-tight">
                    Family Hub
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 hidden sm:block">
                    {household.weather_location_name}
                  </span>
                </div>
              </Link>
            )}
          </div>

          {/* Right Side: 1-Tap Family Profile Switcher + iPad Kiosk Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/80 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="hidden md:inline text-[11px] font-bold text-slate-500 px-2">
                Profil:
              </span>
              {selectableMembers.map((member) => {
                const isSelected = member.id === activeMember.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setActiveMemberId(member.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#1E293B] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#1E293B] hover:bg-slate-100/80'
                    }`}
                    title={`Profil wechseln auf ${member.display_name}`}
                  >
                    <span
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-2xs"
                      style={{ backgroundColor: member.color_hex }}
                    >
                      {member.short_code}
                    </span>
                    <span className="hidden sm:inline">{member.display_name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsKioskMode(!isKioskMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
                isKioskMode
                  ? 'bg-[#5CA6CE] border-[#5CA6CE] text-white shadow-xs'
                  : 'bg-white/85 border-slate-200/80 text-slate-700 hover:bg-white'
              }`}
              title="Schaltet den grossen iPad-Wandanzeige-Modus ein oder aus"
            >
              <Tablet className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isKioskMode ? 'iPad Modus AN' : 'iPad Modus'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-32">
        {children}
      </main>

      {/* Floating Android Launcher Dock (Works on Pixel Phone, iPad & Desktop) */}
      <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 px-2.5 sm:px-6 pointer-events-none flex justify-center">
        <nav
          aria-label="Android App Dock"
          className="pointer-events-auto bg-white/85 backdrop-blur-2xl border border-white/90 shadow-xl rounded-[28px] px-2 sm:px-4 py-2 flex items-center justify-between gap-1 sm:gap-2.5 max-w-xl w-full"
        >
          {DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const badge = getBadgeCount(item.badgeKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex flex-col items-center justify-center flex-1 py-0.5 select-none"
              >
                <div
                  className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-[16px] flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-md scale-105`
                      : 'bg-slate-100/90 text-slate-600 group-hover:bg-white group-hover:shadow-xs group-hover:scale-105'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] tracking-tight truncate max-w-[54px] ${
                    isActive ? 'font-extrabold text-[#1E293B]' : 'font-semibold text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="mt-0.5 h-1 w-4 rounded-full bg-[#74956C]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
