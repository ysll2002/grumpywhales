'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type EventRecurrence } from '@/lib/events';

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
  const [feeAmount,   setFeeAmount]   = useState('0');
  const [feeCurrency, setFeeCurrency] = useState('GBP');
  const [recurrence,  setRecurrence]  = useState<EventRecurrence>('none');
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
        fee_amount: Number(feeAmount),
        fee_currency: feeCurrency,
        recurrence,
        status: 'draft',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'create_failed');
      setLoading(false);
      return;
    }

    router.push(`/dashboard/events/${data.event.id}`);
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
        <select value={recurrence} onChange={e => setRecurrence(e.target.value as EventRecurrence)} style={inputStyle}>
          <option value="none">One-off — happens once</option>
          <option value="daily">Daily — every day</option>
          <option value="weekly">Weekly — same day each week</option>
          <option value="monthly">Monthly — same day each month</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Location</label>
        <input
          type="text"
          placeholder="Venue, address, or Zoom link"
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={inputStyle}
        />
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
          <select value={feeCurrency} onChange={e => setFeeCurrency(e.target.value)} style={inputStyle}>
            <option value="GBP">GBP £</option>
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
          </select>
        </div>
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
