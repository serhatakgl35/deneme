export const MAX_DAY_LEAVE_RETURN_PHOTO_BYTES = 700_000;

export type DayLeaveReturnMetadata = {
  leave_request_id: string;
  personnel_id: string;
  returned_at: string;
  photo_expires_at: string;
  photo_deleted_at: string | null;
};

export type DayLeaveReturnCandidate = {
  id: string;
  leave_type: string;
  status: string;
  start_date: string;
};

export function turkeyTodayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isDayLeaveReturnEligible(
  leave: DayLeaveReturnCandidate,
  existingReturn: DayLeaveReturnMetadata | undefined,
  today = turkeyTodayIso()
) {
  return leave.leave_type === 'day_leave'
    && leave.status === 'approved'
    && leave.start_date === today
    && !existingReturn;
}

export function isDayLeaveReturnPhotoAvailable(
  metadata: DayLeaveReturnMetadata,
  now = new Date()
) {
  return !metadata.photo_deleted_at && new Date(metadata.photo_expires_at).getTime() > now.getTime();
}

export function formatTurkeyDateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function dayLeaveReturnErrorText(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const cameraErrorNames: Record<string, string> = {
      NotAllowedError: 'Kamera izni verilmedi. Tarayıcı ayarlarından kamera iznini açıp tekrar deneyin.',
      NotFoundError: 'Bu cihazda kullanılabilir kamera bulunamadı.',
      NotReadableError: 'Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamayı kapatıp tekrar deneyin.',
      OverconstrainedError: 'Kamera uygun görüntü ayarlarıyla açılamadı.',
      SecurityError: 'Tarayıcı güvenlik ayarları kameraya erişimi engelledi.',
      AbortError: 'Kamera işlemi yarıda kaldı. Tekrar deneyin.'
    };
    const name = 'name' in error ? (error as { name?: unknown }).name : undefined;
    if (typeof name === 'string' && cameraErrorNames[name]) return cameraErrorNames[name];
    const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
    if (typeof message === 'string') return message;
  }
  return 'İşlem tamamlanamadı.';
}
