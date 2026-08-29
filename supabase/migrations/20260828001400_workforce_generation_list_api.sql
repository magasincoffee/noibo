-- MAGASIN NOIBO — Workforce generation list API
-- Phase 7 support only: discover existing draft/review generations.
-- This phase does not publish or mutate official work_schedules.

create or replace function public.list_schedule_generations(
  p_store_id uuid default null,
  p_week_start date default null
)
returns table (
  id uuid,
  store_id uuid,
  store_code text,
  store_name text,
  week_start date,
  week_end date,
  algorithm_version text,
  status text,
  total_hours numeric,
  estimated_cost numeric,
  coverage_score numeric,
  skill_coverage_score numeric,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if v_role = 'STORE_MANAGER' and p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select sgr.id, sgr.store_id, s.code, s.name, sgr.week_start, sgr.week_end,
         sgr.algorithm_version, sgr.status, sgr.total_hours, sgr.estimated_cost,
         sgr.coverage_score, sgr.skill_coverage_score, sgr.created_by, sgr.created_at
    from public.schedule_generation_runs sgr
    left join public.stores s on s.id = sgr.store_id
   where (p_store_id is null or sgr.store_id = p_store_id)
     and (p_week_start is null or sgr.week_start = p_week_start)
     and public.can_access_store(sgr.store_id)
   order by sgr.week_start desc, sgr.created_at desc, sgr.id desc;
end;
$$;

grant execute on function public.list_schedule_generations(uuid, date) to authenticated;
revoke execute on function public.list_schedule_generations(uuid, date) from anon, public;
