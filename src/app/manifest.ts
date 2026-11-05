import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Family Hub',
    short_name: 'Family Hub',
    description:
      'Gemeinsame Familien-Applikation für Termine, Essensplanung (inkl. Thermomix & Gemini KI), Einkaufsliste und Galaxus Haushaltsbedarf.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F8F6',
    theme_color: '#74956C',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    // Android Web Share Target für Galaxus-App "Teilen" -> Familien-App
    share_target: {
      action: '/share-target',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
  };
}

