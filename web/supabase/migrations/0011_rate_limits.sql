-- Shared, store-backed rate limiting. APPLIED 2026-08-10.
--
-- Vercel runs this app across many serverless instances, so an in-process
-- counter is not a limit -- it resets on every cold start and every new
-- instance. Counters therefore live in Postgres, which every instance
-- already talks to.
--
-- Identity is taken from auth.uid() INSIDE the function, never from an
-- argument. A caller cannot spend, or exhaust, another user's budget: the
-- only thing they control is which of *their own* scopes is charged.
create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

-- Never reachable through PostgREST: RLS on, zero policies, zero grants.
-- The SECURITY DEFINER function below is the only way in.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated, public;

create or replace function public.rate_limit_hit(
  p_scope           text,
  p_limit           integer,
  p_window_seconds  integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_scope text;
  v_key   text;
  v_start timestamptz;
  v_count integer;
begin
  -- Server-side identity only. No argument names the user.
  if v_uid is null then
    raise exception 'rate_limit_hit requires an authenticated caller'
      using errcode = '28000';
  end if;

  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  -- The scope is the only caller-supplied part of the key, so it is
  -- sanitised and bounded rather than trusted.
  v_scope := left(regexp_replace(lower(p_scope), '[^a-z0-9_-]', '', 'g'), 40);
  if v_scope = '' then
    raise exception 'invalid rate limit scope' using errcode = '22023';
  end if;

  v_key   := v_uid::text || ':' || v_scope;
  v_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  -- Atomic: concurrent requests in the same window serialise on the PK.
  insert into public.rate_limits as rl (key, window_start, count)
  values (v_key, v_start, 1)
  on conflict (key, window_start)
    do update set count = rl.count + 1
  returning rl.count into v_count;

  -- Opportunistic cleanup, ~1% of calls, so expired windows do not
  -- accumulate forever without needing a scheduled job.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 hour';
  end if;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_start + make_interval(secs => p_window_seconds);
end;
$$;

-- anon deliberately excluded: an unauthenticated caller has no identity to
-- charge, and the function refuses them anyway.
revoke all on function public.rate_limit_hit(text, integer, integer) from anon, public;
grant execute on function public.rate_limit_hit(text, integer, integer) to authenticated;
