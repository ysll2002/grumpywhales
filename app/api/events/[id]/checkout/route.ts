import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

// POST /api/events/:id/checkout — create a Stripe Checkout Session for the
// current user's signup on a specific occurrence. Body: { occurrence_date }.
// Returns { url } to redirect to.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  const profileId = session.user.profileId;

  const body = await req.json().catch(() => ({})) as { occurrence_date?: string };
  if (!body.occurrence_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.occurrence_date)) {
    return NextResponse.json({ error: 'missing_occurrence_date' }, { status: 400 });
  }

  // Load event + signup for this occurrence in parallel
  const [eventRes, signupRes] = await Promise.all([
    supabase.from('events')
      .select('id, title, fee_amount, fee_currency, payment_reference, status, cancelled_dates, published_occurrence_dates')
      .eq('id', eventId).maybeSingle(),
    supabase.from('event_signups')
      .select('id, status, payment_status, stripe_session_id')
      .eq('event_id', eventId).eq('profile_id', profileId).eq('occurrence_date', body.occurrence_date).maybeSingle(),
  ]);

  const event  = eventRes.data;
  const signup = signupRes.data;
  if (event && (event.cancelled_dates ?? []).includes(body.occurrence_date)) {
    return NextResponse.json({ error: 'occurrence_cancelled' }, { status: 409 });
  }
  if (!event)  return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  if (event.status !== 'published') {
    return NextResponse.json({ error: 'event_not_open' }, { status: 409 });
  }
  if (!signup) return NextResponse.json({ error: 'not_signed_up' }, { status: 409 });
  if (signup.payment_status === 'paid') {
    return NextResponse.json({ error: 'already_paid' }, { status: 409 });
  }
  if (Number(event.fee_amount) <= 0) {
    return NextResponse.json({ error: 'event_is_free' }, { status: 409 });
  }

  // Build URLs. Stripe replaces {CHECKOUT_SESSION_ID} in the success URL.
  // Both redirects land on /dashboard/events; the success path carries the
  // session id so the dashboard can sync-verify the payment without waiting
  // for the webhook to land.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://grumpywhales.com';
  const successUrl = `${baseUrl}/dashboard/events?paid=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${baseUrl}/dashboard/events?paid=0`;

  let checkoutSession;
  try {
    checkoutSession = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency:     event.fee_currency.toLowerCase(),
          unit_amount:  Math.round(Number(event.fee_amount) * 100),
          product_data: { name: event.title },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      client_reference_id: signup.id,                 // our signup row id
      metadata: { event_id: event.id, signup_id: signup.id, profile_id: profileId },
      payment_intent_data: {
        metadata: { event_id: event.id, signup_id: signup.id, profile_id: profileId },
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    console.error('[checkout POST] stripe error', detail);
    return NextResponse.json({ error: 'stripe_error', detail }, { status: 500 });
  }

  // Stash the session id so we can correlate on the redirect even before the
  // webhook fires.
  await supabase.from('event_signups')
    .update({ stripe_session_id: checkoutSession.id, updated_at: new Date().toISOString() })
    .eq('id', signup.id);

  return NextResponse.json({ url: checkoutSession.url });
}
