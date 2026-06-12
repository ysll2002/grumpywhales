import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { plaid, PLAID_PRODUCTS, PLAID_COUNTRIES } from '@/lib/plaid';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base       = process.env.APP_URL ?? 'https://grumpywhales.com';
  const redirectUri = `${base}/dashboard/banking/oauth-redirect`;
  const webhook     = `${base}/api/plaid/webhook`;

  try {
    const { data } = await plaid().linkTokenCreate({
      user:          { client_user_id: session.user.profileId },
      client_name:   'GrumpyWhales',
      products:      PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRIES,
      language:      'en',
      redirect_uri:  redirectUri,
      webhook,
    });
    return NextResponse.json({ link_token: data.link_token });
  } catch (e) {
    // Plaid SDK wraps errors as axios errors — surface the JSON body so the
    // UI can show why (redirect_uri not allowlisted, product not approved,
    // etc.) instead of a generic "400".
    const err = e as { response?: { data?: unknown }; message?: string };
    const plaidBody = err.response?.data ?? null;
    console.error('Plaid linkTokenCreate failed', {
      message:      err.message,
      plaid:        plaidBody,
      env:          process.env.PLAID_ENV,
      redirectUri,
      webhook,
    });
    return NextResponse.json(
      {
        error: err.message ?? 'Plaid link_token error',
        plaid: plaidBody,
        debug: { env: process.env.PLAID_ENV ?? 'sandbox', redirectUri },
      },
      { status: 500 },
    );
  }
}
