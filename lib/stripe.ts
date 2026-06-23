import Stripe from 'stripe';

// Lazy singleton — STRIPE_SECRET_KEY isn't needed for the rest of the
// app to build, so we don't construct the client at module load.
let _client: Stripe | undefined;

export function stripe(): Stripe {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _client = new Stripe(key);
  }
  return _client;
}
