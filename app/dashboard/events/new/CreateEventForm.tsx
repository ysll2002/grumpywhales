'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type EventRecurrence, type EventSignupMode, DOW_LABELS } from '@/lib/events';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--color-border)',
  backgroundColor: '#FFFFFF',
  color: 'var(--color-fg)',
  fontSize: '0.9rem',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%23111' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '12px 8px',
  paddingRight: '2.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  marginBottom: '0.5rem',
};

function toLocalDatetimeInput(d: Date): string {
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in *local* time.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateEventForm() {
  const router = useRouter();
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [startsAt,    setStartsAt]    = useState(toLocalDatetimeInput(oneHourLater));
  const [endsAt,      setEndsAt]      = useState(toLocalDatetimeInput(twoHoursLater));
  const [location,    setLocation]    = useState('');
  const [lat,         setLat]         = useState<number | null>(null);
  const [lng,         setLng]         = useState<number | null>(null);
  const [feeAmount,   setFeeAmount]   = useState('0');
  const [feeCurrency, setFeeCurrency] = useState('GBP');
  const [recurrence,  setRecurrence]  = useState<EventRecurrence>('none');
  const [signupMode,  setSignupMode]  = useState<EventSignupMode>('first_come');
  const [capacity,    setCapacity]    = useState('');
  const [openDow,     setOpenDow]     = useState('');
  const [openTime,    setOpenTime]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        starts_at: new Date(startsAt).toISOString(),
        ends_at:   endsAt ? new Date(endsAt).toISOString() : null,
        location,
        lat, lng,
        fee_amount: Number(feeAmount),
        fee_currency: feeCurrency,
        recurrence,
        signup_mode: signupMode,
        capacity:    capacity ? Number(capacity) : null,
        status: 'published',
        signup_open_dow:  recurrence === 'weekly' && openDow !== '' ? Number(openDow) : null,
        signup_open_time: recurrence === 'weekly' && openTime       ? openTime        : null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError([data.error, data.detail].filter(Boolean).join(' — ') || 'create_failed');
      setLoading(false);
      return;
    }

    router.push(`/dashboard/manage?created=${data.event.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label style={labelStyle}>Event title</label>
        <input
          type="text"
          required
          placeholder="e.g. London freelancers meet-up"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Description <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span></label>
        <textarea
          rows={4}
          placeholder="What is it, who is it for, what to expect…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Starts</label>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={e => setStartsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Ends <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Repeats</label>
        <select value={recurrence} onChange={e => setRecurrence(e.target.value as EventRecurrence)} style={selectStyle}>
          <option value="none">One-off — happens once</option>
          <option value="daily">Daily — every day</option>
          <option value="weekly">Weekly — same day each week</option>
          <option value="monthly">Monthly — same day each month</option>
        </select>
      </div>

      {recurrence === 'weekly' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium mb-1">Sign-up window</p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Each week&apos;s session opens for sign-ups at the day &amp; time below. Leave blank to keep every session open for sign-up indefinitely.
            </p>
          </div>
          <div>
            <label style={labelStyle}>Open day</label>
            <select value={openDow} onChange={e => setOpenDow(e.target.value)} style={selectStyle}>
              <option value="">— always open —</option>
              {DOW_LABELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Open time <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(UTC)</span></label>
            <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>Location</label>
        <LocationAutocomplete
          value={location}
          onChange={({ value, lat, lng }) => { setLocation(value); setLat(lat); setLng(lng); }}
          inputStyle={inputStyle}
          placeholder="Start typing a UK address, place or postcode…"
        />
        {lat != null && lng != null && (
          <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6 }}>
            📍 {lat.toFixed(4)}, {lng.toFixed(4)} — will appear on the event map.
          </p>
        )}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div>
          <label style={labelStyle}>Fee per attendee</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={feeAmount}
            onChange={e => setFeeAmount(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select value={feeCurrency} onChange={e => setFeeCurrency(e.target.value)} style={selectStyle}>
            <option value="GBP">GBP £</option>
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Sign-up</label>
        <select value={signupMode} onChange={e => setSignupMode(e.target.value as EventSignupMode)} style={selectStyle}>
          <option value="first_come">First-come, first-served</option>
          <option value="curated">I&apos;ll pick the list</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Capacity <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(blank = unlimited)</span></label>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="No limit"
          value={capacity}
          onChange={e => setCapacity(e.target.value)}
          style={inputStyle}
        />
      </div>

      {error && (
        <p className="text-sm py-2 px-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: 'var(--color-red)' }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-full text-sm font-medium"
          style={{
            backgroundColor: loading ? 'var(--color-border)' : 'var(--color-accent)',
            color: '#FFFFFF',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating…' : 'Create event →'}
        </button>
      </div>
    </form>
  );
}
