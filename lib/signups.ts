export type SignupStatus =
  | 'accepted'    // confirmed on the roster
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
  accepted:   'On the roster',
  pending:    'Awaiting host',
  waitlisted: 'Waitlist',
  declined:   'Not selected',
  cancelled:  'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  free:   'Free',
  unpaid: 'Payment due',
  paid:   'Paid',
};
