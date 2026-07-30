// Renders every attendee email variant so you can eyeball them locally.
// Run: `npx tsx scripts/preview-publish-email.ts`.

import fs from 'node:fs';
import path from 'node:path';
import {
  attendeeListPublishEmail,
  attendeeAcceptedEmail,
  attendeeMovedToWaitingListEmail,
} from '../lib/email-templates';

const event = {
  title:        'GA Football Friday',
  starts_at:    '2026-07-31T19:00:00Z',
  location:     'Kings House sports ground, Chiswick',
  fee_amount:   12,
  fee_currency: 'GBP',
};
const eventUrl      = 'https://grumpywhales.com/dashboard/events';
const occurrenceIso = '2026-07-31T19:00:00Z';

const outDir = path.join(process.cwd(), 'tmp-email-preview');
fs.mkdirSync(outDir, { recursive: true });

const renders: { file: string; label: string; subject: string; text: string; html: string }[] = [];

function record(file: string, label: string, r: { subject: string; text: string; html: string }) {
  fs.writeFileSync(path.join(outDir, file), r.html);
  fs.writeFileSync(path.join(outDir, file.replace('.html', '.txt')), `Subject: ${r.subject}\n\n${r.text}`);
  renders.push({ file, label, ...r });
  console.log(`wrote ${file}`);
}

// Notify-all-players (bulk publish) — one per status.
for (const [status, name] of [
  ['accepted',     'Chia Wei Lim'],
  ['waiting_list', 'Ruogu'],
  ['declined',     'Jamie'],
] as const) {
  record(
    `notify-all-${status}.html`,
    `Notify all players — ${status} (${name})`,
    attendeeListPublishEmail({ attendeeName: name, status, event, eventUrl }),
  );
}

// Individual accepted email — the one fired when an admin flips a row to accepted.
record(
  'accepted-unpaid.html',
  'Individual accepted — unpaid (Pay CTA)',
  attendeeAcceptedEmail({ attendeeName: 'Chia Wei Lim', event, occurrenceIso, paymentStatus: 'unpaid', eventUrl }),
);
record(
  'accepted-paid.html',
  'Individual accepted — already paid',
  attendeeAcceptedEmail({ attendeeName: 'Chia Wei Lim', event, occurrenceIso, paymentStatus: 'paid',   eventUrl }),
);

// Moved-back-to-waiting-list — the one fired when accepted → waiting_list.
record(
  'moved-to-waiting.html',
  'Moved to waiting list',
  attendeeMovedToWaitingListEmail({ attendeeName: 'Chia Wei Lim', event, occurrenceIso, eventUrl }),
);

const index = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;padding:24px;">
  <h1>Attendee emails — preview</h1>
  <ul>
    ${renders.map(r => `<li><a href="./${r.file}">${r.label}</a></li>`).join('')}
  </ul>
</body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), index);

console.log(`\nOpen: ${path.join(outDir, 'index.html')}`);
