'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

export type AttendeeRow = {
  signup_id:         string;
  profile_id:        string;
  name:              string | null;
  email:             string | null;
  status:            SignupStatus;
  payment_status:    PaymentStatus;
  signed_up_at:      string;
  sort_order:        number | null;
  attended_today:    boolean | null;   // null = not yet recorded for this event's date
  past_3mo_attended: number;
  past_3mo_total:    number;
  lifetime_attended: number;
  lifetime_total:    number;
};

type Props = {
  eventId:          string;
  occurrenceDate:   string;       // YYYY-MM-DD
  eventStarted:     boolean;
  capacity:         number | null;
  publishedAt:      string | null;
  cancelled:        boolean;
  isRecurring:      boolean;
  currentProfileId: string;
  signupMode:       'first_come' | 'curated';
  initial:          AttendeeRow[];
};

const STATUS_OPTIONS: { value: SignupStatus; label: string }[] = [
  { value: 'accepted',   label: 'Accepted'   },
  { value: 'pending',    label: 'Pending'    },
  { value: 'waitlisted', label: 'Waitlist'   },
  { value: 'declined',   label: 'Declined'   },
  { value: 'cancelled',  label: 'Cancelled'  },
];

const STATUS_TONE: Record<SignupStatus, { bg: string; fg: string }> = {
  accepted:   { bg: '#D1FAE5', fg: 'var(--color-accent-dk)' },
  pending:    { bg: '#FFF4B8', fg: '#7C5800' },
  waitlisted: { bg: '#FFF4B8', fg: '#7C5800' },
  declined:   { bg: '#FEE2E2', fg: 'var(--color-red)' },
  cancelled:  { bg: '#E5E7EB', fg: '#6B7280' },
};

const PAY_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  free:   { bg: '#E5E7EB', fg: '#374151' },
  unpaid: { bg: '#FEE2E2', fg: 'var(--color-red)' },
  paid:   { bg: '#D1FAE5', fg: 'var(--color-accent-dk)' },
};

