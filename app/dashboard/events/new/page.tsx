import Link from 'next/link';
import CreateEventForm from './CreateEventForm';

export default function NewEventPage() {
  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/events" className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← All events
      </Link>
      <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Create event</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        You&apos;ll be the admin. Attendees will pay using a unique reference we generate.
      </p>
      <CreateEventForm />
    </div>
  );
}
