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

export type EventStatus = 'published' | 'closed' | 'cancelled';
export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type EventSignupMode = 'first_come' | 'curated';

export const RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  none:    'One-off',
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
};

export const SIGNUP_MODE_LABELS: Record<EventSignupMode, string> = {
  first_come: 'First-come, first-served',
  curated:    'Host picks the list',
};

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
  recurrence:         EventRecurrence;
  signup_mode:        EventSignupMode;
  capacity:           number | null;
  lat:                    number | null;
  lng:                    number | null;
  payment_reference:          string | null;
  attendees_published_at:     string | null;
  cancelled_dates:            string[];   // DATE[] in DB, "YYYY-MM-DD" strings here
  published_occurrence_dates: string[];   // dates whose final list has been emailed
  signup_open_dow:            number | null;   // 0=Sun..6=Sat (weekly events only)
  signup_open_time:           string | null;   // 'HH:MM' or 'HH:MM:SS' UTC (weekly only)
  created_at:                 string;
  updated_at:                 string;
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

// Returns the next `count` occurrence ISO timestamps (UTC) for an event,
// starting from `from` (default: now). For one-off events the list is
// either [starts_at] (if it's still upcoming) or []. Recurring events use
// the event's start time of day for every occurrence.
export function computeNextOccurrences(
  event: Pick<Event, 'starts_at' | 'recurrence'>,
  count: number,
  from: Date = new Date(),
): string[] {
  const start = new Date(event.starts_at);
  if (event.recurrence === 'none') {
    return start.getTime() >= from.getTime() ? [start.toISOString()] : [];
  }
  const out: string[] = [];
  const cursor = new Date(start);
  // Cap iterations so a far-past starts_at with a daily cadence can't loop
  // forever. 5y of daily ≈ 1825 — comfortable upper bound.
  for (let i = 0; i < 2000 && out.length < count; i++) {
    if (cursor.getTime() >= from.getTime()) out.push(cursor.toISOString());
    switch (event.recurrence) {
      case 'daily':   cursor.setUTCDate(cursor.getUTCDate() + 1); break;
      case 'weekly':  cursor.setUTCDate(cursor.getUTCDate() + 7); break;
      case 'monthly': cursor.setUTCMonth(cursor.getUTCMonth() + 1); break;
    }
  }
  return out;
}

// Date component (YYYY-MM-DD) of an ISO timestamp, treating it as UTC so the
// 'occurrence_date' value lines up with what the DB column stores.
export function occurrenceDate(iso: string): string {
  return iso.slice(0, 10);
}

export const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DOW_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// For a weekly event with a (dow, time) sign-up window, find the moment at
// which sign-ups for the given occurrence open. Walk back day-by-day from the
// occurrence with the time-of-day fixed, until we land on the right weekday
// strictly before the occurrence (max 7 iterations).
export function signupOpensAt(occurrenceIso: string, dow: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const occ = new Date(occurrenceIso).getTime();
  const open = new Date(occurrenceIso);
  open.setUTCHours(h, m, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (open.getUTCDay() === dow && open.getTime() < occ) return open;
    open.setUTCDate(open.getUTCDate() - 1);
  }
  return open;
}

// Returns whether a given occurrence is currently accepting sign-ups. Only
// weekly events with both signup_open_dow + signup_open_time set are gated;
// everything else is always open.
export function signupOpenInfo(
  event: Pick<Event, 'recurrence' | 'signup_open_dow' | 'signup_open_time'>,
  occurrenceIso: string,
  now: Date = new Date(),
): { open: true } | { open: false; opensAt: Date } {
  if (event.recurrence !== 'weekly') return { open: true };
  if (event.signup_open_dow == null || !event.signup_open_time) return { open: true };
  const opensAt = signupOpensAt(occurrenceIso, event.signup_open_dow, event.signup_open_time);
  return now.getTime() >= opensAt.getTime() ? { open: true } : { open: false, opensAt };
}
