'use client';

import { useCallback, useEffect, useState } from 'react';

// Replaces window.confirm() / window.alert() with a site-styled modal.
//
//   const { confirm, alert, dialog } = useDialog();
//   …
//   if (!(await confirm({ message: 'Remove user?' }))) return;
//   …
//   return <>{dialog}{ … }</>;
//
// The hook returns a `dialog` ReactNode that the caller MUST render inside
// the component tree exactly once (typically at the end). It's the same
// instance whether confirm() or alert() opened it; only one is on screen
// at a time, and resolving it (button click or Esc) returns the promise.

type Tone = 'default' | 'danger';

type ConfirmOpts = {
  title?:        string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  tone?:         Tone;
};

type AlertOpts = {
  title?:        string;
  message:       string;
  confirmLabel?: string;
  tone?:         Tone;
};

type ActiveState =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'alert';   opts: AlertOpts;   resolve: () => void };

export function useDialog() {
  const [active, setActive] = useState<ActiveState | null>(null);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>(resolve => {
      setActive({ kind: 'confirm', opts, resolve });
    });
  }, []);

  const alert = useCallback((opts: AlertOpts) => {
    return new Promise<void>(resolve => {
      setActive({ kind: 'alert', opts, resolve });
    });
  }, []);

  const dismiss = useCallback((value: boolean) => {
    if (!active) return;
    if (active.kind === 'confirm') active.resolve(value);
    else                            active.resolve();
    setActive(null);
  }, [active]);

  // Esc cancels (false for confirm, OK for alert which just closes).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(false);
      if (e.key === 'Enter')  dismiss(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, dismiss]);

  const dialog = active && (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 26, 20, 0.55)' }}
      onClick={() => dismiss(false)}
    >
      <div
        className="rounded-2xl w-full max-w-md p-6"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {active.opts.title && (
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {active.opts.title}
          </h3>
        )}
        <p className="text-sm whitespace-pre-wrap mb-6" style={{ color: 'var(--color-fg)' }}>
          {active.opts.message}
        </p>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {active.kind === 'confirm' && (
            <button
              type="button"
              onClick={() => dismiss(false)}
              className="px-5 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              {active.opts.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="px-5 py-2 rounded-full text-sm font-medium"
            style={{
              backgroundColor: active.opts.tone === 'danger' ? 'var(--color-red)' : 'var(--color-accent)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {active.opts.confirmLabel ?? (active.kind === 'alert' ? 'OK' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );

  return { confirm, alert, dialog };
}
