// Platform-level admin gate. Backed by the `platform_admins` table — every
// admin (including the original one seeded by the migration) lives there and
// can be removed from the Settings page.

import { supabaseAdmin as supabase } from './supabase-admin';

export async function isPlatformAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from('platform_admins')
    .select('email')
    .ilike('email', email.trim())
    .maybeSingle();
  return data != null;
}

export async function listPlatformAdmins(): Promise<{ email: string; created_at: string | null }[]> {
  const { data } = await supabase
    .from('platform_admins')
    .select('email, created_at')
    .order('created_at', { ascending: true });
  return data ?? [];
}

export type PlatformUser = {
  email:      string;
  name:       string | null;
  created_at: string | null;
  is_admin:   boolean;
  notes:      string | null;
};

// All registered users on the platform, admin status merged from platform_admins.
// Ordered newest signup first — small platform, one flat list is fine.
export async function listPlatformUsers(): Promise<PlatformUser[]> {
  const [profilesRes, admins] = await Promise.all([
    supabase.from('profiles').select('email, name, created_at, admin_notes').order('created_at', { ascending: false }),
    listPlatformAdmins(),
  ]);
  const adminSet = new Set(admins.map(a => a.email.toLowerCase()));
  return (profilesRes.data ?? []).map(p => ({
    email:      p.email,
    name:       p.name ?? null,
    created_at: p.created_at ?? null,
    is_admin:   adminSet.has(p.email.toLowerCase()),
    notes:      p.admin_notes ?? null,
  }));
}
