import { formatMoney } from './events';

const CLUB_SIGNATURE = 'Gunnersbury Athletics FC';

// ─── Attendee-list publish email ─────────────────────────────────────────────
// Sent to every non-cancelled attendee when the host clicks 'Notify all
// players' on the Attendees page. Same clean layout as the single-attendee
// accepted email, with the headline + intro adapted per final status.
type PublishOpts = {
  attendeeName: string | null;
  status:       'accepted' | 'declined' | 'waiting_list';
  event: {
    title:        string;
    starts_at:    string;
    location:     string | null;
    fee_amount:   number;
    fee_currency: string;
  };
  eventUrl: string;
};

export function attendeeListPublishEmail(opts: PublishOpts) {
  const { attendeeName, status, event, eventUrl } = opts;
  const greet = attendeeName ? `Hi ${attendeeName.split(' ')[0]}` : 'Hi there';
  const startsLabel = new Date(event.starts_at).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
  const feeLabel = event.fee_amount > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free';

  const headline =
    status === 'accepted' ? `You're in for ${event.title}`
                          : `Update on ${event.title}`;

  const intro =
    status === 'accepted'
      ? "You're confirmed for this session."
      : status === 'waiting_list'
      ? "You're on the waiting list — we'll let you know once the final line-up is confirmed."
      : "Thanks for signing up. Unfortunately you didn't make the final list this time.";

  // Declined recipients don't need the details table — they're not playing.
  const detailRows = status === 'declined' ? '' : `
    <tr><td style="padding:6px 12px;color:#6B6B6B;">When</td><td style="padding:6px 12px;">${escapeHtml(startsLabel)}</td></tr>
    ${event.location ? `<tr><td style="padding:6px 12px;color:#6B6B6B;">Where</td><td style="padding:6px 12px;">${escapeHtml(event.location)}</td></tr>` : ''}
    <tr><td style="padding:6px 12px;color:#6B6B6B;">Fee</td><td style="padding:6px 12px;">${escapeHtml(feeLabel)}</td></tr>
  `;

  const headlineColour =
    status === 'accepted' ? '#0A4D2E' :
    status === 'declined' ? '#7F1D1D' :
                            '#7C5800';

  const subject = headline;
  const text = [
    `${greet},`,
    ``,
    intro,
    status !== 'declined' ? `Event: ${event.title}` : '',
    status !== 'declined' ? `When:  ${startsLabel}`  : '',
    status !== 'declined' && event.location ? `Where: ${event.location}` : '',
    status !== 'declined' ? `Fee:   ${feeLabel}`     : '',
    ``,
    `Event page: ${eventUrl}`,
    ``,
    `— ${CLUB_SIGNATURE}`,
  ].filter(Boolean).join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:${headlineColour};">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 12px 0;">${escapeHtml(greet)},</p>
    <p style="margin:0 0 18px 0;">${escapeHtml(intro)}</p>
    ${detailRows ? `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:18px;background:#FAF7F0;border-radius:10px;overflow:hidden;">${detailRows}</table>` : ''}
    <p style="margin:0 0 18px 0;">
      <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:#00A859;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">View event page →</a>
    </p>
    <p style="margin:0;color:#6B6B6B;font-size:13px;">— ${escapeHtml(CLUB_SIGNATURE)}</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

// ─── Single-attendee 'you're accepted' email ─────────────────────────────────
// Fired the moment an admin flips an attendee's status to 'accepted' (via
// PATCH on the signup row). Includes a Pay button when there's an unpaid fee.
type AttendeeAcceptedOpts = {
  attendeeName: string | null;
  event: {
    title:        string;
    location:     string | null;
    fee_amount:   number;
    fee_currency: string;
  };
  occurrenceIso: string;
  paymentStatus: 'free' | 'unpaid' | 'paid';
  eventUrl:      string;
};

export function attendeeAcceptedEmail(opts: AttendeeAcceptedOpts) {
  const { attendeeName, event, occurrenceIso, paymentStatus, eventUrl } = opts;
  const greet = attendeeName ? `Hi ${attendeeName.split(' ')[0]}` : 'Hi there';
  const startsLabel = new Date(occurrenceIso).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
  const feeLabel  = event.fee_amount > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free';
  const needsPay  = paymentStatus === 'unpaid' && event.fee_amount > 0;

  const subject = `You're in for ${event.title} — ${new Date(occurrenceIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })}`;

  const detailLines = [
    `Event: ${event.title}`,
    `When:  ${startsLabel}`,
    event.location ? `Where: ${event.location}` : '',
    `Fee:   ${feeLabel}`,
  ].filter(Boolean).join('\n');

  const text = [
    `${greet},`,
    ``,
    `You're confirmed for this session.`,
    ``,
    detailLines,
    ``,
    needsPay
      ? `Please pay your ${feeLabel} session fee to secure your spot: ${eventUrl}`
      : `Event page: ${eventUrl}`,
    ``,
    `— ${CLUB_SIGNATURE}`,
  ].filter(Boolean).join('\n');

  const detailRows = `
    <tr><td style="padding:6px 12px;color:#6B6B6B;">When</td><td style="padding:6px 12px;">${escapeHtml(startsLabel)}</td></tr>
    ${event.location ? `<tr><td style="padding:6px 12px;color:#6B6B6B;">Where</td><td style="padding:6px 12px;">${escapeHtml(event.location)}</td></tr>` : ''}
    <tr><td style="padding:6px 12px;color:#6B6B6B;">Fee</td><td style="padding:6px 12px;">${escapeHtml(feeLabel)}</td></tr>
  `;

  const ctaLabel = needsPay ? `Pay ${feeLabel} now →` : `View event page →`;

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#0A4D2E;">You're in for ${escapeHtml(event.title)}</h1>
    <p style="margin:0 0 12px 0;">${escapeHtml(greet)},</p>
    <p style="margin:0 0 18px 0;">You're confirmed for this session.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:18px;background:#FAF7F0;border-radius:10px;overflow:hidden;">${detailRows}</table>
    ${needsPay ? `<p style="margin:0 0 12px 0;">Please pay your <strong>${escapeHtml(feeLabel)}</strong> session fee to secure your spot.</p>` : ''}
    <p style="margin:0 0 18px 0;">
      <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:${needsPay ? '#2563EB' : '#00A859'};color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
    </p>
    <p style="margin:0;color:#6B6B6B;font-size:13px;">— ${escapeHtml(CLUB_SIGNATURE)}</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

// ─── Single-attendee 'moved back to waiting list' email ─────────────────────
// Fired when an admin flips a previously-accepted attendee back to
// waiting_list — they were "in" and now they're not, so we owe them a
// heads-up.
type AttendeeMovedToWaitingListOpts = {
  attendeeName: string | null;
  event: {
    title:        string;
    location:     string | null;
    fee_amount:   number;
    fee_currency: string;
  };
  occurrenceIso: string;
  eventUrl:      string;
};

export function attendeeMovedToWaitingListEmail(opts: AttendeeMovedToWaitingListOpts) {
  const { attendeeName, event, occurrenceIso, eventUrl } = opts;
  const greet = attendeeName ? `Hi ${attendeeName.split(' ')[0]}` : 'Hi there';
  const startsLabel = new Date(occurrenceIso).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
  const feeLabel = event.fee_amount > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free';

  const subject = `Update on ${event.title} — moved to the waiting list`;

  const detailLines = [
    `Event: ${event.title}`,
    `When:  ${startsLabel}`,
    event.location ? `Where: ${event.location}` : '',
    `Fee:   ${feeLabel}`,
  ].filter(Boolean).join('\n');

  const text = [
    `${greet},`,
    ``,
    `Your spot has been moved back to the waiting list. We'll let you know if a spot opens up again.`,
    ``,
    detailLines,
    ``,
    `Event page: ${eventUrl}`,
    ``,
    `— ${CLUB_SIGNATURE}`,
  ].filter(Boolean).join('\n');

  const detailRows = `
    <tr><td style="padding:6px 12px;color:#6B6B6B;">When</td><td style="padding:6px 12px;">${escapeHtml(startsLabel)}</td></tr>
    ${event.location ? `<tr><td style="padding:6px 12px;color:#6B6B6B;">Where</td><td style="padding:6px 12px;">${escapeHtml(event.location)}</td></tr>` : ''}
    <tr><td style="padding:6px 12px;color:#6B6B6B;">Fee</td><td style="padding:6px 12px;">${escapeHtml(feeLabel)}</td></tr>
  `;

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#FAF7F0;padding:24px;color:#0F1A14;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2D8;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#7C5800;">Moved to the waiting list — ${escapeHtml(event.title)}</h1>
    <p style="margin:0 0 12px 0;">${escapeHtml(greet)},</p>
    <p style="margin:0 0 18px 0;">Your spot has been moved back to the waiting list. We'll let you know if a spot opens up again.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:18px;background:#FAF7F0;border-radius:10px;overflow:hidden;">${detailRows}</table>
    <p style="margin:0 0 18px 0;">
      <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:#00A859;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">View event page →</a>
    </p>
    <p style="margin:0;color:#6B6B6B;font-size:13px;">— ${escapeHtml(CLUB_SIGNATURE)}</p>
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
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });

  const subject = `Cancelled: ${event.title} on ${new Date(occurrenceIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })}`;
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
