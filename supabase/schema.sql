-- Run this whole file once in the Supabase SQL Editor.

-- One row per user who has signed in
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  trade_no text not null unique,          -- order number sent to the payment provider
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,                -- the amount of record
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  gateway_trade_no text,                  -- transaction ID on the provider's side
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_created_idx on public.orders (status, created_at);

-- Upgrades: one upgrade per order (order_id is unique),
-- so duplicate notifications never create a second row
create table if not exists public.membership_upgrades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Raw payment notifications, for troubleshooting and replaying
create table if not exists public.payment_notifications (
  id uuid primary key default gen_random_uuid(),
  trade_no text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create index if not exists payment_notifications_trade_no_idx on public.payment_notifications (trade_no);

-- Create a profile the first time a user signs in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security: users can only read their own rows.
-- All writes happen on the server with the service role key.
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.membership_upgrades enable row level security;
alter table public.payment_notifications enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "read own orders" on public.orders;
create policy "read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "read own upgrades" on public.membership_upgrades;
create policy "read own upgrades" on public.membership_upgrades
  for select using (auth.uid() = user_id);
-- payment_notifications has no policy: not readable from the browser at all
