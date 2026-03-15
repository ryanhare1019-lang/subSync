-- Browse feedback: tracks user reactions to cards in the browse experience
create table if not exists public.browse_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  tmdb_id integer not null,
  title text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  feedback text not null check (feedback in ('thumbs_up', 'watched', 'not_interested')),
  created_at timestamptz default now(),
  unique (user_id, tmdb_id, media_type)
);

alter table public.browse_feedback enable row level security;

create policy "Users manage own browse feedback"
  on public.browse_feedback for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
