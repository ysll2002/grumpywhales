import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';

let _client: PlaidApi | undefined;

function envName(): keyof typeof PlaidEnvironments {
  const v = (process.env.PLAID_ENV ?? 'sandbox').toLowerCase();
  if (v === 'production')  return 'production';
  if (v === 'development') return 'development';
  return 'sandbox';
}

export function plaid(): PlaidApi {
  if (!_client) {
    const env = envName();
    _client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[env],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET':    process.env.PLAID_SECRET,
          },
        },
      }),
    );
  }
  return _client;
}

export const PLAID_PRODUCTS:  Products[]    = [Products.Transactions];
export const PLAID_COUNTRIES: CountryCode[] = [CountryCode.Gb];
