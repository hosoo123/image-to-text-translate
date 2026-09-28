create table if not exists public.user_daily_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  analyze_count integer not null default 0 check (analyze_count >= 0),
  translate_count integer not null default 0 check (translate_count >= 0),
  primary key (user_id, usage_date)
);

create table if not exists public.user_ai_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_limit integer not null check (daily_limit between 0 and 1000),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.user_daily_ai_usage enable row level security;
alter table public.user_ai_limits enable row level security;

drop policy if exists "Users can read their own daily AI usage" on public.user_daily_ai_usage;
create policy "Users can read their own daily AI usage"
  on public.user_daily_ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_daily_ai_usage from anon, authenticated;
grant select on public.user_daily_ai_usage to authenticated;
revoke all on public.user_ai_limits from anon, authenticated;

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
  v_limit integer;
  v_used integer;
  v_today date := (now() at time zone 'Asia/Ulaanbaatar')::date;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_kind not in ('analyze', 'translate') then
    raise exception 'Invalid AI usage kind';
  end if;

  select limits.daily_limit into v_limit
  from public.user_ai_limits as limits
  where limits.user_id = v_user_id;
  if v_limit is null then
    v_limit := greatest(0, least(p_default_limit, 1000));
  end if;
  if v_limit = 0 then
    return query select false, 0, v_limit;
    return;
  end if;

  if p_kind = 'analyze' then
    insert into public.user_daily_ai_usage (user_id, usage_date, analyze_count)
    values (v_user_id, v_today, 1)
    on conflict (user_id, usage_date) do update
      set analyze_count = public.user_daily_ai_usage.analyze_count + 1
      where public.user_daily_ai_usage.analyze_count + public.user_daily_ai_usage.translate_count < v_limit
    returning analyze_count into v_used;
  else
    insert into public.user_daily_ai_usage (user_id, usage_date, translate_count)
    values (v_user_id, v_today, 1)
    on conflict (user_id, usage_date) do update
      set translate_count = public.user_daily_ai_usage.translate_count + 1
      where public.user_daily_ai_usage.analyze_count + public.user_daily_ai_usage.translate_count < v_limit
    returning translate_count into v_used;
  end if;

  if v_used is null then
    if p_kind = 'analyze' then
      select usage.analyze_count + usage.translate_count into v_used from public.user_daily_ai_usage as usage
      where usage.user_id = v_user_id and usage.usage_date = v_today;
    else
      select usage.analyze_count + usage.translate_count into v_used from public.user_daily_ai_usage as usage
      where usage.user_id = v_user_id and usage.usage_date = v_today;
    end if;
    return query select false, coalesce(v_used, 0), v_limit;
  else
    return query select true, v_used, v_limit;
  end if;
end;
$$;

revoke execute on function public.consume_daily_ai_usage(text, integer) from public, anon;
grant execute on function public.consume_daily_ai_usage(text, integer) to authenticated;

create or replace function public.get_my_daily_ai_usage(p_default_limit integer)
returns table (analyze_count integer, translate_count integer, daily_limit integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(usage.analyze_count, 0),
    coalesce(usage.translate_count, 0),
    coalesce(limits.daily_limit, greatest(0, least(p_default_limit, 1000)))
  from (select auth.uid() as user_id) as current_user
  left join public.user_daily_ai_usage as usage
    on usage.user_id = current_user.user_id
    and usage.usage_date = (now() at time zone 'Asia/Ulaanbaatar')::date
  left join public.user_ai_limits as limits
    on limits.user_id = current_user.user_id
  where current_user.user_id is not null;
$$;

revoke execute on function public.get_my_daily_ai_usage(integer) from public, anon;
grant execute on function public.get_my_daily_ai_usage(integer) to authenticated;
