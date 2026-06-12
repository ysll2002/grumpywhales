import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { plaid, PLAID_PRODUCTS, PLAID_COUNTRIES } from '@/lib/plaid';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data } = await plaid().linkTokenCreate({
      user:         { client_user_id: session.user.profileId },
      client_name:  'GrumpyWhales',
      products:     PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRIES,
      language:     'en',
    });
    return NextResponse.json({ link_token: data.link_token });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Plaid link_token error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
