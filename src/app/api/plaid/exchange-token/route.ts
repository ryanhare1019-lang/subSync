import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

// Map Plaid merchant/name strings to our service names
const MERCHANT_MAP: Record<string, string> = {
  'netflix': 'Netflix',
  'hulu': 'Hulu',
  'disney': 'Disney+',
  'disneyplus': 'Disney+',
  'disney plus': 'Disney+',
  'hbo': 'HBO Max',
  'max.com': 'HBO Max',
  'amazon prime': 'Amazon Prime',
  'primevideo': 'Amazon Prime',
  'prime video': 'Amazon Prime',
  'apple tv': 'Apple TV+',
  'appletv': 'Apple TV+',
  'peacock': 'Peacock',
  'paramount': 'Paramount+',
  'crunchyroll': 'Crunchyroll',
  'spotify': 'Spotify',
  'apple music': 'Apple Music',
  'tidal': 'Tidal',
};

function matchService(merchantName: string, name: string): string | null {
  const combined = `${merchantName} ${name}`.toLowerCase();
  for (const [key, service] of Object.entries(MERCHANT_MAP)) {
    if (combined.includes(key)) return service;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 });
  }

  const { public_token } = await req.json();

  // Exchange public token for access token
  const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
  const accessToken = exchangeRes.data.access_token;

  // Fetch 90 days of transactions
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const txRes = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 500 },
  });

  const transactions = txRes.data.transactions;

  // Find streaming subscriptions
  const foundServices = new Set<string>();
  for (const tx of transactions) {
    const service = matchService(tx.merchant_name || '', tx.name || '');
    if (service) foundServices.add(service);
  }

  if (foundServices.size === 0) {
    return NextResponse.json({ imported: [], message: 'No streaming subscriptions found in your transactions.' });
  }

  // Get existing subscriptions to avoid duplicates
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('service_name')
    .eq('user_id', user.id);

  const existingNames = new Set((existing || []).map(s => s.service_name));

  // Import the ones that aren't already tracked
  const toImport = [...foundServices].filter(s => !existingNames.has(s));

  if (toImport.length > 0) {
    const { STREAMING_SERVICES } = await import('@/lib/constants');
    const rows = toImport.map(name => {
      const svc = STREAMING_SERVICES.find(s => s.name === name);
      return {
        user_id: user.id,
        service_name: name,
        cost: svc?.defaultCost ?? 9.99,
        billing_cycle: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
      };
    });

    await supabase.from('subscriptions').insert(rows);
  }

  return NextResponse.json({
    imported: toImport,
    already_tracked: [...foundServices].filter(s => existingNames.has(s)),
  });
}
