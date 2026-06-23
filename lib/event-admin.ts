import { supabaseAdmin } from '@/lib/supabase-admin';

// Returns true if the profile is the event's original creator OR has been
// added as a co-admin via event_admins. Both reads run in parallel.
export async function isEventAdmin(eventId: string, profileId: string): Promise<boolean> {
  const [eventRes, adminRes] = await Promise.all([
    supabaseAdmin.from('events').select('admin_id').eq('id', eventId).maybeSingle(),
    supabaseAdmin.from('event_admins').select('event_id').eq('event_id', eventId).eq('profile_id', profileId).maybeSingle(),
  ]);
  if (eventRes.data?.admin_id === profileId) return true;
  if (adminRes.data) return true;
  return false;
}
