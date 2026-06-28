import { formatMoney } from './events';
import { TEAM_COLOURS, type TeamColour } from './signups';

const TEAM_COLOUR_BY_KEY = new Map(TEAM_COLOURS.map(c => [c.value, c] as const));
function teamColourLabel(key: string | null): string {
  if (!key) return 'N/A';
  return TEAM_COLOUR_BY_KEY.get(key as TeamColour)?.label ?? 'N/A';
}
function teamColourSwatch(key: string | null): { swatch: string; fg: string } | null {
  if (!key) return null;
  const c = TEAM_COLOUR_BY_KEY.get(key as TeamColour);
  return c ? { swatch: c.swatch, fg: c.fg } : null;
}
function statusLabel(s: string): string {
  if (s === 'accepted')   return 'Accepted';
  if (s === 'waitlisted') return 'Waitlist';
  if (s === 'declined')   return 'Not selected';
  if (s === 'pending')    return 'Pending';
  return s;
}

// ─── Attendee-list publish email ─────────────────────────────────────────────
// Sent to every non-cancelled attendee when the host clicks 'Notify all
// players' on the Attendees page. Tone + headline depends on the attendee's
// final status; the body also contains the full roster (name, signed-up
// time, status, team colour) so everyone can see the team sheet.
export type RosterEntry = {
  name:         string | null;
  signed_up_at: string;
  status:       'accepted' | 'waitlisted' | 'declined' | 'pending';
  team_colour:  string | null;
};

type PublishOpts = {
  attendeeName: string | null;
  status:       'accepted' | 'waitlisted' | 'declined' | 'pending';
  event: {
    title:             string;
    starts_at:         string;
    location:          string | null;
    fee_amount:        number;
    fee_currency:      string;
    payment_reference: string | null;
  };
  hostName: string | null;
  eventUrl: string;
  roster:   RosterEntry[];
};

