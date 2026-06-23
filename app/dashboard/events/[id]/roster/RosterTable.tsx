'use client';

import { useMemo, useState } from 'react';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

export type RosterRow = {
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
  eventId:        string;
  occurrenceDate: string;     // YYYY-MM-DD
  eventStarted:   boolean;
  capacity:       number | null;
  initial:        RosterRow[];
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

export default function RosterTable({ eventId, occurrenceDate, eventStarted, capacity, initial }: Props) {
  const [rows,  setRows]  = useState<RosterRow[]>(initial);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  const acceptedCount = useMemo(() => rows.filter(r => r.status === 'accepted').length, [rows]);

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
    const res = await fetch(`/api/events/${eventId}/roster`, {
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
      <div className="flex gap-6 mb-6 text-sm">
        <Stat label="Signed up">{rows.length}</Stat>
        <Stat label="Accepted">{acceptedCount}{capacity != null ? ` / ${capacity}` : ''}</Stat>
        <Stat label="Pending">{rows.filter(r => r.status === 'pending').length}</Stat>
      </div>

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
