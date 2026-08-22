-- PBYS: Tim Komutanı görünürlükleri + yıllık izin 5 gün yönetim bildirimi
-- 2026-08-22

-- Tim Komutanı tüm personel yoklamasını ve tüm izin taleplerini okuyabilsin.
-- Onaylama yetkisi verilmez.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('attendance.view','personnel.view','leave.view')
where r.code = 'team_commander'
on conflict do nothing;

-- Önceki "kendi timi için izin görüşü" modeli kaldırıldı.
-- Yeni modelde Tim Komutanı talepleri yalnızca görüntüler.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.code = 'team_commander'
  and p.code = 'leave.review_own_team';

-- Personelin mevcut 1 ve 3 günlük yıllık izin hatırlatmalarını korur.
-- Ek olarak yıllık izin başlamadan 5 gün önce Admin + Karakol Komutanına bildirim üretir.
create or replace function private.enqueue_annual_leave_reminders(
  p_today date default ((now() at time zone 'Europe/Istanbul'))::date
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_employee_inserted integer := 0;
  v_manager_inserted integer := 0;
begin
  insert into public.notifications (
    recipient_personnel_id,
    kind,
    title,
    body,
    action_path,
    leave_request_id,
    created_by,
    event_key
  )
  select
    request.personnel_id,
    'annual_leave_reminder',
    case request.start_date - p_today
      when 1 then 'Yıllık izniniz yarın başlıyor'
      else 'Yıllık izniniz 3 gün sonra başlıyor'
    end,
    format(
      '%s – %s · %s gün yıllık izin.',
      to_char(request.start_date, 'DD.MM.YYYY'),
      to_char(request.end_date, 'DD.MM.YYYY'),
      request.day_count
    ),
    '/benim-izinlerim',
    request.id,
    null,
    'annual-reminder:' || request.id::text || ':' || (request.start_date - p_today)::text
  from public.leave_requests request
  where request.status = 'approved'
    and request.leave_type = 'annual_leave'
    and request.start_date in (p_today + 1, p_today + 3)
  on conflict (event_key) do nothing;

  get diagnostics v_employee_inserted = row_count;

  insert into public.notifications (
    recipient_personnel_id,
    kind,
    title,
    body,
    action_path,
    leave_request_id,
    created_by,
    event_key
  )
  select
    manager.personnel_id,
    'annual_leave_reminder',
    'Yıllık izin 5 gün sonra başlıyor',
    format(
      '%s personelinin %s – %s tarihleri arasındaki %s günlük yıllık izni 5 gün sonra başlayacaktır.',
      person.full_name,
      to_char(request.start_date, 'DD.MM.YYYY'),
      to_char(request.end_date, 'DD.MM.YYYY'),
      request.day_count
    ),
    '/onaylanan-izinler',
    request.id,
    null,
    'manager:annual-leave-5d:' || request.id::text || ':' || manager.personnel_id::text
  from public.leave_requests request
  join public.personnel person on person.id = request.personnel_id
  cross join lateral private.manager_notification_recipients() manager
  where request.status = 'approved'
    and request.leave_type = 'annual_leave'
    and request.start_date = p_today + 5
  on conflict (event_key) do nothing;

  get diagnostics v_manager_inserted = row_count;
  return v_employee_inserted + v_manager_inserted;
end;
$function$;

-- Her izin onayında aktif Tim Komutanlarına salt-okunur bildirim gönderir.
create or replace function private.notify_team_commanders_on_leave_approval()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_person_name text;
  v_leave_label text;
begin
  if new.status <> 'approved' or old.status = 'approved' then
    return new;
  end if;

  select p.full_name
  into v_person_name
  from public.personnel p
  where p.id = new.personnel_id;

  v_leave_label := case new.leave_type
    when 'annual_leave' then 'Yıllık izin'
    when 'day_leave' then 'Günübirlik izin'
    when 'excuse_leave' then 'Mazeret izni'
    when 'road_leave' then 'Yol izni'
    when 'medical' then 'Rapor / istirahat'
    when 'duty' then 'Görev'
    when 'temporary_duty' then 'Geçici görev'
    when 'course' then 'Kurs / eğitim'
    when 'referral' then 'Sevk'
    else 'İzin'
  end;

  insert into public.notifications (
    recipient_personnel_id,
    kind,
    title,
    body,
    action_path,
    leave_request_id,
    created_by,
    event_key
  )
  select distinct
    ua.personnel_id,
    'leave_approved',
    'Personel izni onaylandı',
    format(
      '%s · %s · %s – %s · %s gün. İzin Karakol Komutanı/Admin tarafından onaylandı.',
      coalesce(v_person_name, 'Personel'),
      v_leave_label,
      to_char(new.start_date, 'DD.MM.YYYY'),
      to_char(new.end_date, 'DD.MM.YYYY'),
      new.day_count
    ),
    '/izin-onaylari',
    new.id,
    new.decided_by,
    'team-commander:leave-approved:' || new.id::text || ':' || ua.personnel_id::text
  from public.user_accounts ua
  join public.account_roles ar on ar.auth_user_id = ua.auth_user_id
  join public.roles r on r.id = ar.role_id
  join public.personnel p on p.id = ua.personnel_id
  where r.code = 'team_commander'
    and ua.approval_status = 'approved'
    and ua.personnel_id is not null
    and p.active = true
    and ua.personnel_id <> new.personnel_id
  on conflict (event_key) do nothing;

  return new;
end;
$function$;

revoke all on function private.notify_team_commanders_on_leave_approval() from public, anon, authenticated;

drop trigger if exists trg_notify_team_commanders_on_leave_approval on public.leave_requests;
create trigger trg_notify_team_commanders_on_leave_approval
after update of status on public.leave_requests
for each row
when (old.status is distinct from new.status and new.status = 'approved')
execute function private.notify_team_commanders_on_leave_approval();
