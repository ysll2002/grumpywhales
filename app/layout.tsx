import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

const body    = Inter({ subsets: ['latin'], variable: '--font-body' });
const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: { default: 'GrumpyWhales — Get paid faster', template: '%s · GrumpyWhales' },
  description: 'Send invoices, track payments automatically, and chase overdue clients without lifting a finger.',
  metadataBase: new URL('https://grumpywhales.com'),
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
