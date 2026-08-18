create or replace function public.get_approved_leave_records()
returns table (
  id uuid,
  legacy_id text,
  personnel_id uuid,
  personnel_name text,
  personnel_rank_title text,
  leave_type text,
  start_date date,
  end_date date,
  day_count integer,
  city text,
  note text,
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if not private.has_permission('leave.approve') then
    raise exception 'Onaylanan izinleri görüntüleme yetkiniz yok';
  end if;

  return query
  select
    lr.id,
    lr.legacy_id,
    lr.personnel_id,
    requester.full_name,
    requester.rank_title,
    lr.leave_type,
    lr.start_date,
    lr.end_date,
    lr.day_count,
    lr.city,
    lr.note,
    lr.decided_by,
    approver.full_name,
    lr.decided_at,
    lr.created_at
  from public.leave_requests lr
  join public.personnel requester on requester.id = lr.personnel_id
  left join public.user_accounts approver_account on approver_account.auth_user_id = lr.decided_by
  left join public.personnel approver on approver.id = approver_account.personnel_id
  where lr.status = 'approved'
  order by coalesce(lr.decided_at, lr.created_at) desc, lr.start_date desc, requester.full_name;
end;
$$;

revoke all on function public.get_approved_leave_records() from public, anon, authenticated;
grant execute on function public.get_approved_leave_records() to authenticated;

comment on function public.get_approved_leave_records() is
  'Karakol Komutanı ve Admin için onaylanan izinleri, talep sahibi ve onaylayan adıyla döndürür.';
