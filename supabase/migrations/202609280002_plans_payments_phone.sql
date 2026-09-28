-- Paid plan state, Wire payment orders, optional Verify.MN phone verification,
-- and a monthly AI request cap for paid subscribers.

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('month_1', 'month_3', 'month_6')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('month_1', 'month_3', 'month_6')),
  months integer not null check (months in (1, 3, 6)),
  price_mnt integer not null check (price_mnt > 0),
  amount_minor integer not null check (amount_minor > 0),
  payment_intent_id text unique,
  checkout_url text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);

create table if not exists public.wire_webhook_events (
  event_id text primary key,
  payment_intent_id text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.user_phone_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  verified_at timestamptz not null default now()
);

create table if not exists public.phone_verification_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pending_phone_signups (
  session_id text primary key,
  phone text not null,
  purpose text not null default 'signup' check (purpose in ('signup', 'password_reset')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.pending_phone_signups
  add column if not exists purpose text not null default 'signup'
  check (purpose in ('signup', 'password_reset'));

create index if not exists phone_verification_sessions_user_idx
  on public.phone_verification_sessions (user_id, created_at desc);

create table if not exists public.user_monthly_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, month_start)
);

alter table public.user_subscriptions enable row level security;
alter table public.payment_orders enable row level security;
alter table public.wire_webhook_events enable row level security;
alter table public.user_phone_verifications enable row level security;
alter table public.phone_verification_sessions enable row level security;
alter table public.pending_phone_signups enable row level security;
alter table public.user_monthly_ai_usage enable row level security;

drop policy if exists "Users can read their own subscription" on public.user_subscriptions;
create policy "Users can read their own subscription" on public.user_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can read their own phone verification" on public.user_phone_verifications;
create policy "Users can read their own phone verification" on public.user_phone_verifications
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can read their own phone verification sessions" on public.phone_verification_sessions;
create policy "Users can read their own phone verification sessions" on public.phone_verification_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own phone verification sessions" on public.phone_verification_sessions;
create policy "Users can create their own phone verification sessions" on public.phone_verification_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can remove their own phone verification sessions" on public.phone_verification_sessions;
create policy "Users can remove their own phone verification sessions" on public.phone_verification_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can register their own verified phone" on public.user_phone_verifications;
create policy "Users can register their own verified phone" on public.user_phone_verifications
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own verified phone" on public.user_phone_verifications;
create policy "Users can update their own verified phone" on public.user_phone_verifications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can read their own monthly usage" on public.user_monthly_ai_usage;
create policy "Users can read their own monthly usage" on public.user_monthly_ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_subscriptions, public.payment_orders,
  public.wire_webhook_events, public.user_phone_verifications,
  public.phone_verification_sessions, public.pending_phone_signups, public.user_monthly_ai_usage
  from anon, authenticated;
grant select on public.user_subscriptions, public.user_phone_verifications,
  public.phone_verification_sessions, public.user_monthly_ai_usage to authenticated;