export function attendeeListPublishEmail(opts: PublishOpts) {
  const { attendeeName, status, event, hostName, eventUrl, roster } = opts;
  const greet = attendeeName ? `Hi ${attendeeName.split(' ')[0]}` : 'Hi there';
  const startsLabel = new Date(event.starts_at).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
  const feeLabel = event.fee_amount > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free';

  const headline =
    status === 'accepted'   ? `You're in for ${event.title}` :
    status === 'waitlisted' ? `You're on the waitlist for ${event.title}` :
                              `Update on ${event.title}`;

  const intro =
    status === 'accepted'
      ? "You're confirmed. Here are the details:"
      : status === 'waitlisted'
      ? "You're on the waitlist. We'll let you know if a spot opens up. Details below in case it does:"
      : "Thanks for signing up. Unfortunately you didn't make the final list this time.";

  const detailRows = status === 'declined' ? '' : `
    <tr><td style="padding:6px 12px;color:#6B6B6B;">When</td><td style="padding:6px 12px;">${escapeHtml(startsLabel)}</td></tr>
    ${event.location ? `<tr><td style="padding:6px 12px;color:#6B6B6B;">Where</td><td style="padding:6px 12px;">${escapeHtml(event.location)}</td></tr>` : ''}
    <tr><td style="padding:6px 12px;color:#6B6B6B;">Fee</td><td style="padding:6px 12px;">${escapeHtml(feeLabel)}</td></tr>
    ${event.payment_reference ? `<tr><td style="padding:6px 12px;color:#6B6B6B;">Reference</td><td style="padding:6px 12px;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(event.payment_reference)}</td></tr>` : ''}
  `;

  // Roster table — same for everyone, so any player can see the team sheet.
  const rosterRowsHtml = roster.map((r, i) => {
    const sw = teamColourSwatch(r.team_colour);
    const colourCell = sw
      ? `<span style="display:inline-block;background:${sw.swatch};color:${sw.fg};padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid #E5E2D8;">${escapeHtml(teamColourLabel(r.team_colour))}</span>`
      : `<span style="color:#6B6B6B;">N/A</span>`;
    const signedUp = new Date(r.signed_up_at).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
    });
    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAF7F0';
    return `<tr style="background:${rowBg};">
      <td style="padding:8px 12px;font-size:14px;">${escapeHtml(r.name ?? '—')}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6B6B6B;white-space:nowrap;">${escapeHtml(signedUp)}</td>
      <td style="padding:8px 12px;font-size:13px;">${escapeHtml(statusLabel(r.status))}</td>
      <td style="padding:8px 12px;">${colourCell}</td>
    </tr>`;
  }).join('');
  const rosterHtml = roster.length === 0 ? '' : `
    <h2 style="margin:24px 0 10px 0;font-size:15px;color:#0F1A14;text-transform:uppercase;letter-spacing:0.05em;">Team sheet</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #E5E2D8;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#0A4D2E;color:#FFFFFF;text-align:left;">
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Player</th>
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Signed up</th>
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Team</th>
      </tr></thead>
      <tbody>${rosterRowsHtml}</tbody>
    </table>`;

  const rosterText = roster.length === 0 ? '' : [
    ``,
    `Team sheet:`,
    ...roster.map(r => {
      const signedUp = new Date(r.signed_up_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
      });
      return `  • ${r.name ?? '—'}  ·  signed up ${signedUp}  ·  ${statusLabel(r.status)}  ·  ${teamColourLabel(r.team_colour)}`;
    }),
  ].join('\n');

  const subject = headline;
  const text = [
    `${greet},`,
    ``,
    intro,
    status !== 'declined' ? `Event:     ${event.title}` : '',
    status !== 'declined' ? `When:      ${startsLabel}` : '',
    status !== 'declined' && event.location ? `Where:     ${event.location}` : '',
    status !== 'declined' ? `Fee:       ${feeLabel}` : '',
    status !== 'declined' && event.payment_reference ? `Reference: ${event.payment_reference}` : '',
    rosterText,
    ``,
    `Event page: ${eventUrl}`,
    ``,
    hostName ? `— ${hostName}` : '— GrumpyWhales',
  ].filter(Boolean).join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:${status === 'accepted' ? '#0A4D2E' : status === 'declined' ? '#7F1D1D' : '#7C5800'};">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 12px 0;">${escapeHtml(greet)},</p>
    <p style="margin:0 0 18px 0;">${escapeHtml(intro)}</p>
    ${detailRows ? `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:18px;background:#FAF7F0;border-radius:10px;overflow:hidden;">${detailRows}</table>` : ''}
    ${rosterHtml}
    <p style="margin:18px 0;">
      <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:#00A859;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">View event page →</a>
    </p>
    <p style="margin:0;color:#6B6B6B;font-size:13px;">${hostName ? `— ${escapeHtml(hostName)}` : '— GrumpyWhales'}</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

// ─── Occurrence cancelled email ──────────────────────────────────────────────
// Sent to every non-cancelled attendee when the host cancels a specific
// session of a recurring event.
type OccurrenceCancelledOpts = {
  attendeeName: string | null;
  event: {
    title:             string;
    payment_reference: string | null;
  };
  occurrenceIso: string;
  paid:          boolean;
  hostName:      string | null;
  eventUrl:      string;
};

export function occurrenceCancelledEmail(opts: OccurrenceCancelledOpts) {
  const { attendeeName, event, occurrenceIso, paid, hostName, eventUrl } = opts;
  const greet = attendeeName ? `Hi ${attendeeName.split(' ')[0]}` : 'Hi there';
  const dateLabel = new Date(occurrenceIso).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const subject = `Cancelled: ${event.title} on ${new Date(occurrenceIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  const refundLine = paid ? "Your payment will be refunded — the host will arrange this with you directly." : '';

  const text = [
    `${greet},`,
    ``,
    `The ${event.title} session on ${dateLabel} has been cancelled by the host.`,
    refundLine,
    `Other sessions in the series are not affected.`,
    ``,
    `Event page: ${eventUrl}`,
    ``,
    hostName ? `— ${hostName}` : '— GrumpyWhales',
  ].filter(Boolean).join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#7F1D1D;">Session cancelled: ${escapeHtml(event.title)}</h1>
    <p style="margin:0 0 12px 0;">${escapeHtml(greet)},</p>
    <p style="margin:0 0 12px 0;">The session on <strong>${escapeHtml(dateLabel)}</strong> has been cancelled by the host.</p>
    ${paid ? `<p style="margin:0 0 12px 0;">Your payment will be refunded — the host will arrange this with you directly.</p>` : ''}
    <p style="margin:0 0 18px 0;color:#6B6B6B;">Other sessions in the series are not affected.</p>
    <p style="margin:0 0 18px 0;">
      <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:#00A859;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">View event page →</a>
    </p>
    <p style="margin:0;color:#6B6B6B;font-size:13px;">${hostName ? `— ${escapeHtml(hostName)}` : '— GrumpyWhales'}</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

// ─── Platform admin invite email ─────────────────────────────────────────────
// Sent to anyone added via the Settings → Platform admins form. Tells the
// invitee they've been granted admin rights and where to go next.
type AdminInviteOpts = {
  invitedEmail:  string;
  invitedByName: string | null;
  dashboardUrl:  string;
};

export function adminInviteEmail(opts: AdminInviteOpts) {
  const { invitedEmail, invitedByName, dashboardUrl } = opts;
  const byline = invitedByName ? `${invitedByName} has added you` : 'You have been added';

  const subject = `Welcome to GA Football Club`;

  const text = [
    `Hi,`,
    ``,
    `${byline} as an admin of GA Football Club.`,
    ``,
    `You can now create events, publish attendee lists, and invite other admins.`,
    `Sign in with ${invitedEmail} at:`,
    dashboardUrl,
    ``,
    `— GA Football Club`,
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#0A4D2E;">Welcome to GA Football Club</h1>
    <p style="margin:0 0 12px 0;">Hi,</p>
    <p style="margin:0 0 12px 0;">${escapeHtml(byline)} as an admin of GA Football Club.</p>
    <p style="margin:0 0 18px 0;">You can now create events, publish attendee lists, and invite other admins.</p>
    <p style="margin:0 0 18px 0;">Sign in with <strong>${escapeHtml(invitedEmail)}</strong>:</p>
    <p style="margin:0 0 18px 0;">
      <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#00A859;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">Open the dashboard →</a>
    </p>
    <p style="margin:0;color:#6B6B6B;font-size:13px;">— GA Football Club</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
