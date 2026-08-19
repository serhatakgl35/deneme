set lock_timeout = '5s';
set statement_timeout = '30s';

create table if not exists public.day_leave_returns (
  leave_request_id uuid primary key references public.leave_requests(id) on delete cascade,
  personnel_id uuid not null references public.personnel(id) on delete cascade,
  returned_at timestamptz not null default statement_timestamp(),
  photo_expires_at timestamptz not null,
  photo_deleted_at timestamptz,
  photo_mime_type text,
  photo_bytes bytea,
  created_by uuid references auth.users(id) on delete set null,
  constraint day_leave_returns_photo_mime_check
    check (photo_mime_type is null or photo_mime_type = 'image/jpeg'),
  constraint day_leave_returns_photo_expiry_check
    check (photo_expires_at >= returned_at),
  constraint day_leave_returns_photo_deletion_check
    check (
      (photo_bytes is not null and photo_mime_type is not null and photo_deleted_at is null)
      or
      (photo_bytes is null and photo_mime_type is null and photo_deleted_at is not null)
    )
);

comment on table public.day_leave_returns is
  'Onaylı günübirlik izinlerin fotoğraflı dönüş kaydı. Fotoğraf 72 saat sonra silinir; dönüş zamanı kalır.';
comment on column public.day_leave_returns.returned_at is
  'Telefon saatinden bağımsız, veritabanı sunucusunun kaydettiği dönüş zamanı.';
comment on column public.day_leave_returns.photo_expires_at is
  'Fotoğrafın erişime kapanacağı ve temizlenmeye hak kazanacağı zaman.';

create index if not exists idx_day_leave_returns_personnel_time
  on public.day_leave_returns (personnel_id, returned_at desc);
create index if not exists idx_day_leave_returns_created_by
  on public.day_leave_returns (created_by)
  where created_by is not null;
create index if not exists idx_day_leave_returns_expiry_pending
  on public.day_leave_returns (photo_expires_at)
  where photo_bytes is not null;

alter table public.day_leave_returns enable row level security;

revoke all on table public.day_leave_returns from public, anon, authenticated;
grant select (
  leave_request_id,
  personnel_id,
  returned_at,
  photo_expires_at,
  photo_deleted_at
) on table public.day_leave_returns to authenticated;
grant all on table public.day_leave_returns to service_role;

drop policy if exists day_leave_returns_read_authorized on public.day_leave_returns;
create policy day_leave_returns_read_authorized
on public.day_leave_returns
for select
to authenticated
using (
  personnel_id = (select private.current_personnel_id())
  or (select private.has_permission('leave.approve'))
  or (select private.has_permission('leave.manage'))
);

