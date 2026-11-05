'use client';

import React, { useState } from 'react';
import {
  PackagePlus,
  ExternalLink,
  Check,
  Trash2,
  Share2,
  Sparkles,
  Link2,
  ShoppingBag,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { NeedPriority } from '@/types/family';

export default function HouseholdNeedsPage() {
  const {
    householdNeeds,
    addHouseholdNeed,
    toggleHouseholdNeedPurchased,
    deleteHouseholdNeed,
  } = useFamily();

  const [urlOrTitleInput, setUrlOrTitleInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<NeedPriority>('normal');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

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

  const openNeeds = householdNeeds.filter((n) => !n.is_purchased);
  const purchasedNeeds = householdNeeds.filter((n) => n.is_purchased);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5CA6CE]/15 text-[#2d7ba4]">
              HAUSHALT, FAMILIE & ONLINE-BESTELLUNGEN
            </span>
            <span className="text-xs font-medium text-slate-500">
              Freitext oder Link einfügen (z.B. Galaxus, Microspot, etc.)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1E293B] mt-1 flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-[#74956C]" />
            Bedarf & Haushaltsartikel
          </h1>
        </div>

        <div className="bg-[#F4F7F5] px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
          <Share2 className="h-4 w-4 text-[#5CA6CE] shrink-0" />
          <span>
            <strong>Smartphone Tipp:</strong> In Online-Shops (wie Galaxus) auf <em>Teilen → Family Hub</em> tippen!
          </span>
        </div>
      </div>

      {/* Add Form (Galaxus URL or Free Text) */}
      <form
        onSubmit={handleAddNeed}
        className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <div className="flex items-center">
              <Link2 className="h-4 w-4 text-slate-400 absolute left-3.5" />
              <input
                type="text"
                value={urlOrTitleInput}
                onChange={(e) => setUrlOrTitleInput(e.target.value)}
                placeholder="Artikelname oder Shop-Link (z.B. Glühbirne E27, Galaxus-Link, Spielzeug)..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Notiz (z.B. für Bad oben)"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
          </div>

          <div className="md:col-span-1">
            <select
              value={priorityInput}
              onChange={(e) => setPriorityInput(e.target.value as NeedPriority)}
              className="w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm text-[#1E293B] bg-white font-semibold"
            >
              <option value="normal">Normal</option>
              <option value="high">Dringend</option>
              <option value="low">Später</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isLoadingMeta}
              className="w-full h-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-xs px-4 py-2.5 shadow-xs transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {isLoadingMeta ? 'Lese Galaxus...' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      </form>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {openNeeds.map((need) => (
          <div
            key={need.id}
            className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col justify-between"
          >
            <div>
              {need.image_url ? (
                <div className="h-40 bg-[#F4F7F5] relative overflow-hidden border-b border-slate-100 flex items-center justify-center p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={need.image_url}
                    alt={need.title}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                  {need.priority === 'high' && (
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#5CA6CE] text-white shadow-2xs">
                      Dringend
                    </span>
                  )}
                  {need.merchant && (
                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#74956C] text-white">
                      {need.merchant}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-24 bg-[#F4F7F5] border-b border-slate-100 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <ShoppingBag className="h-6 w-6 text-[#74956C]" />
                    <span className="text-xs font-bold uppercase">
                      {need.merchant || 'Haushaltsartikel'}
                    </span>
                  </div>
                  {need.priority === 'high' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#5CA6CE] text-white">
                      Dringend
                    </span>
                  )}
                </div>
              )}

              <div className="p-4 space-y-2">
                <h3 className="font-bold text-sm text-[#1E293B] leading-snug">{need.title}</h3>
                {need.notes && <p className="text-xs text-slate-600">{need.notes}</p>}
              </div>
            </div>

            <div className="px-4 py-3 bg-[#F4F7F5] border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreatorBadge memberId={need.created_by_member_id} />
                {need.product_url && (
                  <a
                    href={need.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Galaxus
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1.5">
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
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
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
