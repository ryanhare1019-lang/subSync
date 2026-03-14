import { createServerSupabaseClient } from '@/lib/supabase-server';
import { TasteQuiz } from '@/components/TasteQuiz';
import { TasteProfile } from '@/types';

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let existing: Partial<TasteProfile> | null = null;
  if (user) {
    const { data } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    existing = data;
  }

  return <TasteQuiz userId={user?.id || ''} existing={existing} />;
}
