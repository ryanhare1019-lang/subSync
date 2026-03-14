-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

-- User's active subscriptions
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  service_name text not null,
  service_type text not null,
  monthly_cost decimal(6,2) not null,
  billing_cycle text default 'monthly',
  next_renewal date,
  is_trial boolean default false,
  trial_end_date date,
  created_at timestamptz default now()
);

-- Taste profile from onboarding + ongoing feedback
create table public.taste_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  favorite_genres text[] default '{}',
  favorite_titles jsonb default '[]',
  disliked_genres text[] default '{}',
  preferences jsonb default '{}',
  updated_at timestamptz default now()
);

-- Recommendation history + feedback
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  media_type text not null,
  description text,
  service_name text,
  tmdb_id integer,
  poster_url text,
  ai_reason text,
  user_feedback text,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.taste_profiles enable row level security;
alter table public.recommendations enable row level security;

-- RLS policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);
create policy "Users can manage own taste profile" on public.taste_profiles for all using (auth.uid() = user_id);
create policy "Users can manage own recommendations" on public.recommendations for all using (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
