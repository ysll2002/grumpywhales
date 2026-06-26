'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

type Props = {
  eventId:          string;
  occurrenceDate:   string;          // YYYY-MM-DD — the specific session
  occurrenceIso:    string;          // ISO timestamp for announcement-day calc
  feeLabel:         string;
  hasFee:           boolean;
  signedIn:         boolean;
  loginHref:        string;
  currentStatus:    SignupStatus | null;
  paymentStatus:    PaymentStatus | null;
  signupMode:       'first_come' | 'curated';
  isFull:           boolean;
  listPublished:    boolean;         // curated: has the host emailed the final list yet?
  signupOpensAtIso: string | null;   // null = sign-ups already open; ISO string = opens at this moment
};

// The final attendee list is announced the day before the session.
function announcementDateLabel(occurrenceIso: string): string | null {
  const start = new Date(occurrenceIso);
  const announce = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  if (announce.getTime() <= Date.now()) return null;
  return announce.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function SignupButton({
  eventId, occurrenceDate, occurrenceIso, feeLabel, hasFee, signedIn, loginHref,
  currentStatus, paymentStatus, signupMode, isFull, listPublished, signupOpensAtIso,
}: Props) {
  const router = useRouter();
  const [busy,    setBusy]    = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [error,   setError]   = useState('');

  async function payNow() {
    setPayBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'payment_failed');
      setPayBusy(false);
      return;
    }
    const { url } = await res.json() as { url: string };
    if (url) window.location.href = url;
    else { setPayBusy(false); setError('no_checkout_url'); }
  }

  if (!signedIn) {
    return (
      <a
        href={loginHref}
        className="inline-block px-5 py-2 rounded-full font-medium text-sm"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}
      >
        Sign in to join →
      </a>
    );
  }

  async function signUp() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'signup_failed');
      return;
    }
    router.refresh();
  }

  async function cancel() {
    if (!confirm('Cancel your sign-up for this session?')) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup?occurrence_date=${occurrenceDate}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'cancel_failed');
      return;
    }
    router.refresh();
  }

  const isActive = currentStatus && currentStatus !== 'cancelled' && currentStatus !== 'declined';
  const announceDay = announcementDateLabel(occurrenceIso);

  // Sign-ups not open yet (weekly events only). Users who already have a
  // signup keep seeing their status; new sign-ups are blocked until opensAt.
  if (!isActive && signupOpensAtIso) {
    const opensAt = new Date(signupOpensAtIso);
    const opensLabel = opensAt.toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
    return (
      <div className="flex flex-col gap-1 items-end">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          style={{ backgroundColor: '#FFF4B8', color: '#7C5800' }}>
          Sign-ups open {opensLabel}
        </span>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Status will change to “Open for sign-up” at that time.
        </p>
      </div>
    );
  }

  if (isActive) {
    // For curated events, suppress the final accepted/waitlisted/declined state
    // until the host actually publishes — until then everyone sees "to be published".
    const showProvisional = signupMode === 'curated' && !listPublished;
    const label = showProvisional
      ? "Signed up — final list to be published"
      : currentStatus === 'accepted'   ? "You're in"
      : currentStatus === 'pending'    ? "Signed up — final list to be published"
      : currentStatus === 'waitlisted' ? "You're on the waitlist"
      : currentStatus;

    return (
      <div className="flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
            ✓ {label}
          </span>
          {paymentStatus === 'paid' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
              ✓ Paid {feeLabel}
            </span>
          )}
        </div>
        {signupMode === 'curated' && !listPublished && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Final list announced {announceDay ? `on ${announceDay}` : 'before the session'}.
          </p>
        )}
        {currentStatus === 'waitlisted' && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>You&apos;ll be promoted if someone drops out.</p>
        )}
        {paymentStatus === 'unpaid' && hasFee && (
          <button
            onClick={payNow}
            disabled={payBusy}
            className="px-5 py-2 rounded-full font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: payBusy ? 'wait' : 'pointer' }}
          >
            {payBusy ? 'Redirecting…' : `Pay ${feeLabel}`}
          </button>
        )}
        <button
          onClick={cancel}
          disabled={busy}
          className="text-xs disabled:opacity-50"
          style={{ color: 'var(--color-red)', background: 'none', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Cancelling…' : 'Cancel my sign-up'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
      </div>
    );
  }

  if (isFull && signupMode === 'first_come') {
    return (
      <div className="flex flex-col gap-2 items-start">
        <button
          onClick={signUp}
          disabled={busy}
          className="px-5 py-2 rounded-full font-medium text-sm disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-yellow)', color: 'var(--color-dark)', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Joining…' : 'Join waitlist'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        onClick={signUp}
        disabled={busy}
        className="px-5 py-2 rounded-full font-medium text-sm disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Signing up…' : signupMode === 'curated' ? 'Request to attend' : 'Sign me up'}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
