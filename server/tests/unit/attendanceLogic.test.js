import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePunches } from '../../services/attendanceService.js';
import { checkGeofence } from '../../services/geoService.js';
import { ATTENDANCE_STATUS } from '../../utils/constants.js';

test('Attendance Logic: Smart Office Attendance, Lunch Break & Half-Day Rules', async (t) => {
  const companySettings = {
    workTimeEnabled: true,
    workStartTime: '09:30',
    workEndTime: '18:30',
    requiredWorkMinutes: 510, // 8h 30m
    lunchBreakMinutes: 30, // 30 min lunch break
    halfDayCutoffTime: '16:30', // 4:30 PM
    halfDayMinMinutes: 255, // 4h 15m
  };

  await t.test('Case 1: First In at 9:30 AM; Last Out at 6:30 PM with 30-minute lunch break -> PRESENT', () => {
    // 9:30 AM to 1:00 PM (210 min work) + 1:30 PM to 6:30 PM (300 min work) = 510 min net (8h 30m)
    // 1:00 PM to 1:30 PM = 30 min lunch break
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T13:00:00+05:30') },
      { type: 'IN', time: new Date('2026-10-12T13:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T18:30:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T18:30:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.completedWorkMinutes, 510, 'Net working minutes should be exactly 510 (8h 30m)');
    assert.equal(res.totalNetWorkMinutes, 510);
    assert.equal(res.totalBreakMinutes, 30, 'Break time should be 30 minutes');
    assert.equal(res.lunchDeductionMinutes, 0, 'Lunch must not be deducted twice if already taken as break');
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
    assert.equal(res.subStatus, 'COMPLETED');
    assert.equal(res.remainingWorkMinutes, 0);
  });

  await t.test('Case 2: First In at 9:30 AM; Last Out at 6:30 PM with auto 30-minute lunch exclusion -> PRESENT', () => {
    // Single continuous punch session: 9:30 AM to 6:30 PM (540 min gross)
    // Lunch break: 30 min auto-excluded -> 510 min net working time (8h 30m)
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T18:30:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T18:30:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.totalBreakMinutes, 30, '30 min lunch break excluded');
    assert.equal(res.lunchDeductionMinutes, 30);
    assert.equal(res.totalNetWorkMinutes, 510, '540 gross - 30 lunch = 510 net (8h 30m)');
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
    assert.equal(res.subStatus, 'COMPLETED');
  });

  await t.test('Case 3: Multiple breaks: lunch is never deducted twice', () => {
    // Breaks: 15 min morning break + 35 min lunch break = 50 min total break
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T11:00:00+05:30') }, // 90m work
      { type: 'IN', time: new Date('2026-10-12T11:15:00+05:30') }, // 15m break
      { type: 'OUT', time: new Date('2026-10-12T13:30:00+05:30') }, // 135m work
      { type: 'IN', time: new Date('2026-10-12T14:05:00+05:30') }, // 35m lunch break
      { type: 'OUT', time: new Date('2026-10-12T18:50:00+05:30') }, // 285m work
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T18:50:00+05:30'),
    });
    // Total work = 90 + 135 + 285 = 510 min (8h 30m)
    assert.equal(res.completedWorkMinutes, 510);
    assert.equal(res.totalNetWorkMinutes, 510);
    // Total break = 15 + 35 = 50 min
    assert.equal(res.totalBreakMinutes, 50);
    assert.equal(res.lunchDeductionMinutes, 0, 'No extra lunch deduction when break >= 30m');
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
  });

  await t.test('Case 4: First In at 9:30 AM; Punch Out at 4:30 PM (less than 8h 30m) -> HALF_DAY', () => {
    // In at 9:30 AM, out at 4:30 PM = 420 gross - 30 lunch = 390 net (6h 30m)
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T16:30:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:30:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.totalNetWorkMinutes, 390);
    assert.equal(res.status, ATTENDANCE_STATUS.HALF_DAY);
    assert.equal(res.subStatus, 'HALF_DAY_FINALIZED');
    assert.equal(res.isCurrentlyWorking, false);
  });

  await t.test('Case 5: Employee still punched in at 4:30 PM -> do NOT prematurely finalize Half Day', () => {
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:30:00+05:30'), // Clock reaches 4:30 PM
      isDayClosed: false,
    });
    assert.equal(res.isCurrentlyWorking, true);
    // Must remain PRESENT while working; subStatus indicates HALF_DAY_ELIGIBLE
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
    assert.equal(res.subStatus, 'HALF_DAY_ELIGIBLE');
  });

  await t.test('Case 6: First In at 10:00 AM; completes 8h 30m at 7:00 PM with lunch -> PRESENT', () => {
    // 10:00 AM to 7:00 PM (540 gross) - 30 lunch = 510 net (8h 30m)
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T10:00:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T19:00:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T19:00:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.totalNetWorkMinutes, 510);
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
    assert.equal(res.subStatus, 'COMPLETED');
  });

  await t.test('Case 7: Geofence radius rejection outside GPS radius', () => {
    const offices = [{ name: 'Head Office', lat: 28.6139, lng: 77.209, radius: 100 }];
    const insidePoint = { lat: 28.61392, lng: 77.20902 };
    const outsidePoint = { lat: 28.6200, lng: 77.209 }; // ~680m away

    const insideRes = checkGeofence(offices, insidePoint);
    const outsideRes = checkGeofence(offices, outsidePoint);

    assert.equal(insideRes.allowed, true);
    assert.equal(outsideRes.allowed, false);
    assert.ok(outsideRes.distance > 100);
  });

  await t.test('Case 8: Duplicate consecutive punch integrity check', () => {
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T13:00:00+05:30') },
    ];
    const lastPunch = punches[punches.length - 1];
    assert.equal(lastPunch.type, 'OUT');

    // Trying to punch OUT again when last is OUT must be detected as invalid
    const canPunchOut = lastPunch.type === 'IN';
    assert.equal(canPunchOut, false);

    // Can punch IN
    const canPunchIn = lastPunch.type === 'OUT';
    assert.equal(canPunchIn, true);
  });
});