create or replace function public.consume_daily_ai_usage(
  p_kind text,
  p_default_limit integer
)
returns table (allowed boolean, used integer, daily_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_limit integer;
  v_used integer;
  v_monthly_used integer;
  v_monthly_limit integer := 2000;
  v_month_start date := date_trunc('month', now() at time zone 'Asia/Ulaanbaatar')::date;
  v_today date := (now() at time zone 'Asia/Ulaanbaatar')::date;
  v_is_paid boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_kind not in ('analyze', 'translate') then raise exception 'Invalid AI usage kind'; end if;

  -- Serialize each user's usage updates so concurrent requests cannot pass a cap.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  select subscription.expires_at > now() into v_is_paid
  from public.user_subscriptions as subscription where subscription.user_id = v_user_id;
  v_is_paid := coalesce(v_is_paid, false);

  select limits.daily_limit into v_daily_limit
  from public.user_ai_limits as limits where limits.user_id = v_user_id;
  if v_daily_limit is null then
    v_daily_limit := case when v_is_paid then 100 else greatest(0, least(p_default_limit, 1000)) end;
  elsif v_is_paid then
    v_daily_limit := least(v_daily_limit, 100);
  end if;

  select coalesce(usage.analyze_count + usage.translate_count, 0) into v_used
  from public.user_daily_ai_usage as usage
  where usage.user_id = v_user_id and usage.usage_date = v_today;
  v_used := coalesce(v_used, 0);

  if v_is_paid then
    select coalesce(usage.request_count, 0) into v_monthly_used
    from public.user_monthly_ai_usage as usage
    where usage.user_id = v_user_id and usage.month_start = v_month_start;
    v_monthly_used := coalesce(v_monthly_used, 0);
    if v_monthly_used >= v_monthly_limit or v_used >= v_daily_limit then
      return query select false, v_used, v_daily_limit;
      return;
    end if;
    insert into public.user_monthly_ai_usage (user_id, month_start, request_count)
      values (v_user_id, v_month_start, 1)
      on conflict (user_id, month_start) do update
        set request_count = public.user_monthly_ai_usage.request_count + 1;
  elsif v_used >= v_daily_limit then
    return query select false, v_used, v_daily_limit;
    return;
  end if;

  if p_kind = 'analyze' then
    insert into public.user_daily_ai_usage (user_id, usage_date, analyze_count)
      values (v_user_id, v_today, 1)
      on conflict (user_id, usage_date) do update
        set analyze_count = public.user_daily_ai_usage.analyze_count + 1;
  else
    insert into public.user_daily_ai_usage (user_id, usage_date, translate_count)
      values (v_user_id, v_today, 1)
      on conflict (user_id, usage_date) do update
        set translate_count = public.user_daily_ai_usage.translate_count + 1;
  end if;
  return query select true, v_used + 1, v_daily_limit;
end;
$$;

create or replace function public.get_my_plan_usage(p_default_limit integer)
returns table (
  analyze_count integer,
  translate_count integer,
  daily_limit integer,
  plan_code text,
  expires_at timestamptz,
  monthly_used integer,
  monthly_limit integer
)
language sql stable security definer set search_path = ''
as $$
  select coalesce(daily.analyze_count, 0), coalesce(daily.translate_count, 0),
    case when subscription.expires_at > now()
      then least(coalesce(limits.daily_limit, 100), 100)
      else coalesce(limits.daily_limit, greatest(0, least(p_default_limit, 1000))) end,
    case when subscription.expires_at > now() then subscription.plan_code else 'free' end,
    case when subscription.expires_at > now() then subscription.expires_at else null end,
    case when subscription.expires_at > now() then coalesce(monthly.request_count, 0) else 0 end,
    case when subscription.expires_at > now() then 2000 else null end
  from (select auth.uid() as user_id) as auth_context
  left join public.user_daily_ai_usage as daily on daily.user_id = auth_context.user_id
    and daily.usage_date = (now() at time zone 'Asia/Ulaanbaatar')::date
  left join public.user_ai_limits as limits on limits.user_id = auth_context.user_id
  left join public.user_subscriptions as subscription on subscription.user_id = auth_context.user_id
  left join public.user_monthly_ai_usage as monthly on monthly.user_id = auth_context.user_id
    and monthly.month_start = date_trunc('month', now() at time zone 'Asia/Ulaanbaatar')::date
  where auth_context.user_id is not null;
$$;

revoke execute on function public.get_my_plan_usage(integer) from public, anon;
grant execute on function public.get_my_plan_usage(integer) to authenticated;

create or replace function public.fulfill_wire_payment(
  p_event_id text,
  p_payment_intent_id text,
  p_amount_minor integer
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  select * into v_order from public.payment_orders
    where payment_intent_id = p_payment_intent_id for update;
  if not found or v_order.amount_minor <> p_amount_minor then
    raise exception 'Payment order or amount mismatch';
  end if;
  if v_order.status = 'paid' then return true; end if;
  insert into public.wire_webhook_events (event_id, payment_intent_id)
    values (p_event_id, p_payment_intent_id) on conflict (event_id) do nothing;
  if not found then return true; end if;
  update public.payment_orders set status = 'paid', paid_at = now() where id = v_order.id;
  insert into public.user_subscriptions (user_id, plan_code, expires_at, updated_at)
    values (v_order.user_id, v_order.plan_code,
      (now() + pg_catalog.make_interval(months => v_order.months)), now())
    on conflict (user_id) do update set
      plan_code = excluded.plan_code,
      expires_at = greatest(public.user_subscriptions.expires_at, now())
        + pg_catalog.make_interval(months => v_order.months),
      updated_at = now();
  return true;
end;
$$;

revoke execute on function public.fulfill_wire_payment(text, text, integer) from public, anon, authenticated;
grant execute on function public.fulfill_wire_payment(text, text, integer) to service_role;
