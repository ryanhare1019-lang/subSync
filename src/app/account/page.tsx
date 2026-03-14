import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AccountClient } from './AccountClient';

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <AccountClient
      userEmail={user.email ?? ''}
      displayName={profile?.display_name ?? ''}
    />
  );
}
