'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Share2, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useFamily } from '@/context/family-context';

function ShareTargetReceiver() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addHouseholdNeed, activeMember } = useFamily();

  const rawTitle = searchParams.get('title') || '';
  const rawText = searchParams.get('text') || '';
  const rawUrl = searchParams.get('url') || '';

  const [title, setTitle] = useState(rawTitle || 'Galaxus Produkt');
  const [productUrl, setProductUrl] = useState(rawUrl);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const combined = `${rawUrl} ${rawText} ${rawTitle}`;
    const match = combined.match(/https?:\/\/[^\s]+/i);
    const extractedUrl = match ? match[0] : '';

    if (!extractedUrl) {
      setTitle(rawTitle || rawText || 'Geteilter Artikel');
      setLoading(false);
      return;
    }

    setProductUrl(extractedUrl);

    fetch('/api/metadata/galaxus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: extractedUrl, fallbackTitle: rawTitle }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.title) setTitle(data.title);
        if (data.image_url) setImageUrl(data.image_url);
      })
      .catch(() => {
        // fallback already set
      })
      .finally(() => setLoading(false));
  }, [rawTitle, rawText, rawUrl]);

  const handleConfirmSave = () => {
    addHouseholdNeed({
      title,
      product_url: productUrl || null,
      image_url: imageUrl,
      merchant: 'galaxus.ch',
      notes: notes.trim() || null,
      priority: 'normal',
    });
    router.push('/needs');
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden mt-4">
      <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Share2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base">Aus Galaxus-App geteilt</h1>
          <p className="text-xs text-white/90">
            Wird gespeichert als {activeMember.display_name}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#5CA6CE]" />
            Lese Produktbild & Titel von Galaxus...
          </div>
        ) : (
          <>
            {imageUrl && (
              <div className="h-40 bg-[#F4F7F5] rounded-2xl flex items-center justify-center p-3 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Produktname
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-[#1E293B]"
              />
            </div>

            {productUrl && (
              <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                <ExternalLink className="h-3.5 w-3.5 text-[#5CA6CE] shrink-0" />
                <span className="truncate">{productUrl}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Optionale Notiz für die Familie
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Fürs Kinderzimmer / Badezimmer"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#1E293B]"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmSave}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-sm shadow-sm"
            >
              <Check className="h-4 w-4" />
              Auf Haushaltsbedarf-Liste speichern
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Lade Share-Target...</div>}>
      <ShareTargetReceiver />
    </Suspense>
  );
}