export default function AttendeesTable({
  eventId, occurrenceDate, eventStarted, capacity, publishedAt, cancelled, isRecurring,
  currentProfileId, signupMode, initial,
}: Props) {
  const router = useRouter();
  const [rows,        setRows]        = useState<AttendeeRow[]>(initial);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');
  const [publishing,  setPublishing]  = useState(false);
  const [publishMsg,  setPublishMsg]  = useState('');
  const [lastPub,     setLastPub]     = useState<string | null>(publishedAt);
  const [cancelBusy,  setCancelBusy]  = useState(false);
  const [isCancelled, setIsCancelled] = useState(cancelled);

  async function cancelOccurrence() {
    const paidCount = rows.filter(r => r.payment_status === 'paid').length;
    const refundNote = paidCount
      ? `\n\nHeads-up: ${paidCount} attendee${paidCount === 1 ? '' : 's'} already paid. They'll be emailed about the cancellation, but you'll need to issue refunds manually in your Stripe dashboard.`
      : '';
    const ok = confirm(`Cancel this session only? Other sessions in the series are unaffected. ${rows.length} attendee${rows.length === 1 ? '' : 's'} will be emailed.${refundNote}`);
    if (!ok) return;

    setCancelBusy(true); setError('');
    const res = await fetch(`/api/events/${eventId}/cancel-occurrence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    setCancelBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'cancel_failed');
      return;
    }
    setIsCancelled(true);
    router.refresh();
  }

  async function uncancelOccurrence() {
    if (!confirm('Bring this session back? Existing sign-ups will need to be re-confirmed by you.')) return;
    setCancelBusy(true); setError('');
    const res = await fetch(`/api/events/${eventId}/cancel-occurrence`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    setCancelBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'uncancel_failed');
      return;
    }
    setIsCancelled(false);
    router.refresh();
  }

  const acceptedCount = useMemo(() => rows.filter(r => r.status === 'accepted').length, [rows]);
  const pendingCount  = useMemo(() => rows.filter(r => r.status === 'pending').length, [rows]);
  const adminOnList   = useMemo(() => rows.some(r => r.profile_id === currentProfileId), [rows, currentProfileId]);

  const [joinBusy, setJoinBusy] = useState(false);
  async function joinSelf() {
    setJoinBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    setJoinBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'join_failed');
      return;
    }
    router.refresh();
  }

  async function publish() {
    const breakdown = [
      `${acceptedCount} accepted`,
      `${rows.filter(r => r.status === 'waitlisted').length} waitlisted`,
      `${rows.filter(r => r.status === 'declined').length} declined`,
      pendingCount ? `${pendingCount} still pending (will also be emailed)` : '',
    ].filter(Boolean).join(', ');
    const ok = confirm(
      `Send a notification email to every non-cancelled attendee?\n\n${breakdown}\n\nThey'll see their final status and the event details.`
    );
    if (!ok) return;

    setPublishing(true);
    setPublishMsg('');
    const res = await fetch(`/api/events/${eventId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    setPublishing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setPublishMsg(`Publish failed: ${j.detail ?? j.error ?? 'unknown'}`);
      return;
    }
    const j = await res.json() as { sent: number; skipped: number; failed: number };
    setLastPub(new Date().toISOString());
    setPublishMsg(`Sent ${j.sent} email${j.sent === 1 ? '' : 's'}${j.failed ? ` · ${j.failed} failed` : ''}${j.skipped ? ` · ${j.skipped} skipped (no email)` : ''}.`);
  }

  async function changeStatus(signupId: string, status: SignupStatus) {
    setRows(rs => rs.map(r => r.signup_id === signupId ? { ...r, status } : r));
    setError('');
    const res = await fetch(`/api/events/${eventId}/signups/${signupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'update_failed');
    }
  }

  async function swap(idx: number, direction: -1 | 1) {
    const other = idx + direction;
    if (other < 0 || other >= rows.length) return;
    const next = rows.slice();
    [next[idx], next[other]] = [next[other], next[idx]];
    setRows(next);
    setBusy(true);
    setError('');
    const order = next.map(r => r.signup_id);
    const res = await fetch(`/api/events/${eventId}/attendees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'reorder_failed');
    }
  }

  async function toggleAttendedToday(profileId: string, current: boolean | null) {
    const nextValue: boolean | null = current === null ? true : current === true ? false : null;
    setRows(rs => rs.map(r => r.profile_id === profileId ? { ...r, attended_today: nextValue } : r));
    setError('');
    await fetch(`/api/events/${eventId}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occurrence_date: occurrenceDate,
        marks: [{ profile_id: profileId, attended: nextValue }],
      }),
    });
  }

  return (
    <>
      {isCancelled && (
        <div className="rounded-2xl px-5 py-3 mb-6 flex items-center justify-between flex-wrap gap-3"
          style={{ backgroundColor: '#FEE2E2', border: '1px solid var(--color-red)', color: 'var(--color-red)' }}>
          <div className="text-sm">
            <strong>This session is cancelled.</strong> Sign-ups are closed and attendees have been emailed.
          </div>
          <button
            type="button" onClick={uncancelOccurrence} disabled={cancelBusy}
            className="px-4 py-1.5 rounded-full text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#FFFFFF', color: 'var(--color-red)', border: '1px solid var(--color-red)', cursor: cancelBusy ? 'wait' : 'pointer' }}
          >
            {cancelBusy ? 'Restoring…' : 'Restore session'}
          </button>
        </div>
      )}

      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div className="flex gap-6 text-sm">
          <Stat label="Signed up">{rows.length}</Stat>
          <Stat label="Accepted">{acceptedCount}{capacity != null ? ` / ${capacity}` : ''}</Stat>
          <Stat label="Pending">{pendingCount}</Stat>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!adminOnList && !isCancelled && (
              <button
                type="button"
                onClick={joinSelf}
                disabled={joinBusy}
                className="px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', cursor: joinBusy ? 'wait' : 'pointer' }}
              >
                {joinBusy ? 'Joining…' : signupMode === 'curated' ? '+ Request to join' : '+ Add me to this session'}
              </button>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={publishing || rows.length === 0 || isCancelled}
              className="px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: publishing ? 'wait' : 'pointer' }}
            >
              {publishing ? 'Publishing…' : lastPub ? 'Re-publish & email' : 'Publish & email everyone'}
            </button>
            {isRecurring && !isCancelled && (
              <button
                type="button" onClick={cancelOccurrence} disabled={cancelBusy}
                className="px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-red)', color: '#FFFFFF', border: 'none', cursor: cancelBusy ? 'wait' : 'pointer' }}
              >
                {cancelBusy ? 'Cancelling…' : 'Cancel this session'}
              </button>
            )}
          </div>
          {lastPub && (
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Last sent {new Date(lastPub).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {publishMsg && (
        <p className="text-sm py-2 px-3 rounded-lg mb-4"
          style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
          {publishMsg}
        </p>
      )}
      {error && (
        <p className="text-sm py-2 px-3 rounded-lg mb-4" style={{ backgroundColor: '#FEE2E2', color: 'var(--color-red)' }}>{error}</p>
      )}

      <div className="rounded-2xl overflow-x-auto" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <Th>#</Th>
              <Th>Attendee</Th>
              <Th>Signed up</Th>
              <Th>Status</Th>
              <Th>Pay</Th>
              <Th title="Past 3 months attendance for this event">3 mo</Th>
              <Th title="Lifetime attendance for this event">Lifetime</Th>
              {eventStarted && <Th title="Did they attend on this event's date?">Attended</Th>}
              <Th>Order</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.signup_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Td muted>{idx + 1}</Td>
                <Td>
                  <div className="font-medium">{r.name ?? '—'}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{r.email}</div>
                </Td>
                <Td muted>{new Date(r.signed_up_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Td>
                <Td>
                  <select
                    value={r.status}
                    onChange={e => changeStatus(r.signup_id, e.target.value as SignupStatus)}
                    className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold cursor-pointer"
                    style={{ backgroundColor: STATUS_TONE[r.status].bg, color: STATUS_TONE[r.status].fg, border: 'none' }}
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Td>
                <Td>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: PAY_TONE[r.payment_status].bg, color: PAY_TONE[r.payment_status].fg }}>
                    {r.payment_status}
                  </span>
                </Td>
                <Td><Rate attended={r.past_3mo_attended} total={r.past_3mo_total} /></Td>
                <Td><Rate attended={r.lifetime_attended} total={r.lifetime_total} /></Td>
                {eventStarted && (
                  <Td>
                    <button
                      type="button"
                      onClick={() => toggleAttendedToday(r.profile_id, r.attended_today)}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor:
                          r.attended_today === true  ? '#D1FAE5' :
                          r.attended_today === false ? '#FEE2E2' : '#E5E7EB',
                        color:
                          r.attended_today === true  ? 'var(--color-accent-dk)' :
                          r.attended_today === false ? 'var(--color-red)'      : '#374151',
                        border: 'none', cursor: 'pointer',
                      }}
                      title="Click to cycle: not recorded → attended → no-show → not recorded"
                    >
                      {r.attended_today === true ? '✓ Attended' : r.attended_today === false ? '✗ No-show' : 'Not set'}
                    </button>
                  </Td>
                )}
                <Td>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => swap(idx, -1)} disabled={idx === 0 || busy}
                      className="px-2 py-0.5 text-xs rounded disabled:opacity-30" style={{ background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}>↑</button>
                    <button type="button" onClick={() => swap(idx,  1)} disabled={idx === rows.length - 1 || busy}
                      className="px-2 py-0.5 text-xs rounded disabled:opacity-30" style={{ background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}>↓</button>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={eventStarted ? 9 : 8} className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No-one has signed up yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-2xl font-semibold">{children}</p>
    </div>
  );
}

function Th({ children, title }: { children: React.ReactNode; title?: string }) {
  return <th title={title} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{children}</th>;
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td className="px-4 py-3" style={{ color: muted ? 'var(--color-muted)' : undefined }}>{children}</td>;
}

function Rate({ attended, total }: { attended: number; total: number }) {
  if (total === 0) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
  const pct = Math.round((attended / total) * 100);
  return (
    <span title={`${attended} of ${total}`}>
      <strong>{pct}%</strong>{' '}
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>({attended}/{total})</span>
    </span>
  );
}
