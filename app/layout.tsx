import type { Metadata } from 'next';
import { Manrope, Bungee } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const body    = Manrope({ subsets: ['latin'], variable: '--font-body' });
const display = Bungee({  subsets: ['latin'], variable: '--font-display', weight: '400' });

export const metadata: Metadata = {
  title: {
    default: 'GrumpyWhales — Free UK invoicing software with automatic payment tracking',
    template: '%s · GrumpyWhales',
  },
  description:
    'Free invoicing software for UK freelancers, sole traders, contractors and small limited companies. Create and send professional invoices, automatically detect payments via Open Banking, and chase overdue clients without lifting a finger. No card required, no upgrade prompts.',
  metadataBase: new URL('https://grumpywhales.com'),
  keywords: [
    // Core
    'free invoicing software UK',
    'free invoice generator UK',
    'invoicing software UK',
    'online invoicing UK',
    // Audience
    'invoicing software for freelancers UK',
    'invoicing software for sole traders',
    'invoicing software for contractors',
    'invoicing software for consultants',
    'invoicing software for small business',
    'invoicing software for limited company',
    'invoicing software for self employed',
    // Open Banking & payment tracking
    'open banking invoicing UK',
    'automatic payment tracking software',
    'open banking payment reconciliation',
    'auto-match bank payments to invoices',
    'detect invoice paid automatically',
    // Chase / reminders
    'automatic invoice chase email',
    'overdue invoice reminder software',
    'send polite payment reminder',
    'chase late paying clients UK',
    // VAT / compliance angle
    'VAT invoice software free UK',
    'simple invoice software for VAT',
    'MTD compatible invoicing software',
    // Use cases
    'send invoice from bank account',
    'how to invoice a client UK',
    'invoice with payment reference UK',
    'invoice tracker for freelancers',
    'free invoice with logo',
    // Cost angle
    'free alternative to FreshBooks',
    'free alternative to QuickBooks invoicing',
    'invoice software no monthly fee',
    'no subscription invoicing software',
  ],
  authors: [{ name: 'GrumpyWhales' }],
  creator: 'GrumpyWhales',
  publisher: 'GrumpyWhales',
  alternates: { canonical: 'https://grumpywhales.com' },
  category: 'Finance',
  applicationName: 'GrumpyWhales',
  openGraph: {
    type: 'website',
    siteName: 'GrumpyWhales',
    title: 'GrumpyWhales — Free UK invoicing software with automatic payment tracking',
    description:
      'Send invoices, automatically detect bank payments via Open Banking, and chase overdue clients without lifting a finger. Free for UK freelancers, sole traders and small limited companies.',
    url: 'https://grumpywhales.com',
    locale: 'en_GB',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'GrumpyWhales — Free UK invoicing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrumpyWhales — Free UK invoicing with automatic payment tracking',
    description: 'Send invoices, get paid faster via Open Banking, never chase again. Free for UK freelancers.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  other: {
    'geo.region':   'GB',
    'geo.country':  'United Kingdom',
    'theme-color':  '#00A859',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="en-GB" className={`${body.variable} ${display.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
