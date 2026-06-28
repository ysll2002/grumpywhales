export type SignupStatus =
  | 'accepted'    // confirmed on the attendee list
  | 'pending'     // curated mode — waiting for admin
  | 'waitlisted'  // first_come past capacity (populated in P3)
  | 'declined'    // curated, admin rejected
  | 'cancelled';  // attendee withdrew or admin removed

export type PaymentStatus =
  | 'free'    // event has no fee
  | 'unpaid'  // paid event, awaiting Stripe (P2)
  | 'paid';   // payment confirmed

export type EventSignup = {
  id:             string;
  event_id:       string;
  profile_id:     string;
  status:         SignupStatus;
  payment_status: PaymentStatus;
  signed_up_at:   string;
  updated_at:     string;
};

export const SIGNUP_STATUS_LABELS: Record<SignupStatus, string> = {
  accepted:   "You're in",
  pending:    'Awaiting admin to publish final list',
  waitlisted: 'Waitlist',
  declined:   'Not selected',
  cancelled:  'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  free:   'Free',
  unpaid: 'Payment due',
  paid:   'Paid',
};

// Team colours the host can assign per attendee per session. Keys are the
// stored values; the label/swatch is for rendering.
export type TeamColour = 'belmont_silver' | 'black' | 'green' | 'white' | 'red' | 'pink';

export const TEAM_COLOURS: { value: TeamColour; label: string; swatch: string; fg: string }[] = [
  { value: 'belmont_silver', label: 'Belmont silver', swatch: '#C0C0C0', fg: '#1F2937' },
  { value: 'black',          label: 'Black',          swatch: '#111111', fg: '#FFFFFF' },
  { value: 'green',          label: 'Green',          swatch: '#00A859', fg: '#FFFFFF' },
  { value: 'white',          label: 'White',          swatch: '#FFFFFF', fg: '#1F2937' },
  { value: 'red',            label: 'Red',            swatch: '#DC2626', fg: '#FFFFFF' },
  { value: 'pink',           label: 'Pink',           swatch: '#F472B6', fg: '#7C2D5F' },
];

export const TEAM_COLOUR_KEYS: TeamColour[] = TEAM_COLOURS.map(c => c.value);