create or replace function public.submit_day_leave_return(
  p_leave_request_id uuid,
  p_photo_base64 text,
  p_photo_mime_type text
)
returns table (
  returned_at timestamptz,
  photo_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_personnel_id uuid := private.current_personnel_id();
  v_leave public.leave_requests%rowtype;
  v_photo bytea;
  v_returned_at timestamptz := statement_timestamp();
  v_photo_expires_at timestamptz;
  v_turkey_today date := timezone('Europe/Istanbul', statement_timestamp())::date;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if v_personnel_id is null then
    raise exception 'Onaylı personel hesabı bulunamadı';
  end if;

  select lr.*
  into v_leave
  from public.leave_requests lr
  where lr.id = p_leave_request_id
  for update;

  if not found or v_leave.personnel_id <> v_personnel_id then
    raise exception 'Günübirlik izin kaydı bulunamadı';
  end if;

  if v_leave.leave_type <> 'day_leave' or v_leave.status <> 'approved' then
    raise exception 'Yalnızca onaylı günübirlik izin için dönüş bildirilebilir';
  end if;

  if v_leave.start_date <> v_turkey_today then
    raise exception 'Dönüş bildirimi yalnızca günübirlik izin tarihinde yapılabilir';
  end if;

  if exists (
    select 1
    from public.day_leave_returns dlr
    where dlr.leave_request_id = p_leave_request_id
  ) then
    raise exception 'Bu izin için dönüş daha önce bildirildi';
  end if;

  if p_photo_mime_type is distinct from 'image/jpeg' then
    raise exception 'Fotoğraf biçimi desteklenmiyor';
  end if;

  if p_photo_base64 is null or length(p_photo_base64) < 100 then
    raise exception 'Fotoğraf verisi eksik';
  end if;

  if length(p_photo_base64) > 950000 then
    raise exception 'Fotoğraf boyutu çok büyük';
  end if;

  begin
    v_photo := decode(p_photo_base64, 'base64');
  exception when others then
    raise exception 'Fotoğraf verisi okunamadı';
  end;

  if octet_length(v_photo) < 5000 then
    raise exception 'Fotoğraf verisi geçersiz';
  end if;

  if get_byte(v_photo, 0) <> 255 or get_byte(v_photo, 1) <> 216 then
    raise exception 'Fotoğraf JPEG biçiminde değil';
  end if;

  if octet_length(v_photo) > 700000 then
    raise exception 'Fotoğraf 700 KB sınırını aşıyor';
  end if;

  v_photo_expires_at := v_returned_at + interval '3 days';

  insert into public.day_leave_returns (
    leave_request_id,
    personnel_id,
    returned_at,
    photo_expires_at,
    photo_mime_type,
    photo_bytes,
    created_by
  ) values (
    p_leave_request_id,
    v_personnel_id,
    v_returned_at,
    v_photo_expires_at,
    p_photo_mime_type,
    v_photo,
    auth.uid()
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    auth.uid(),
    'day_leave.return_submitted',
    'leave_request',
    p_leave_request_id::text,
    jsonb_build_object(
      'returned_at', v_returned_at,
      'photo_expires_at', v_photo_expires_at
    )
  );

  return query select v_returned_at, v_photo_expires_at;
end;
$$;

revoke all on function public.submit_day_leave_return(uuid, text, text) from public, anon;
grant execute on function public.submit_day_leave_return(uuid, text, text) to authenticated, service_role;

create or replace function public.get_day_leave_return_photo(
  p_leave_request_id uuid
)
returns table (
  photo_base64 text,
  photo_mime_type text,
  returned_at timestamptz,
  photo_expires_at timestamptz,
  photo_deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_personnel_id uuid := private.current_personnel_id();
  v_return public.day_leave_returns%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  select dlr.*
  into v_return
  from public.day_leave_returns dlr
  where dlr.leave_request_id = p_leave_request_id;

  if not found then
    return;
  end if;

  if not (
    v_return.personnel_id = v_personnel_id
    or private.has_permission('leave.approve')
    or private.has_permission('leave.manage')
  ) then
    raise exception 'Bu dönüş fotoğrafını görüntüleme yetkiniz yok';
  end if;

  return query
  select
    case
      when v_return.photo_deleted_at is null
        and v_return.photo_expires_at > statement_timestamp()
        and v_return.photo_bytes is not null
      then encode(v_return.photo_bytes, 'base64')
      else null
    end,
    case
      when v_return.photo_deleted_at is null
        and v_return.photo_expires_at > statement_timestamp()
      then v_return.photo_mime_type
      else null
    end,
    v_return.returned_at,
    v_return.photo_expires_at,
    v_return.photo_deleted_at;
end;
$$;

revoke all on function public.get_day_leave_return_photo(uuid) from public, anon;
grant execute on function public.get_day_leave_return_photo(uuid) to authenticated, service_role;

create or replace function private.purge_expired_day_leave_return_photos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_count integer := 0;
begin
  update public.day_leave_returns
  set
    photo_bytes = null,
    photo_mime_type = null,
    photo_deleted_at = statement_timestamp()
  where photo_bytes is not null
    and photo_expires_at <= statement_timestamp();

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function private.purge_expired_day_leave_return_photos() from public, anon, authenticated;

select cron.schedule(
  'pbys-day-leave-return-photo-purge',
  '*/10 * * * *',
  $job$select private.purge_expired_day_leave_return_photos();$job$
);
