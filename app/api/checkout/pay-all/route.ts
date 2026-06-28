import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

type UnpaidRow = {
  id:              string;
  occurrence_date: string;
  events: {
    id:               string;
    title:            string;
    fee_amount:       number;
    fee_currency:     string;
    cancelled_dates:  string[] | null;
  } | null;
};

// POST /api/checkout/pay-all — create one Stripe Checkout session that
// covers every outstanding signup for the current user. On the success
// redirect, every signup id we sent through Stripe's metadata.signup_ids
// gets marked paid in one shot (see /dashboard/events/page.tsx).
export async function POST(_req: Request) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const profileId = session.user.profileId;

  const { data } = await supabase
    .from('event_signups')
    .select('id, occurrence_date, events(id, title, fee_amount, fee_currency, cancelled_dates)')
    .eq('profile_id', profileId)
    .eq('payment_status', 'unpaid')
    .neq('status', 'cancelled');

  const rows = ((data ?? []) as unknown as UnpaidRow[])
    .filter(r => r.events)
    .filter(r => !(r.events!.cancelled_dates ?? []).includes(r.occurrence_date))
    .filter(r => Number(r.events!.fee_amount) > 0);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'nothing_to_pay' }, { status: 409 });
  }

  // Mixed-currency outstanding totals can't be charged in a single Stripe
  // session — ask the user to pay per-row from the page instead.
  const currencies = new Set(rows.map(r => r.events!.fee_currency.toUpperCase()));
  if (currencies.size > 1) {
    return NextResponse.json({
      error:  'mixed_currencies',
      detail: 'You have outstanding payments in more than one currency. Pay each row individually.',
    }, { status: 409 });
  }
  const currency = rows[0].events!.fee_currency;

  // One line item per signup so the buyer sees a breakdown on the
  // Checkout page; total amount is implicit.
  const lineItems = rows.map(r => ({
    price_data: {
      currency:    currency.toLowerCase(),
      unit_amount: Math.round(Number(r.events!.fee_amount) * 100),
      product_data: {
        name:        r.events!.title,
        description: `Session ${r.occurrence_date}`,
      },
    },
    quantity: 1,
  }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://grumpywhales.com';
  const successUrl = `${baseUrl}/dashboard/events?paid=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${baseUrl}/dashboard/events?paid=0`;

  // Stick the signup-id list into both session metadata and payment-intent
  // metadata so either path (sync verify or webhook) can reconcile.
  const signupIdsCsv = rows.map(r => r.id).join(',');

  let checkoutSession;
  try {
    checkoutSession = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items:           lineItems,
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      client_reference_id:  `bulk:${profileId}`,
      metadata:             { profile_id: profileId, signup_ids: signupIdsCsv, kind: 'pay_all' },
      payment_intent_data:  {
        metadata: { profile_id: profileId, signup_ids: signupIdsCsv, kind: 'pay_all' },
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    console.error('[pay-all POST] stripe error', detail);
    return NextResponse.json({ error: 'stripe_error', detail }, { status: 500 });
  }

  // Stash the session id on every row so the webhook can also correlate.
  await Promise.all(rows.map(r =>
    supabase.from('event_signups')
      .update({ stripe_session_id: checkoutSession!.id, updated_at: new Date().toISOString() })
      .eq('id', r.id)
  ));

  return NextResponse.json({ url: checkoutSession.url });
}
