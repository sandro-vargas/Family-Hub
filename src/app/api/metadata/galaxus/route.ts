import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

function extractGalaxusTitleFromUrlSlug(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const productSegment = segments[segments.length - 1] || '';
    // Remove trailing numeric product ID (e.g., -12345678)
    const withoutId = productSegment.replace(/-\d{5,}$/, '');
    if (!withoutId) return 'Galaxus Produkt';
    return withoutId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return 'Galaxus Produkt';
  }
}

export async function POST(request: Request) {
  try {
    const { url, fallbackTitle } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Keine gültige URL übergeben' }, { status: 400 });
    }

    // Extract first https URL in case Android Share passed text + URL combined
    const urlMatch = url.match(/https?:\/\/[^\s]+/i);
    const cleanUrl = urlMatch ? urlMatch[0] : url.trim();

    let hostname = 'galaxus.ch';
    try {
      hostname = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch {
      // keep default
    }

    const slugFallbackTitle = fallbackTitle?.trim() || extractGalaxusTitleFromUrlSlug(cleanUrl);

    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
          'Accept-Language': 'de-CH,de;q=0.9,en;q=0.8',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return NextResponse.json({
          title: slugFallbackTitle,
          image_url: null,
          product_url: cleanUrl,
          merchant: hostname,
          source: 'url-slug-fallback',
        });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 1. Try JSON-LD Product schema first
      let jsonLdTitle = '';
      let jsonLdImage = '';

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const rawJson = $(el).contents().text();
          const data = JSON.parse(rawJson);
          const items = Array.isArray(data) ? data : [data];

          for (const item of items) {
            if (item['@type'] === 'Product' || item.name) {
              if (!jsonLdTitle && item.name) {
                jsonLdTitle = item.brand?.name
                  ? `${item.brand.name} ${item.name}`
                  : item.name;
              }
              if (!jsonLdImage && item.image) {
                jsonLdImage = Array.isArray(item.image) ? item.image[0] : item.image;
              }
            }
          }
        } catch {
          // ignore malformed JSON-LD block
        }
      });

      // 2. Fallback to OpenGraph tags
      const ogTitle =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text();

      const ogImage =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        null;

      const finalTitle = (jsonLdTitle || ogTitle || slugFallbackTitle)
        .replace(/\s*\|\s*Galaxus.*$/i, '')
        .replace(/\s*-\s*galaxus\.ch.*$/i, '')
        .trim();

      return NextResponse.json({
        title: finalTitle || slugFallbackTitle,
        image_url: jsonLdImage || ogImage || null,
        product_url: cleanUrl,
        merchant: hostname,
        source: jsonLdTitle ? 'json-ld' : 'opengraph',
      });
    } catch {
      // Network / Cloudflare block fallback
      return NextResponse.json({
        title: slugFallbackTitle,
        image_url: null,
        product_url: cleanUrl,
        merchant: hostname,
        source: 'offline-slug-fallback',
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Metadaten konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

