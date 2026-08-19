import { describe, expect, it } from 'vitest';
import {
  isDayLeaveReturnEligible,
  isDayLeaveReturnPhotoAvailable,
  dayLeaveReturnErrorText,
  turkeyTodayIso,
  type DayLeaveReturnMetadata
} from './dayLeaveReturn';

const metadata: DayLeaveReturnMetadata = {
  leave_request_id: 'leave-1',
  personnel_id: 'person-1',
  returned_at: '2026-08-19T09:00:00.000Z',
  photo_expires_at: '2026-08-22T09:00:00.000Z',
  photo_deleted_at: null
};

describe('günübirlik izin dönüş kuralları', () => {
  it('Türkiye saatine göre günü üretir', () => {
    expect(turkeyTodayIso(new Date('2026-08-18T21:30:00.000Z'))).toBe('2026-08-19');
  });

  it('yalnız bugünkü onaylı günübirlik izni dönüşe açar', () => {
    const leave = { id: 'leave-1', leave_type: 'day_leave', status: 'approved', start_date: '2026-08-19' };
    expect(isDayLeaveReturnEligible(leave, undefined, '2026-08-19')).toBe(true);
    expect(isDayLeaveReturnEligible({ ...leave, status: 'pending' }, undefined, '2026-08-19')).toBe(false);
    expect(isDayLeaveReturnEligible({ ...leave, leave_type: 'annual_leave' }, undefined, '2026-08-19')).toBe(false);
    expect(isDayLeaveReturnEligible({ ...leave, start_date: '2026-08-20' }, undefined, '2026-08-19')).toBe(false);
    expect(isDayLeaveReturnEligible(leave, metadata, '2026-08-19')).toBe(false);
  });

  it('fotoğrafı 72 saat dolduğu anda erişime kapatır', () => {
    expect(isDayLeaveReturnPhotoAvailable(metadata, new Date('2026-08-22T08:59:59.999Z'))).toBe(true);
    expect(isDayLeaveReturnPhotoAvailable(metadata, new Date('2026-08-22T09:00:00.000Z'))).toBe(false);
    expect(isDayLeaveReturnPhotoAvailable({ ...metadata, photo_deleted_at: '2026-08-22T09:00:00.000Z' }, new Date('2026-08-21T09:00:00.000Z'))).toBe(false);
  });

  it('kamera izin hatasını anlaşılır biçimde gösterir', () => {
    expect(dayLeaveReturnErrorText({ name: 'NotAllowedError', message: 'Permission denied' }))
      .toContain('Kamera izni verilmedi');
  });
});
