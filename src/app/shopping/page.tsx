'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  ArrowUpDown,
  BellRing,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Pencil,
  X,
  Sparkles,
} from 'lucide-react';
import { useFamily, detectStoreCategorySlug } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { VoiceInputButton } from '@/components/voice-input-button';
import { ShoppingItem } from '@/types/family';

export default function ShoppingPage() {
  const {
    categories,
    reorderCategories,
    shoppingItems,
    addOrMergeShoppingItems,
    updateShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCheckedShoppingItems,
    activeMember,
  } = useFamily();

  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnit, setItemUnit] = useState('Stk');
  const [selectedCat, setSelectedCat] = useState('auto');
  const [showSortModal, setShowSortModal] = useState(false);
  const [pushNotifiedMessage, setPushNotifiedMessage] = useState<string | null>(null);

  // Inline Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('Stk');
  const [editCat, setEditCat] = useState('other');

  const detectedSlug = itemName.trim() ? detectStoreCategorySlug(itemName) : 'other';
  const detectedCategoryName =
    categories.find((c) => c.slug === detectedSlug)?.name || 'Sonstiges';

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const qtyNum = itemQty ? Number(itemQty.replace(',', '.')) : null;
    const targetCategory =
      selectedCat === 'auto' ? detectStoreCategorySlug(itemName.trim()) : selectedCat;

    addOrMergeShoppingItems([
      {
        name: itemName.trim(),
        quantity: qtyNum,
        unit: qtyNum ? itemUnit : null,
        store_category_slug: targetCategory,
      },
    ]);

    const catLabel = categories.find((c) => c.slug === targetCategory)?.name || 'Sonstiges';
    setPushNotifiedMessage(
      `Hinzugefügt: „${itemName.trim()}“ → ${catLabel} (${activeMember.display_name})`
    );
    setTimeout(() => setPushNotifiedMessage(null), 3500);

    setItemName('');
    setItemQty('');
    setSelectedCat('auto');
  };

  const startEditing = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditQty(item.quantity !== null ? String(item.quantity) : '');
    setEditUnit(item.unit || 'Stk');
    setEditCat(item.store_category_slug || 'other');
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    const qtyNum = editQty.trim() !== '' ? Number(editQty.replace(',', '.')) : null;
    updateShoppingItem(id, {
      name: editName.trim(),
      quantity: qtyNum,
      unit: qtyNum !== null ? editUnit : null,
      store_category_slug: editCat,
    });
    setEditingItemId(null);
  };

  const handleVoiceInput = (transcript: string) => {
    setItemName(transcript);
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const newOrder = [...categories];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    reorderCategories(newOrder.map((c) => c.id));
  };

  const uncheckedItems = shoppingItems.filter((i) => !i.is_checked);
  const checkedItems = shoppingItems.filter((i) => i.is_checked);

  return (
    <div className="space-y-4">
      {/* Compact Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="h-5 w-5 text-[#74956C]" />
          <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
            Einkaufsliste
          </h1>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#74956C]/15 text-[#74956C]">
            Auto-Kategorie & Mengen-Addition
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSortModal(!showSortModal)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5CA6CE] text-white hover:bg-[#488eb5] transition-colors shadow-xs"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Laden-Reihenfolge</span>
          </button>
          {checkedItems.length > 0 && (
            <button
              type="button"
              onClick={clearCheckedShoppingItems}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Erledigte ({checkedItems.length}) löschen</span>
            </button>
          )}
        </div>
      </div>

      {/* Push Notification Toast */}
      {pushNotifiedMessage && (
        <div className="flex items-center justify-between gap-3 bg-[#5CA6CE] text-white px-4 py-2.5 rounded-xl shadow-sm text-xs font-semibold">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-white shrink-0" />
            <span>{pushNotifiedMessage}</span>
          </div>
        </div>
      )}

      {/* Store Category Order Customization Panel */}
      {showSortModal && (
        <div className="bg-white p-4 rounded-2xl shadow-md border-2 border-[#5CA6CE] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-[#1E293B]">
                Laden-Durchlauf Reihenfolge (Migros / Coop)
              </h2>
              <p className="text-xs text-slate-600">
                Sortiere die Abteilungen so, wie ihr durch euren Supermarkt lauft:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSortModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#74956C] text-white"
            >
              Fertig
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F4F7F5] border border-slate-200 text-xs font-medium"
              >
                <span className="font-bold text-[#1E293B]">
                  {idx + 1}. {cat.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveCategory(idx, -1)}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-700"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === categories.length - 1}
                    onClick={() => moveCategory(idx, 1)}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Form with Automatic Category Assignment */}
      <form
        onSubmit={handleAddItem}
        className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/90 space-y-2.5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-5 flex items-center gap-2">
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Artikel eingeben (z.B. Rüebli, Vollrahm, Windeln...)"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
            <VoiceInputButton onTranscript={handleVoiceInput} />
          </div>

          <div className="sm:col-span-2 flex gap-1.5">
            <input
              type="number"
              step="any"
              value={itemQty}
              onChange={(e) => setItemQty(e.target.value)}
              placeholder="Menge"
              className="w-1/2 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
            <select
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              className="w-1/2 rounded-xl border border-slate-300 px-2 py-2 text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            >
              <option value="Stk">Stk</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="Pack">Pack</option>
              <option value="Bund">Bund</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            >
              <option value="auto">
                ✨ Auto ({itemName.trim() ? detectedCategoryName : 'Sonstiges'})
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-sm px-3.5 py-2 shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Hinzufügen
            </button>
          </div>
        </div>

        {selectedCat === 'auto' && itemName.trim() && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4d6847] px-1">
            <Sparkles className="h-3.5 w-3.5 text-[#74956C]" />
            <span>
              Automatisch zugeordnet zu: <strong>{detectedCategoryName}</strong>
            </span>
          </div>
        )}
      </form>

      {/* Grouped Shopping Items by Store Category */}
      {uncheckedItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
          <CheckCircle2 className="h-10 w-10 text-[#74956C] mx-auto mb-2" />
          <h3 className="font-bold text-base text-[#1E293B]">Alles eingekauft!</h3>
          <p className="text-xs text-slate-600 mt-1">
            Füge oben neue Produkte hinzu oder plane ein Essen mit der Rezept-KI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {categories.map((cat) => {
            const catItems = uncheckedItems.filter(
              (item) => item.store_category_slug === cat.slug
            );
            if (catItems.length === 0) return null;

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden"
              >
                <div className="bg-[#74956C]/12 border-b border-[#74956C]/20 px-4 py-2 flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-[#3b5236]">
                    {cat.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#74956C] text-white">
                    {catItems.length}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {catItems.map((item) => {
                    const isEditing = editingItemId === item.id;

                    if (isEditing) {
                      return (
                        <li
                          key={item.id}
                          className="p-3 bg-[#F4F7F5] space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-12 gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="col-span-6 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1E293B]"
                              placeholder="Artikelname"
                            />
                            <input
                              type="number"
                              step="any"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="col-span-3 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-[#1E293B]"
                              placeholder="Menge"
                            />
                            <select
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="col-span-3 rounded-lg border border-slate-300 bg-white px-1.5 py-1.5 text-xs font-bold text-[#1E293B]"
                            >
                              <option value="Stk">Stk</option>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="Pack">Pack</option>
                              <option value="Bund">Bund</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={editCat}
                              onChange={(e) => setEditCat(e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.slug}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1"
                              >
                                <X className="h-3.5 w-3.5" /> Abbrechen
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Speichern
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={item.id}
                        onClick={() => toggleShoppingItem(item.id)}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#74956C]/5 cursor-pointer transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="h-5 w-5 rounded-lg border-2 border-[#74956C] bg-white flex items-center justify-center shrink-0 hover:bg-[#74956C]/20 transition-colors" />
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[#1E293B] truncate">
                              {item.name}
                            </p>
                            {item.quantity !== null && (
                              <p className="text-xs font-bold text-[#5CA6CE]">
                                {item.quantity} {item.unit || ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CreatorBadge memberId={item.created_by_member_id} showName={false} />
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#5CA6CE] hover:bg-sky-50"
                            title="Menge, Name oder Kategorie bearbeiten"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteShoppingItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Eintrag entfernen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Checked / Purchased Items Section */}
      {checkedItems.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
            Bereits im Einkaufswagen ({checkedItems.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {checkedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleShoppingItem(item.id)}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="h-5 w-5 rounded-md bg-[#74956C] text-white flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="line-through truncate font-medium">
                    {item.quantity ? `${item.quantity} ${item.unit || ''} ` : ''}
                    {item.name}
                  </span>
                </div>
                <CreatorBadge memberId={item.created_by_member_id} showName={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
