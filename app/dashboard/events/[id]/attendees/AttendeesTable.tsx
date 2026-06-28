'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignupStatus, PaymentStatus, TeamColour } from '@/lib/signups';
import { TEAM_COLOURS } from '@/lib/signups';
import { useDialog } from '@/components/Dialog';

export type AttendeeRow = {
  signup_id:         string;
  profile_id:        string;
  name:              string | null;
  email:             string | null;
  status:            SignupStatus;
  payment_status:    PaymentStatus;
  team_colour:       TeamColour | null;
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
  initial:          AttendeeRow[];
};

// Only two visible statuses now — pending (default) and accepted (on the
// final list). 'cancelled' still exists as an internal soft-delete state
// (set by self-cancel or the Remove button) but the row is filtered out of
// the table query so it never needs to render here.
const STATUS_OPTIONS: { value: SignupStatus; label: string }[] = [
  { value: 'pending',  label: 'Pending'  },
  { value: 'accepted', label: 'Accepted' },
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
  initial,
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
  const [editMode,    setEditMode]    = useState(false);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [bulkBusy,    setBulkBusy]    = useState(false);
  const { confirm, dialog: confirmDialog } = useDialog();

  function toggleSelected(signupId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(signupId)) next.delete(signupId);
      else                    next.add(signupId);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else                                setSelected(new Set(rows.map(r => r.signup_id)));
  }
  function exitEditMode() {
    setEditMode(false);
    setSelected(new Set());
  }

  // Fire a single PATCH per selected row in parallel. Optimistic — flip
  // the local rows immediately and keep the selection so the admin can
  // chain bulk actions (e.g. tick rows once, then set colour AND paid
  // AND accepted in three clicks).
  async function bulkPatch(patch: { status?: SignupStatus; payment_status?: PaymentStatus; team_colour?: TeamColour | null }) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true); setError('');
    setRows(rs => rs.map(r => ids.includes(r.signup_id) ? { ...r, ...patch } : r));
    const results = await Promise.all(ids.map(id =>
      fetch(`/api/events/${eventId}/signups/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      }).then(r => r.ok)
    ));
    setBulkBusy(false);
    const fails = results.filter(ok => !ok).length;
    if (fails > 0) setError(`${fails} of ${ids.length} update${ids.length === 1 ? '' : 's'} failed — refresh to retry.`);
  }

  // null = use the manual roster order (sort_order with signed_up fallback).
  type SortKey = 'signed_up' | 'past_3mo' | 'lifetime';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'signed_up' ? 'asc' : 'desc');
    }
  }
  function clearSort() {
    setSortKey(null);
    setSortDir('asc');
  }
  function rate(attended: number, total: number): number {
    return total === 0 ? -1 : attended / total;
  }
  const sortedRows = useMemo(() => {
    if (sortKey == null) return rows;
    const sign = sortDir === 'asc' ? 1 : -1;
    const arr = rows.slice();
    arr.sort((a, b) => {
      if (sortKey === 'signed_up')
        return sign * (new Date(a.signed_up_at).getTime() - new Date(b.signed_up_at).getTime());
      if (sortKey === 'past_3mo')
        return sign * (rate(a.past_3mo_attended, a.past_3mo_total) - rate(b.past_3mo_attended, b.past_3mo_total));
      return   sign * (rate(a.lifetime_attended, a.lifetime_total) - rate(b.lifetime_attended, b.lifetime_total));
    });
    return arr;
  }, [rows, sortKey, sortDir]);
  function sortArrow(key: SortKey): string {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  async function cancelOccurrence() {
    const paidCount = rows.filter(r => r.payment_status === 'paid').length;
    const refundNote = paidCount
      ? `\n\nHeads-up: ${paidCount} attendee${paidCount === 1 ? '' : 's'} already paid. They'll be emailed about the cancellation, but you'll need to issue refunds manually in your Stripe dashboard.`
      : '';
    const ok = await confirm({
      title:        'Cancel this session?',
      message:      `Cancel this session only? Other sessions in the series are unaffected. ${rows.length} attendee${rows.length === 1 ? '' : 's'} will be emailed.${refundNote}`,
      confirmLabel: 'Cancel session',
      tone:         'danger',
    });
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
    const ok = await confirm({
      title:        'Restore this session?',
      message:      'Bring this session back? Existing sign-ups will need to be re-confirmed by you.',
      confirmLabel: 'Restore',
    });
    if (!ok) return;
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
  async function publish() {
    const breakdown = [
      `${acceptedCount} accepted`,
      `${rows.filter(r => r.status === 'waitlisted').length} waitlisted`,
      `${rows.filter(r => r.status === 'declined').length} declined`,
      pendingCount ? `${pendingCount} still pending (will also be emailed)` : '',
    ].filter(Boolean).join(', ');
    const ok = await confirm({
      title:        'Send acceptances?',
      message:      `Send a notification email to every non-cancelled attendee?\n\n${breakdown}\n\nThey'll see their final status and the event details.`,
      confirmLabel: 'Send emails',
    });
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

  async function removeSignup(signupId: string, name: string | null) {
    const who = name ?? 'this attendee';
    const ok = await confirm({
      title:        'Remove attendee?',
      message:      `Remove ${who} from this session? They'll disappear from the list and won't see this session in their dashboard.`,
      confirmLabel: 'Remove',
      tone:         'danger',
    });
    if (!ok) return;
    const prev = rows;
    setRows(rs => rs.filter(r => r.signup_id !== signupId));
    setError('');
    const res = await fetch(`/api/events/${eventId}/signups/${signupId}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setRows(prev);
      setError(j.detail ?? j.error ?? 'remove_failed');
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
      {confirmDialog}
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
            {editMode ? (
              <button
                type="button"
                onClick={exitEditMode}
                disabled={bulkBusy}
                className="px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
              >
                Done editing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                disabled={rows.length === 0 || isCancelled}
                className="px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
              >
                Make up the team
              </button>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={publishing || rows.length === 0 || isCancelled}
              className="px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent-dk)', color: '#FFFFFF', border: 'none', cursor: publishing ? 'wait' : 'pointer' }}
            >
              {publishing ? 'Sending…' : lastPub ? 'Re-notify all players' : 'Notify all players'}
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

      {editMode && (
        <div className="p-4 rounded-2xl mb-4 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
            {selected.size === 0 ? 'Tick rows to apply a bulk action.' : `${selected.size} selected`}
          </span>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Team colour</span>
            {TEAM_COLOURS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => bulkPatch({ team_colour: c.value })}
                disabled={selected.size === 0 || bulkBusy}
                className="px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-40"
                style={{
                  backgroundColor: c.swatch,
                  color:           c.fg,
                  border:          c.value === 'white' ? '1px solid var(--color-border)' : 'none',
                  cursor:          (selected.size === 0 || bulkBusy) ? 'not-allowed' : 'pointer',
                }}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => bulkPatch({ team_colour: null })}
              disabled={selected.size === 0 || bulkBusy}
              className="px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-40"
              style={{
                backgroundColor: 'var(--color-bg)',
                color:           'var(--color-fg)',
                border:          '1px solid var(--color-border)',
                cursor:          (selected.size === 0 || bulkBusy) ? 'not-allowed' : 'pointer',
              }}
            >
              N/A
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap basis-full justify-end">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Operation</span>
            <BulkBtn label="Mark accepted" onClick={() => bulkPatch({ status: 'accepted' })} disabled={selected.size === 0 || bulkBusy} />
            <BulkBtn label="Mark pending"  onClick={() => bulkPatch({ status: 'pending'  })} disabled={selected.size === 0 || bulkBusy} />
            <BulkBtn label="Mark paid"     onClick={() => bulkPatch({ payment_status: 'paid'   })} disabled={selected.size === 0 || bulkBusy} />
            <BulkBtn label="Mark unpaid"   onClick={() => bulkPatch({ payment_status: 'unpaid' })} disabled={selected.size === 0 || bulkBusy} />
          </div>
        </div>
      )}

      {publishMsg && (
        <p className="text-sm py-2 px-3 rounded-lg mb-4"
          style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
          {publishMsg}
        </p>
      )}
      {error && (
        <p className="text-sm py-2 px-3 rounded-lg mb-4" style={{ backgroundColor: '#FEE2E2', color: 'var(--color-red)' }}>{error}</p>
      )}

      {sortKey != null && (
        <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
          Sorted by <strong>{sortKey === 'signed_up' ? 'Signed up' : sortKey === 'past_3mo' ? '3 mo' : 'Lifetime'}</strong> ({sortDir === 'asc' ? 'ascending' : 'descending'}).{' '}
          <button type="button" onClick={clearSort}
            className="underline"
            style={{ color: 'var(--color-accent-dk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Clear sort
          </button>
        </p>
      )}
      <div className="rounded-2xl overflow-x-auto" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <Th>#</Th>
              {editMode && (
                <Th title="Select rows to apply a bulk action">
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                    style={{ width: 16, height: 16, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                  />
                </Th>
              )}
              <Th>Attendee</Th>
              <SortableTh active={sortKey === 'signed_up'} onClick={() => toggleSort('signed_up')}>
                Signed up{sortArrow('signed_up')}
              </SortableTh>
              <Th>Status</Th>
              <Th>Pay</Th>
              <Th>Team colour</Th>
              <SortableTh active={sortKey === 'past_3mo'} onClick={() => toggleSort('past_3mo')} title="Past 3 months attendance for this event">
                3 mo{sortArrow('past_3mo')}
              </SortableTh>
              <SortableTh active={sortKey === 'lifetime'} onClick={() => toggleSort('lifetime')} title="Lifetime attendance for this event">
                Lifetime{sortArrow('lifetime')}
              </SortableTh>
              <Th>Order</Th>
              <Th>{' '}</Th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, idx) => (
              <tr key={r.signup_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Td muted>{idx + 1}</Td>
                {editMode && (
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.signup_id)}
                      onChange={() => toggleSelected(r.signup_id)}
                      aria-label={`Select ${r.name ?? r.email ?? ''}`}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                    />
                  </Td>
                )}
                <Td>
                  <div className="font-medium">{r.name ?? '—'}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{r.email}</div>
                </Td>
                <Td muted>{new Date(r.signed_up_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Td>
                <Td>
                  {editMode ? (
                    <select
                      value={r.status}
                      onChange={e => changeStatus(r.signup_id, e.target.value as SignupStatus)}
                      className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold cursor-pointer"
                      style={{ backgroundColor: STATUS_TONE[r.status].bg, color: STATUS_TONE[r.status].fg, border: 'none' }}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span
                      className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold inline-block"
                      style={{ backgroundColor: STATUS_TONE[r.status].bg, color: STATUS_TONE[r.status].fg }}
                    >
                      {r.status}
                    </span>
                  )}
                </Td>
                <Td>
                  {r.status === 'pending' ? (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: '#E5E7EB', color: '#6B7280' }}>
                      N/A
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: PAY_TONE[r.payment_status].bg, color: PAY_TONE[r.payment_status].fg }}>
                      {r.payment_status}
                    </span>
                  )}
                </Td>
                <Td>
                  <TeamColourBadge value={r.team_colour} />
                </Td>
                <Td><Rate attended={r.past_3mo_attended} total={r.past_3mo_total} /></Td>
                <Td><Rate attended={r.lifetime_attended} total={r.lifetime_total} /></Td>
                <Td>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => swap(idx, -1)}
                      disabled={idx === 0 || busy || sortKey != null}
                      title={sortKey != null ? 'Disabled while a column sort is active — clear the sort to reorder manually.' : 'Move up'}
                      className="px-2 py-0.5 text-xs rounded disabled:opacity-30" style={{ background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}>↑</button>
                    <button type="button" onClick={() => swap(idx,  1)}
                      disabled={idx === rows.length - 1 || busy || sortKey != null}
                      title={sortKey != null ? 'Disabled while a column sort is active — clear the sort to reorder manually.' : 'Move down'}
                      className="px-2 py-0.5 text-xs rounded disabled:opacity-30" style={{ background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}>↓</button>
                  </div>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => removeSignup(r.signup_id, r.name)}
                    disabled={r.payment_status === 'paid'}
                    title={r.payment_status === 'paid' ? 'Attendee paid — refund in Stripe first, then change status to Cancelled.' : 'Remove from this session'}
                    className="text-xs disabled:opacity-30"
                    style={{ color: 'var(--color-red)', background: 'none', border: 'none', cursor: r.payment_status === 'paid' ? 'not-allowed' : 'pointer' }}
                  >
                    Remove
                  </button>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={editMode ? 11 : 10} className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No-one has signed up yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TeamColourBadge({ value }: { value: TeamColour | null }) {
  if (!value) {
    return (
      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
        style={{ backgroundColor: '#E5E7EB', color: '#6B7280' }}>
        N/A
      </span>
    );
  }
  const c = TEAM_COLOURS.find(t => t.value === value);
  if (!c) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5"
      style={{ backgroundColor: c.swatch, color: c.fg, border: c.value === 'white' ? '1px solid var(--color-border)' : 'none' }}>
      {c.label}
    </span>
  );
}

function BulkBtn({ label, onClick, disabled }: {
  label:     string;
  onClick:   () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-40"
      style={{
        backgroundColor: '#2563EB',
        color:           '#FFFFFF',
        border:          'none',
        cursor:          disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
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

function SortableTh({ children, title, active, onClick }: {
  children: React.ReactNode;
  title?:   string;
  active:   boolean;
  onClick:  () => void;
}) {
  return (
    <th title={title} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider"
      style={{ color: active ? 'var(--color-fg)' : 'var(--color-muted)', cursor: 'pointer', userSelect: 'none' }}
      onClick={onClick}
    >
      {children}
    </th>
  );
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
