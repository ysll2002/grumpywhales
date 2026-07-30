'use client';

import { useEffect, useState } from 'react';
import type { SignupStatus } from '@/lib/signups';

// Roster grouping order: confirmed players first, then anyone waiting for a
// decision, then drop-outs at the bottom so the active list reads cleanly.
// Within each group the original signed-up-at order is preserved (stable sort).
const STATUS_ORDER: Record<SignupStatus, number> = {
  accepted:     0,
  waiting_list: 1,
  waitlisted:   2,
  declined:     3,
  cancelled:    4,
};

const STATUS_BADGE: Record<SignupStatus, { bg: string; fg: string; label: string }> = {
  accepted:     { bg: '#D1FAE5', fg: 'var(--color-accent-dk)', label: 'Accepted'     },
  waiting_list: { bg: '#EDE9FE', fg: '#6D28D9',                label: 'Waiting list' },
  waitlisted:   { bg: '#FFF4B8', fg: '#7C5800',                label: 'Waitlist'     },
  declined:     { bg: '#FEE2E2', fg: 'var(--color-red)',       label: 'Declined'     },
  cancelled:    { bg: '#E5E7EB', fg: '#6B7280',                label: 'Drop out'     },
};

export type SignupEntry = { name: string; status: SignupStatus };

export default function SignupListLink({
  entries, count, capacity,
}: {
  entries:  SignupEntry[];
  count:    number;
  capacity: number | null;
}) {
  const [open, setOpen] = useState(false);
  const label = capacity != null ? `${count} / ${capacity} signed up` : `${count} signed up`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm mt-1 text-left p-0 bg-transparent border-0"
        style={{ color: 'var(--color-muted)', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 26, 20, 0.55)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-2xl w-full max-w-md p-6"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Signed up
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>
              {label}
            </p>

            {entries.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No-one signed up yet.</p>
            ) : (
              <ol className="text-sm space-y-1.5 max-h-80 overflow-auto" style={{ paddingLeft: '1.25rem' }}>
                {[...entries]
                  .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                  .map((e, i) => {
                  const tone = STATUS_BADGE[e.status];
                  const dropped = e.status === 'cancelled';
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 pr-2" style={{ opacity: dropped ? 0.55 : 1 }}>
                      <span className="truncate" style={{ textDecoration: dropped ? 'line-through' : undefined }}>{e.name}</span>
                      <span
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{ backgroundColor: tone.bg, color: tone.fg }}
                      >
                        {tone.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
