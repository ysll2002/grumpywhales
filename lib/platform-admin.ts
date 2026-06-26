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
