import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';

// Stripe sends events here. We verify the signature with the webhook secret
// before doing anything. Only checkout.session.completed and the various
// payment_intent.* outcomes matter for us right now.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });

  const sig  = req.headers.get('stripe-signature');
  const body = await req.text();   // raw body required for signature verification
  if (!sig)  return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: 'bad_signature', detail: message }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const sessionObj = event.data.object as Stripe.Checkout.Session;
      if (sessionObj.payment_status !== 'paid') break;

      const cref = sessionObj.client_reference_id ?? '';
      const paymentIntentId = typeof sessionObj.payment_intent === 'string' ? sessionObj.payment_intent : null;
      const nowIso = new Date().toISOString();

      // Bulk pay-all: client_reference_id = 'bulk:<profileId>' and the
      // signup ids ride in metadata.signup_ids as a CSV. Flip every one
      // of those rows paid, scoped to the buyer's profile so a forged
      // ref can't touch someone else's signups.
      if (cref.startsWith('bulk:')) {
        const profileId = cref.slice('bulk:'.length);
        const ids = (sessionObj.metadata?.signup_ids ?? '').split(',').map(s => s.trim()).filter(Boolean);
        if (!profileId || ids.length === 0) break;
        await supabase.from('event_signups').update({
          payment_status:           'paid',
          paid_at:                  nowIso,
          stripe_payment_intent_id: paymentIntentId,
          updated_at:               nowIso,
        }).in('id', ids).eq('profile_id', profileId).eq('payment_status', 'unpaid');
        break;
      }

      // Single signup: client_reference_id is just the signup id.
      if (!cref) break;
      await supabase.from('event_signups').update({
        payment_status:           'paid',
        paid_at:                  nowIso,
        stripe_payment_intent_id: paymentIntentId,
        updated_at:               nowIso,
      }).eq('id', cref);
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
      if (!pi) break;
      await supabase.from('event_signups').update({
        payment_status: 'unpaid',
        paid_at:        null,
        updated_at:     new Date().toISOString(),
      }).eq('stripe_payment_intent_id', pi);
      break;
    }
    default:
      // Ignore other events for now.
      break;
  }

  return NextResponse.json({ received: true });
}
