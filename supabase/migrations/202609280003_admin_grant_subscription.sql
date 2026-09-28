create table if not exists public.admin_subscription_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id),
  months integer not null default 1 check (months = 1),
  created_at timestamptz not null default now()
);

alter table public.admin_subscription_grants enable row level security;
revoke all on public.admin_subscription_grants from anon, authenticated;
grant all on public.admin_subscription_grants to service_role;

create or replace function public.grant_admin_subscription_month(
  p_user_id uuid,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires_at timestamptz;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Target user not found';
  end if;

  insert into public.user_subscriptions (user_id, plan_code, expires_at, updated_at)
  values (p_user_id, 'month_1', now() + interval '1 month', now())
  on conflict (user_id) do update set
    plan_code = 'month_1',
    expires_at = greatest(public.user_subscriptions.expires_at, now()) + interval '1 month',
    updated_at = now()
  returning expires_at into v_expires_at;

  insert into public.admin_subscription_grants (user_id, granted_by, months)
  values (p_user_id, p_admin_user_id, 1);

  return jsonb_build_object('expires_at', v_expires_at);
end;
$$;

revoke execute on function public.grant_admin_subscription_month(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_admin_subscription_month(uuid, uuid) to service_role;
