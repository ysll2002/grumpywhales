import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';

// POST   /api/events/:id/video-link   body { occurrence_date, url }  — set/replace one session's link
// DELETE /api/events/:id/video-link   body { occurrence_date }       — clear that session's link

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { occurrence_date?: string; url?: string };
  if (!body.occurrence_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.occurrence_date)) {
    return NextResponse.json({ error: 'missing_occurrence_date' }, { status: 400 });
  }
  const url = (body.url ?? '').trim();
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('events').select('video_links').eq('id', eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const next = { ...(event.video_links ?? {}), [body.occurrence_date]: url };
  await supabase
    .from('events')
    .update({ video_links: next, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  return NextResponse.json({ ok: true, url });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { occurrence_date?: string };
  if (!body.occurrence_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.occurrence_date)) {
    return NextResponse.json({ error: 'missing_occurrence_date' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('events').select('video_links').eq('id', eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const next = { ...(event.video_links ?? {}) };
  delete next[body.occurrence_date];
  await supabase
    .from('events')
    .update({ video_links: next, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  return NextResponse.json({ ok: true });
}
