import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import { OfflineBanner } from '@/components/patterns/OfflineBanner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: {
    default: 'PeuterPlannen — Ontdek de leukste uitjes met peuters',
    template: '%s | PeuterPlannen',
  },
  description: 'Ontdek de leukste uitjes met peuters in heel Nederland. Speeltuinen, kinderboerderijen, musea en meer.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://peuterplannen.nl'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PeuterPlannen',
  },
  icons: {
    apple: '/icons/apple-touch-icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFAF7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh bg-bg-primary text-label font-sans antialiased">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
