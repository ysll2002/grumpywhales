import { supabaseAdmin } from '@/lib/supabase-admin';
import { isPlatformAdmin } from '@/lib/platform-admin';

// Returns true if the profile can manage the given event:
//   - they're the event's original creator (events.admin_id), OR
//   - they've been added as a co-admin via event_admins, OR
//   - they're a platform admin (members of platform_admins gain access to every event).
export async function isEventAdmin(eventId: string, profileId: string): Promise<boolean> {
  const [eventRes, adminRes, profileRes] = await Promise.all([
    supabaseAdmin.from('events').select('admin_id').eq('id', eventId).maybeSingle(),
    supabaseAdmin.from('event_admins').select('event_id').eq('event_id', eventId).eq('profile_id', profileId).maybeSingle(),
    supabaseAdmin.from('profiles').select('email').eq('id', profileId).maybeSingle(),
  ]);
  if (eventRes.data?.admin_id === profileId) return true;
  if (adminRes.data) return true;
  if (await isPlatformAdmin(profileRes.data?.email)) return true;
  return false;
}
