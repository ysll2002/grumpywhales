// Event reference generator + shared types.
// Format: GW-EVT-XXXXXX (6 chars from a 32-char alphabet, ~1 billion combos).
// Used as the payment reference attendees will quote when paying for the event.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTUVWXY'; // base32-ish, no I/L/O/Z to avoid OCR confusion

export function generateEventReference(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `GW-EVT-${suffix}`;
}

export type EventStatus = 'draft' | 'published' | 'closed' | 'cancelled';

export type Event = {
  id:                 string;
  admin_id:           string;
  title:              string;
  description:        string | null;
  starts_at:          string;          // ISO timestamp
  ends_at:            string | null;
  location:           string | null;
  fee_amount:         number;
  fee_currency:       string;
  status:             EventStatus;
  payment_reference:  string | null;
  created_at:         string;
  updated_at:         string;
};

export function formatMoney(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
