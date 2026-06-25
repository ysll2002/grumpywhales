import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditEventForm from './EditEventForm';
import { type Event } from '@/lib/events';

export default async function EventAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const profileId = session!.user.profileId;
  const { id } = await params;

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('admin_id', profileId)
    .maybeSingle();

  if (!event) notFound();
  const ev: Event = event;

  return (
    <div className="p-8 max-w-3xl">
      <Link href={`/dashboard/events/${ev.id}/attendees`} className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← Attendees
      </Link>

      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        Edit <strong>{ev.title}</strong>.
      </p>

      <EditEventForm event={ev} />
    </div>
  );
}
