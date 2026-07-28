'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Admin-side control on the Attendees page: add / edit / remove the
// video-link URL for the currently-selected session. Once set, attendees
// on that session see a 'Watch video' link on their Join event card.
export default function VideoLinkButton({
  eventId, occurrenceDate, initialUrl,
}: {
  eventId:        string;
  occurrenceDate: string;
  initialUrl:     string | null;
}) {
  const router = useRouter();
  const [open,   setOpen]   = useState(false);
  const [value,  setValue]  = useState(initialUrl ?? '');
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState('');
  const [url,    setUrl]    = useState(initialUrl ?? '');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function save() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/video-link`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ occurrence_date: occurrenceDate, url: value.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error === 'invalid_url' ? 'Enter a valid http(s) URL.' : (j.error ?? 'Save failed.'));
      return;
    }
    setUrl(value.trim());
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/video-link`, {
      method:  'DELETE',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Remove failed.');
      return;
    }
    setUrl('');
    setValue('');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setValue(url); setError(''); setOpen(true); }}
        className="px-5 py-2.5 rounded-full text-sm font-medium"
        style={{
          backgroundColor: '#2563EB',
          color:           '#FFFFFF',
          border:          'none',
          cursor:          'pointer',
        }}
      >
        {url ? 'Edit video link' : 'Add video link'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 26, 20, 0.55)' }}
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="rounded-2xl w-full max-w-md p-6"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Video link
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>
              Attendees on this session will see a &lsquo;Watch video&rsquo; link on their Join event card.
            </p>

            <input
              type="url"
              inputMode="url"
              autoFocus
              placeholder="https://youtube.com/…"
              value={value}
              onChange={e => setValue(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2 rounded-lg text-sm mb-2"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}
            />
            {error && (
              <p className="text-xs mb-2" style={{ color: 'var(--color-red)' }}>{error}</p>
            )}

            <div className="flex justify-between items-center mt-6 gap-3 flex-wrap">
              {url ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#FFFFFF', color: 'var(--color-red)', border: '1px solid var(--color-red)', cursor: busy ? 'wait' : 'pointer' }}
                >
                  Remove
                </button>
              ) : <span />}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || !value.trim()}
                  className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
