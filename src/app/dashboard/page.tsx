import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileRes, tasteRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('taste_profiles').select('id').eq('user_id', user.id).single(),
  ]);

  return (
    <DashboardClient
      userEmail={user.email}
      displayName={profileRes.data?.display_name}
      hasTasteProfile={!!tasteRes.data}
    />
  );
}
