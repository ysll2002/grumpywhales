import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { name, email, password, accepted_terms } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  if (accepted_terms !== true) {
    return NextResponse.json({ error: 'You must agree to the Terms and Privacy Policy' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const { error } = await supabase.from('profiles').insert({
    name,
    email,
    password_hash,
    accepted_terms_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
