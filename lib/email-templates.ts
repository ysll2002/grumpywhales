import { formatMoney } from './events';

// ─── Attendee-list publish email ─────────────────────────────────────────────
// Sent to every non-cancelled attendee when the host clicks 'Publish' on the
// Attendees page. Tone + headline depends on the attendee's final status.
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
};

export function attendeeListPublishEmail(opts: PublishOpts) {
  const { attendeeName, status, event, hostName, eventUrl } = opts;
  const greet = attendeeName ? `Hi ${attendeeName.split(' ')[0]}` : 'Hi there';
  const startsLabel = new Date(event.starts_at).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
    ``,
    `Event page: ${eventUrl}`,
    ``,
    hostName ? `— ${hostName}` : '— GrumpyWhales',
  ].filter(Boolean).join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:${status === 'accepted' ? '#0A4D2E' : status === 'declined' ? '#7F1D1D' : '#7C5800'};">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 12px 0;">${escapeHtml(greet)},</p>
    <p style="margin:0 0 18px 0;">${escapeHtml(intro)}</p>
    ${detailRows ? `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:18px;background:#FAF7F0;border-radius:10px;overflow:hidden;">${detailRows}</table>` : ''}
    <p style="margin:0 0 18px 0;">
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
