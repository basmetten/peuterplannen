import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import { OfflineBanner } from '@/components/patterns/OfflineBanner';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { WebVitalsReporter } from '@/components/analytics/WebVitalsReporter';
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
        {/* Skip link — first focusable element for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Ga naar inhoud
        </a>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <WebVitalsReporter />
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
