// Render both variants of the 'you're accepted' email to /tmp so the
// author can eyeball them in a browser before turning on the real send.
// Run: npx tsx scripts/preview-accepted-email.ts

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { attendeeAcceptedEmail } from '../lib/email-templates';

const occurrenceIso = new Date('2026-08-14T19:00:00Z').toISOString();
const sharedEvent   = { title: 'GA football Friday', location: 'Kings House sports ground, London, W4 2SP' };

const variants = [
  {
    name: 'unpaid',
    opts: {
      attendeeName:  'Lin Li',
      event:         { ...sharedEvent, fee_amount: 10, fee_currency: 'GBP' },
      occurrenceIso,
      paymentStatus: 'unpaid' as const,
      eventUrl:      'https://grumpywhales.com/dashboard/events',
    },
  },
  {
    name: 'free',
    opts: {
      attendeeName:  'Lin Li',
      event:         { ...sharedEvent, fee_amount: 0, fee_currency: 'GBP' },
      occurrenceIso,
      paymentStatus: 'free' as const,
      eventUrl:      'https://grumpywhales.com/dashboard/events',
    },
  },
];

const paths: string[] = [];
for (const v of variants) {
  const { subject, html, text } = attendeeAcceptedEmail(v.opts);
  const path = join(tmpdir(), `accepted-email-${v.name}.html`);
  writeFileSync(path, html);
  paths.push(path);
  console.log(`\n[${v.name}]`);
  console.log(`  subject: ${subject}`);
  console.log(`  html:    ${path}`);
  console.log(`  text:\n${text.split('\n').map(l => '    ' + l).join('\n')}`);
}

console.log(`\nOpening both in the default browser…`);
execSync(`open ${paths.map(p => `"${p}"`).join(' ')}`);
