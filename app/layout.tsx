import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

const body    = Inter({ subsets: ['latin'], variable: '--font-body' });
const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: { default: 'GrumpyWhales — Free invoicing with automatic payment tracking', template: '%s · GrumpyWhales' },
  description: 'Free invoicing software for UK freelancers and small businesses. Send invoices, automatically detect bank payments via Open Banking, and chase overdue clients without lifting a finger.',
  metadataBase: new URL('https://grumpywhales.com'),
  keywords: [
    'free invoicing software',
    'UK invoicing software',
    'invoice tracker',
    'open banking invoicing',
    'automatic payment tracking',
    'chase invoice software',
    'freelancer invoicing',
    'small business invoicing UK',
    'free invoice generator',
    'invoice reminder software',
  ],
  authors: [{ name: 'GrumpyWhales' }],
  alternates: { canonical: 'https://grumpywhales.com' },
  openGraph: {
    type: 'website',
    siteName: 'GrumpyWhales',
    title: 'GrumpyWhales — Free invoicing with automatic payment tracking',
    description: 'Send invoices, automatically detect bank payments, and chase overdue clients without lifting a finger. Free for UK freelancers and small businesses.',
    url: 'https://grumpywhales.com',
    locale: 'en_GB',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'GrumpyWhales — Free invoicing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrumpyWhales — Free invoicing with automatic payment tracking',
    description: 'Send invoices, get paid faster, never chase again. Free for UK freelancers and small businesses.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
