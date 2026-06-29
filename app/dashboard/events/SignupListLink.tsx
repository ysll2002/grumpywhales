'use client';

import { useEffect, useState } from 'react';

// Clickable signup count on the events dashboard. Tapping it opens a
// modal listing every signed-up player's name (no email, no status —
// just the roster).
export default function SignupListLink({
  names, count, capacity,
}: {
  names:    string[];
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

            {names.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No-one signed up yet.</p>
            ) : (
              <ol className="text-sm space-y-1 max-h-80 overflow-auto" style={{ paddingLeft: '1.25rem' }}>
                {names.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
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
