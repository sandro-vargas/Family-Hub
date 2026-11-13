'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Lock,
  Moon,
  Sun,
  Clock,
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
  const isLoginPage = pathname === '/login';

  // Time-based Dark Mode (automatic 19:00 - 07:00, with 1-tap override)
  const [themeMode, setThemeMode] = useState<'auto' | 'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'auto';
    const saved = localStorage.getItem('family_hub_theme_mode');
    return saved === 'dark' || saved === 'light' || saved === 'auto' ? saved : 'auto';
  });
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockSentinelRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const isNightHour = currentHour >= 19 || currentHour < 7;
  const isDark = !isLoginPage && (themeMode === 'dark' || (themeMode === 'auto' && isNightHour));

  useEffect(() => {
    localStorage.setItem('family_hub_theme_mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', isDark);
  }, [isDark]);

  // Screen Wake Lock API: active in both Normal and Dark Mode when iPad Modus is enabled
  useEffect(() => {
    if (isLoginPage || !isKioskMode) {
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release?.().catch(() => null);
        wakeLockSentinelRef.current = null;
      }
      setWakeLockActive(false);
      return;
    }

    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as any;
        if (!nav?.wakeLock?.request) return;
        const sentinel = await nav.wakeLock.request('screen');
        if (cancelled) {
          sentinel.release?.().catch(() => null);
          return;
        }
        wakeLockSentinelRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener?.('release', () => {
          if (!cancelled) setWakeLockActive(false);
        });
      } catch {
        if (!cancelled) setWakeLockActive(false);
      }
    };

    void requestWakeLock();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isKioskMode && !cancelled) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release?.().catch(() => null);
        wakeLockSentinelRef.current = null;
      }
      setWakeLockActive(false);
    };
  }, [isKioskMode, isLoginPage]);

  const cycleThemeMode = () => {
    setThemeMode((prev) =>
      prev === 'auto' ? 'dark' : prev === 'dark' ? 'light' : 'auto'
    );
  };

  const handleLockApp = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  if (isLoginPage) {
    return <main>{children}</main>;
  }

  const getBadgeCount = (key?: 'shopping' | 'todos' | 'needs') => {
    if (key === 'shopping') return openShoppingCount;
    if (key === 'todos') return openTodosCount;
    if (key === 'needs') return openNeedsCount;
    return 0;
  };

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-x-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-[#070B14] via-[#0B1120] to-[#111C2D] text-[#F8FAFC]'
          : 'bg-gradient-to-br from-[#DCE8DF] via-[#EBF2EE] to-[#D6E7F2] text-[#1E293B]'
      }`}
    >
      {/* Subtle Ambient Android Wallpaper Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className={`absolute -top-28 -left-28 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-[#74956C]/10' : 'bg-[#74956C]/15'
          }`}
        />
        <div
          className={`absolute top-1/3 -right-28 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-[#5CA6CE]/10' : 'bg-[#5CA6CE]/15'
          }`}
        />
        <div
          className={`absolute -bottom-24 left-1/4 w-80 h-80 rounded-full blur-3xl ${
            isDark ? 'bg-indigo-500/10' : 'bg-amber-200/20'
          }`}
        />
      </div>

      {/* Android Launcher Top Status & Profile Bar */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b shadow-2xs transition-colors duration-300 ${
          isDark
            ? 'bg-[#0F172A]/85 border-slate-800'
            : 'bg-white/75 border-white/60'
        }`}
      >
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
                  <span
                    className={`font-extrabold tracking-tight text-sm sm:text-base block leading-tight ${
                      isDark ? 'text-slate-100' : 'text-[#1E293B]'
                    }`}
                  >
                    Family Hub
                  </span>
                  <span
                    className={`text-[11px] font-semibold hidden sm:block ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {household.weather_location_name}
                  </span>
                </div>
              </Link>
            )}
          </div>

          {/* Right Side: 1-Tap Family Profile Switcher + Theme + iPad Kiosk Mode Toggle */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center p-1 rounded-2xl border shadow-2xs ${
                isDark
                  ? 'bg-[#1E293B]/90 border-slate-700'
                  : 'bg-white/80 border-slate-200/80'
              }`}
            >
              <span
                className={`hidden md:inline text-[11px] font-bold px-2 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
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
                        ? isDark
                          ? 'bg-[#5CA6CE] text-white shadow-2xs'
                          : 'bg-[#1E293B] text-white shadow-2xs'
                        : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700/70'
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
              onClick={cycleThemeMode}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl text-xs font-bold border transition-all shadow-2xs ${
                isDark
                  ? 'bg-[#1E293B] border-slate-700 text-amber-300 hover:bg-slate-800'
                  : 'bg-white/85 border-slate-200/80 text-slate-700 hover:bg-white'
              }`}
              title="Darstellung wechseln: Auto (19:00–07:00 Dunkel) → Dunkel → Hell"
            >
              {themeMode === 'auto' ? (
                <Clock className="h-4 w-4" />
              ) : themeMode === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">
                {themeMode === 'auto'
                  ? 'Auto 19–07h'
                  : themeMode === 'dark'
                    ? 'Dunkel'
                    : 'Hell'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsKioskMode(!isKioskMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
                isKioskMode
                  ? 'bg-[#5CA6CE] border-[#5CA6CE] text-white shadow-xs'
                  : isDark
                    ? 'bg-[#1E293B] border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-white/85 border-slate-200/80 text-slate-700 hover:bg-white'
              }`}
              title="Schaltet den iPad-Modus inkl. Always-On Wake Lock (Bildschirm wach halten) ein oder aus"
            >
              <Tablet className="h-4 w-4" />
              {isKioskMode && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    wakeLockActive ? 'bg-emerald-300 animate-pulse' : 'bg-white/80'
                  }`}
                />
              )}
              <span className="hidden sm:inline">
                {isKioskMode ? 'iPad Modus • Wach' : 'iPad Modus'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLockApp}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl text-xs font-bold border transition-all shadow-2xs ${
                isDark
                  ? 'bg-[#1E293B] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white/85 border-slate-200/80 text-slate-500 hover:text-slate-800 hover:bg-white'
              }`}
              title="App sperren"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden lg:inline">Sperren</span>
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
          className={`pointer-events-auto backdrop-blur-2xl border shadow-xl rounded-[28px] px-2 sm:px-4 py-2 flex items-center justify-between gap-1 sm:gap-2.5 max-w-xl w-full transition-colors duration-300 ${
            isDark
              ? 'bg-[#0F172A]/90 border-slate-700/80'
              : 'bg-white/85 border-white/90'
          }`}
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
                      : isDark
                        ? 'bg-slate-800/90 text-slate-300 group-hover:bg-slate-700 group-hover:shadow-xs group-hover:scale-105'
                        : 'bg-slate-100/90 text-slate-600 group-hover:bg-white group-hover:shadow-xs group-hover:scale-105'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs ring-2 ${
                        isDark ? 'ring-[#0F172A]' : 'ring-white'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] tracking-tight truncate max-w-[54px] ${
                    isActive
                      ? isDark
                        ? 'font-extrabold text-slate-100'
                        : 'font-extrabold text-[#1E293B]'
                      : isDark
                        ? 'font-semibold text-slate-400'
                        : 'font-semibold text-slate-500'
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
