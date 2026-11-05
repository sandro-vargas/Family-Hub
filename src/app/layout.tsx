import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FamilyProvider } from '@/context/family-context';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'Family Hub | 8624 Grüt (ZH)',
  description:
    'Gemeinsame Familien-Applikation für Termine, Essensplanung (Thermomix & Gemini KI), Einkaufsliste und Haushaltsbedarf.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Family Hub',
  },
};

export const viewport: Viewport = {
  themeColor: '#74956C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de-CH" className="h-full antialiased font-sans" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F4F7F5] text-[#1E293B]" suppressHydrationWarning>
        <FamilyProvider>
          <AppShell>{children}</AppShell>
        </FamilyProvider>
      </body>
    </html>
  );
}
