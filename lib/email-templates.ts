import { formatMoney, formatDate, type LineItem } from './money';

type InvoiceForEmail = {
  invoice_number: string;
  amount:         number;
  currency:       string;
  vat_amount:     number;
  reference:      string | null;
  issue_date:     string;
  due_date:       string;
  description:    string | null;
  line_items:     LineItem[] | null;
};

type IssuerForEmail = {
  name?:           string | null;
  company_name?:   string | null;
  business_address?: string | null;
};

type ClientForEmail = {
  name: string;
  company_name?: string | null;
};

// ─── New invoice email ───────────────────────────────────────────────────────
export function invoiceEmail(opts: {
  invoice: InvoiceForEmail;
  issuer:  IssuerForEmail;
  client:  ClientForEmail;
}) {
  const { invoice, issuer, client } = opts;
  const issuerName = issuer.company_name ?? issuer.name ?? 'GrumpyWhales user';

  const subject = `Invoice ${invoice.invoice_number} from ${issuerName}`;
  const text = [
    `Hi ${client.name},`,
    ``,
    `Please find your invoice ${invoice.invoice_number} attached below.`,
    ``,
    `Amount due:  ${formatMoney(invoice.amount, invoice.currency)}`,
    `Due date:    ${formatDate(invoice.due_date)}`,
    invoice.reference ? `Reference:   ${invoice.reference}` : '',
    ``,
    `Please pay by bank transfer using the reference above so we can ${
      issuer.company_name ? 'reconcile' : 'match'
    } your payment automatically.`,
    ``,
    `Thanks,`,
    issuerName,
  ].filter(Boolean).join('\n');

  const items = invoice.line_items ?? [];
  const itemRows = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${escapeHtml(it.description)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">${it.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">${formatMoney(it.unit_price, invoice.currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">${formatMoney(it.quantity * it.unit_price, invoice.currency)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F9FAFB;margin:0;padding:24px;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#FFF;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
    <div style="padding:24px 28px;border-bottom:1px solid #E5E7EB;">
      <p style="margin:0;color:#6B7280;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Invoice ${escapeHtml(invoice.invoice_number)}</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111827;">${escapeHtml(issuerName)}</h1>
    </div>

    <div style="padding:24px 28px;">
      <p style="margin:0 0 12px;">Hi ${escapeHtml(client.name)},</p>
      <p style="margin:0 0 16px;color:#374151;">${escapeHtml(invoice.description ?? `Please find your invoice from ${issuerName} below.`)}</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <thead><tr>
          <th style="text-align:left;padding:6px 12px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;">Description</th>
          <th style="text-align:right;padding:6px 12px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;">Qty</th>
          <th style="text-align:right;padding:6px 12px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;">Unit</th>
          <th style="text-align:right;padding:6px 12px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;">Total</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>

      <table style="width:100%;font-size:14px;margin-top:8px;">
        ${invoice.vat_amount > 0 ? `
        <tr><td style="padding:4px 12px;color:#6B7280;">VAT</td>
            <td style="padding:4px 12px;text-align:right;">${formatMoney(invoice.vat_amount, invoice.currency)}</td></tr>` : ''}
        <tr><td style="padding:8px 12px;font-weight:600;border-top:1px solid #E5E7EB;">Total due</td>
            <td style="padding:8px 12px;text-align:right;font-weight:600;border-top:1px solid #E5E7EB;">${formatMoney(invoice.amount, invoice.currency)}</td></tr>
      </table>

      <div style="margin-top:24px;padding:16px;background:#F3F4F6;border-radius:8px;font-size:14px;">
        <p style="margin:0 0 6px;"><strong>Pay by:</strong> ${formatDate(invoice.due_date)}</p>
        ${invoice.reference ? `<p style="margin:0;"><strong>Bank reference:</strong> <code style="background:#E5E7EB;padding:1px 6px;border-radius:4px;">${escapeHtml(invoice.reference)}</code></p>` : ''}
      </div>

      <p style="margin:20px 0 0;color:#6B7280;font-size:13px;">Please pay by bank transfer using the reference above so we can match your payment automatically.</p>
    </div>

    <div style="padding:16px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;">
      Sent with GrumpyWhales · invoicing without nagging
    </div>
  </div>
</body></html>`;

  return { subject, text, html };
}

// ─── Chase email (overdue) ───────────────────────────────────────────────────
export function chaseEmail(opts: {
  invoice:    InvoiceForEmail;
  issuer:     IssuerForEmail;
  client:     ClientForEmail;
  chaseLevel: 1 | 2 | 3;  // 1=polite, 2=firmer, 3=final
  daysOverdue: number;
}) {
  const { invoice, issuer, client, chaseLevel, daysOverdue } = opts;
  const issuerName = issuer.company_name ?? issuer.name ?? 'GrumpyWhales user';

  const tone = chaseLevel === 1
    ? { greet: 'Hi', body: `Just a friendly reminder — invoice ${invoice.invoice_number} for ${formatMoney(invoice.amount, invoice.currency)} was due on ${formatDate(invoice.due_date)} (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} ago). Could you let me know when payment is on its way?`, close: `Thanks`, label: 'Reminder' }
    : chaseLevel === 2
    ? { greet: 'Hi', body: `Following up on invoice ${invoice.invoice_number} for ${formatMoney(invoice.amount, invoice.currency)}, which has been overdue for ${daysOverdue} days. Please could you confirm a date for payment?`, close: `Thanks`, label: 'Overdue' }
    : { greet: 'Hi', body: `Invoice ${invoice.invoice_number} for ${formatMoney(invoice.amount, invoice.currency)} is now ${daysOverdue} days overdue. This is the final reminder before further steps are considered.`, close: `Regards`, label: 'Final notice' };

  const subject = `${tone.label}: invoice ${invoice.invoice_number} (${formatMoney(invoice.amount, invoice.currency)})`;

  const text = [
    `${tone.greet} ${client.name},`,
    ``,
    tone.body,
    ``,
    invoice.reference ? `Bank reference: ${invoice.reference}` : '',
    ``,
    `${tone.close},`,
    issuerName,
  ].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F9FAFB;margin:0;padding:24px;color:#111827;">
  <div style="max-width:540px;margin:0 auto;background:#FFF;border:1px solid #E5E7EB;border-radius:12px;padding:28px;">
    <p style="margin:0 0 4px;color:${chaseLevel === 3 ? '#B91C1C' : '#D97706'};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">${tone.label}</p>
    <h2 style="margin:0 0 16px;font-size:18px;">Invoice ${escapeHtml(invoice.invoice_number)}</h2>

    <p style="margin:0 0 12px;">${tone.greet} ${escapeHtml(client.name)},</p>
    <p style="margin:0 0 16px;color:#374151;">${escapeHtml(tone.body)}</p>

    ${invoice.reference ? `<p style="margin:0 0 8px;font-size:14px;">Bank reference: <code style="background:#F3F4F6;padding:1px 6px;border-radius:4px;">${escapeHtml(invoice.reference)}</code></p>` : ''}

    <p style="margin:24px 0 0;">${tone.close},<br>${escapeHtml(issuerName)}</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

// ─── Thank-you email (on payment) ────────────────────────────────────────────
export function thankYouEmail(opts: {
  invoice: InvoiceForEmail;
  issuer:  IssuerForEmail;
  client:  ClientForEmail;
}) {
  const { invoice, issuer, client } = opts;
  const issuerName = issuer.company_name ?? issuer.name ?? 'GrumpyWhales user';

  const subject = `Payment received — invoice ${invoice.invoice_number}`;
  const text = [
    `Hi ${client.name},`,
    ``,
    `Just confirming we've received your payment of ${formatMoney(invoice.amount, invoice.currency)} for invoice ${invoice.invoice_number}. Thanks for sorting it out so promptly.`,
    ``,
    `Looking forward to working together again.`,
    ``,
    `Best,`,
    issuerName,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F9FAFB;margin:0;padding:24px;color:#111827;">
  <div style="max-width:540px;margin:0 auto;background:#FFF;border:1px solid #E5E7EB;border-radius:12px;padding:28px;">
    <p style="margin:0 0 4px;color:#15803D;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Payment received</p>
    <h2 style="margin:0 0 16px;font-size:18px;">Invoice ${escapeHtml(invoice.invoice_number)} · paid</h2>

    <p style="margin:0 0 12px;">Hi ${escapeHtml(client.name)},</p>
    <p style="margin:0 0 16px;color:#374151;">Just confirming we&apos;ve received your payment of <strong>${formatMoney(invoice.amount, invoice.currency)}</strong> for invoice ${escapeHtml(invoice.invoice_number)}. Thanks for sorting it out so promptly.</p>
    <p style="margin:0 0 24px;color:#374151;">Looking forward to working together again.</p>

    <p style="margin:0;">Best,<br>${escapeHtml(issuerName)}</p>
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
