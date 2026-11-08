'use client';

import React, { useMemo, useState } from 'react';
import {
  PackagePlus,
  ExternalLink,
  Check,
  Trash2,
  Sparkles,
  Link2,
  Pencil,
  X,
  ArrowDownWideNarrow,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { HouseholdNeed, NeedPriority } from '@/types/family';

const PRIORITY_META: Record<
  NeedPriority,
  { label: string; rank: number; badgeClass: string }
> = {
  high: {
    label: '🔥 Hoch / Dringend',
    rank: 3,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  normal: {
    label: '⚡ Normal',
    rank: 2,
    badgeClass: 'bg-[#5CA6CE]/15 text-[#2d7ba4] border-[#5CA6CE]/30',
  },
  low: {
    label: '🌱 Niedrig / Später',
    rank: 1,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export default function HouseholdNeedsPage() {
  const {
    householdNeeds,
    addHouseholdNeed,
    updateHouseholdNeed,
    toggleHouseholdNeedPurchased,
    deleteHouseholdNeed,
  } = useFamily();

  const [urlOrTitleInput, setUrlOrTitleInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<NeedPriority>('normal');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // Edit State
  const [editingNeedId, setEditingNeedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPriority, setEditPriority] = useState<NeedPriority>('normal');

  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlOrTitleInput.trim();
    if (!raw) return;

    const hasUrl = /https?:\/\/[^\s]+/i.test(raw);

    if (hasUrl) {
      setIsLoadingMeta(true);
      try {
        const res = await fetch('/api/metadata/galaxus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
        });
        const meta = await res.json();
        addHouseholdNeed({
          title: meta.title || raw,
          product_url: meta.product_url || raw,
          image_url: meta.image_url || null,
          merchant: meta.merchant || 'galaxus.ch',
          notes: notesInput.trim() || null,
          priority: priorityInput,
        });
      } catch {
        addHouseholdNeed({
          title: raw,
          product_url: raw,
          merchant: 'galaxus.ch',
          notes: notesInput.trim() || null,
          priority: priorityInput,
        });
      } finally {
        setIsLoadingMeta(false);
      }
    } else {
      addHouseholdNeed({
        title: raw,
        notes: notesInput.trim() || null,
        priority: priorityInput,
      });
    }

    setUrlOrTitleInput('');
    setNotesInput('');
    setPriorityInput('normal');
  };

  const handleStartEdit = (need: HouseholdNeed) => {
    setEditingNeedId(need.id);
    setEditTitle(need.title);
    setEditNotes(need.notes || '');
    setEditPriority(need.priority);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    updateHouseholdNeed(id, {
      title: editTitle.trim(),
      notes: editNotes.trim() || null,
      priority: editPriority,
    });
    setEditingNeedId(null);
  };

  // Sorted descending by priority (high -> normal -> low)
  const openNeeds = useMemo(() => {
    return householdNeeds
      .filter((n) => !n.is_purchased)
      .sort((a, b) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank);
  }, [householdNeeds]);

  const purchasedNeeds = useMemo(
    () => householdNeeds.filter((n) => n.is_purchased),
    [householdNeeds]
  );

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <PackagePlus className="h-5 w-5 text-[#74956C]" />
          <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
            Bedarf & Haushaltsartikel ({openNeeds.length})
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <ArrowDownWideNarrow className="h-3.5 w-3.5 text-[#74956C]" />
          Listenansicht • Sortiert nach Priorität absteigend
        </span>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAddNeed}
        className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/90"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-5 relative flex items-center">
            <Link2 className="h-4 w-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={urlOrTitleInput}
              onChange={(e) => setUrlOrTitleInput(e.target.value)}
              placeholder="Artikelname oder Shop-Link (z.B. Glühbirne E27, Galaxus-Link)..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Notiz (z.B. für Bad oben)"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={priorityInput}
              onChange={(e) => setPriorityInput(e.target.value as NeedPriority)}
              className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm text-[#1E293B] bg-white font-bold"
            >
              <option value="high">🔥 Hoch</option>
              <option value="normal">⚡ Normal</option>
              <option value="low">🌱 Niedrig</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isLoadingMeta}
              className="w-full h-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-xs sm:text-sm px-3.5 py-2 shadow-xs transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {isLoadingMeta ? 'Lädt...' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      </form>

      {/* Clean List View (Listenansicht, sortiert nach Priorität absteigend) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {openNeeds.length === 0 ? (
          <div className="p-8 text-center text-xs sm:text-sm text-slate-500 font-semibold">
            Aktuell keine offenen Bedarfsartikel vorhanden.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openNeeds.map((need) => {
              const prio = PRIORITY_META[need.priority] || PRIORITY_META.normal;
              const isEditing = editingNeedId === need.id;

              if (isEditing) {
                return (
                  <li key={need.id} className="p-4 bg-[#F4F7F5] space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Titel"
                        className="sm:col-span-5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-[#1E293B]"
                      />
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notiz"
                        className="sm:col-span-4 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-[#1E293B]"
                      />
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as NeedPriority)}
                        className="sm:col-span-3 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1E293B]"
                      >
                        <option value="high">🔥 Hoch / Dringend</option>
                        <option value="normal">⚡ Normal</option>
                        <option value="low">🌱 Niedrig / Später</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNeedId(null)}
                        className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(need.id)}
                        className="px-3 py-1 rounded-lg bg-[#74956C] text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Speichern
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={need.id}
                  className="px-4 py-3 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleHouseholdNeedPurchased(need.id)}
                      className="mt-0.5 h-5 w-5 rounded-lg border-2 border-[#74956C] bg-white hover:bg-[#74956C]/15 flex items-center justify-center shrink-0"
                      title="Als besorgt markieren"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prio.badgeClass}`}
                        >
                          {prio.label}
                        </span>
                        {need.merchant && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#74956C]/15 text-[#4d6847]">
                            {need.merchant}
                          </span>
                        )}
                        <CreatorBadge memberId={need.created_by_member_id} showName={false} />
                      </div>

                      <p className="font-extrabold text-sm text-[#1E293B]">{need.title}</p>
                      {need.notes && (
                        <p className="text-xs text-slate-600">{need.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {need.product_url && (
                      <a
                        href={need.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#5CA6CE]/15 text-[#2d7ba4] hover:bg-[#5CA6CE] hover:text-white text-xs font-bold transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Link
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(need)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#5CA6CE] hover:bg-sky-50"
                      title="Bearbeiten (Titel, Notiz, Priorität)"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHouseholdNeedPurchased(need.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#74956C] text-white text-xs font-bold hover:bg-[#618059]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Besorgt
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteHouseholdNeed(need.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Purchased Items Archive */}
      {purchasedNeeds.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Bereits bestellt / besorgt ({purchasedNeeds.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {purchasedNeeds.map((n) => (
              <div
                key={n.id}
                onClick={() => toggleHouseholdNeedPurchased(n.id)}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 text-xs text-slate-500 cursor-pointer"
              >
                <span className="line-through truncate font-medium">{n.title}</span>
                <CreatorBadge memberId={n.created_by_member_id} showName={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
