'use client';

import { useEffect, useRef, useState } from 'react';

type GeoResult = { id: string; place_name: string; lat: number; lng: number };

type Props = {
  value:       string;
  onChange:    (next: { value: string; lat: number | null; lng: number | null }) => void;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
};

export default function LocationAutocomplete({ value, onChange, inputStyle, placeholder }: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  // The user's free-text query lives in `value` (the parent's source of truth).
  // We only fetch when they're actively typing — once they've selected a
  // result we suppress the next fetch via `skipNextFetchRef` so the dropdown
  // doesn't immediately reopen. Initialise to `true` so the first effect run
  // (with the pre-loaded address on the edit page) doesn't trigger a fetch
  // and pop the dropdown either.
  const skipNextFetchRef = useRef(true);
  const wrapRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNextFetchRef.current) { skipNextFetchRef.current = false; return; }
    const q = value.trim();
    if (q.length < 3) { setResults([]); setOpen(false); return; }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode/uk?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) { setResults([]); setOpen(false); return; }
        const body = await res.json() as { results: GeoResult[] };
        setResults(body.results);
        setOpen(body.results.length > 0);
      } catch {
        // aborted or network — ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(r: GeoResult) {
    skipNextFetchRef.current = true;
    setResults([]);
    setOpen(false);
    onChange({ value: r.place_name, lat: r.lat, lng: r.lng });
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder ?? 'Start typing a UK address, place or postcode…'}
        onChange={e => onChange({ value: e.target.value, lat: null, lng: null })}
        onFocus={() => results.length > 0 && setOpen(true)}
        style={inputStyle}
        autoComplete="off"
      />
      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0, right: 0,
            zIndex: 30,
            margin: 0, padding: 4,
            listStyle: 'none',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(15, 26, 20, 0.08)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {results.map(r => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}   /* keep focus on input */
                onClick={() => pick(r)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: 8,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-fg)', fontSize: '0.85rem',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {r.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <p style={{ position: 'absolute', right: 12, top: 14, fontSize: 11, color: 'var(--color-muted)' }}>
          searching…
        </p>
      )}
    </div>
  );
}
