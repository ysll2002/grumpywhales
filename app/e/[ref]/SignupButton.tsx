'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

type Props = {
  eventId:        string;
  eventStartsAt:  string;            // ISO timestamp
  feeLabel:       string;            // e.g. "£10"
  hasFee:         boolean;
  signedIn:       boolean;
  loginHref:      string;
  currentStatus:  SignupStatus | null;
  paymentStatus:  PaymentStatus | null;
  signupMode:     'first_come' | 'curated';
  isFull:         boolean;
};

// The final attendee list is announced the day before the event. Returns e.g. "Thursday 25 June".
function announcementDateLabel(eventIso: string): string | null {
  const start = new Date(eventIso);
  const announce = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  if (announce.getTime() <= Date.now()) return null;  // event is in <24h, no future date to announce
  return announce.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function SignupButton({
  eventId, eventStartsAt, feeLabel, hasFee, signedIn, loginHref, currentStatus, paymentStatus, signupMode, isFull,
}: Props) {
  const router = useRouter();
  const [busy,    setBusy]    = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [error,   setError]   = useState('');

  async function payNow() {
    setPayBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/checkout`, { method: 'POST' });
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
        className="inline-block px-7 py-3 rounded-full font-medium text-base"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}
      >
        Sign in to join →
      </a>
    );
  }

  async function signUp() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'signup_failed');
      return;
    }
    router.refresh();
  }

  async function cancel() {
    if (!confirm('Cancel your sign-up for this event?')) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'cancel_failed');
      return;
    }
    router.refresh();
  }

  const isActive = currentStatus && currentStatus !== 'cancelled' && currentStatus !== 'declined';
  const announceDay = announcementDateLabel(eventStartsAt);

  if (isActive) {
    const label =
      currentStatus === 'accepted'   ? "You're in" :
      currentStatus === 'pending'    ? "Signed up — awaiting the final list" :
      currentStatus === 'waitlisted' ? "You're on the waitlist" :
      currentStatus;

    return (
      <div className="flex flex-col gap-3 items-start">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
          ✓ {label}
        </div>
        {currentStatus === 'pending' && signupMode === 'curated' && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            The final list will be announced {announceDay ? `on ${announceDay}` : 'before the event starts'}.
            You&apos;ll get an email and a notification here once the host publishes it.
          </p>
        )}
        {currentStatus === 'waitlisted' && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            You&apos;ll be moved up automatically if someone drops out.
          </p>
        )}
        {paymentStatus === 'unpaid' && hasFee && (
          <div className="flex flex-col gap-2 items-start">
            <button
              onClick={payNow}
              disabled={payBusy}
              className="px-6 py-2.5 rounded-full font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: payBusy ? 'wait' : 'pointer' }}
            >
              {payBusy ? 'Redirecting to checkout…' : `Pay ${feeLabel} now`}
            </button>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Secure card payment via Stripe.</p>
          </div>
        )}
        {paymentStatus === 'paid' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
            ✓ Paid {feeLabel}
          </div>
        )}
        <button
          onClick={cancel}
          disabled={busy}
          className="text-sm disabled:opacity-50"
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
      <div className="flex flex-col gap-3 items-start">
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          This event is full. Join the waitlist — you&apos;ll be moved up if someone drops out.
        </p>
        <button
          onClick={signUp}
          disabled={busy}
          className="px-7 py-3 rounded-full font-medium text-base disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-yellow)', color: 'var(--color-dark)', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Joining…' : 'Join the waitlist'}
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
        className="px-7 py-3 rounded-full font-medium text-base disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Signing up…' : signupMode === 'curated' ? 'Request to attend' : 'Sign me up'}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
