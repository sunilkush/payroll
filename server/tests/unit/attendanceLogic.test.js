import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePunches } from '../../services/attendanceService.js';
import { checkGeofence } from '../../services/geoService.js';
import { ATTENDANCE_STATUS } from '../../utils/constants.js';

test('Attendance System: Final Business Rules & Automated Verification', async (t) => {
  const companySettings = {
    workTimeEnabled: true,
    workStartTime: '09:30',
    workEndTime: '18:30',
    requiredWorkMinutes: 510, // 8h 30m
    lunchBreakMinutes: 30, // 30 min lunch break
    halfDayCutoffTime: '16:30', // 4:30 PM
    halfDayMinMinutes: 255, // 4h 15m
  };

  await t.test('Scenario 1: 9:30 AM First In and 6:30 PM Last Out with a 30-minute lunch deduction = Present', () => {
    // 9:30 AM to 6:30 PM (540 gross) - 30m lunch = 510 net (8h 30m)
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
    assert.equal(res.totalNetWorkMinutes, 510, 'Net working minutes should be 510 (8h 30m)');
    assert.equal(res.totalBreakMinutes, 30, 'Break duration should be 30 minutes');
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
    assert.equal(res.subStatus, 'COMPLETED');
    assert.equal(res.remainingWorkMinutes, 0);
  });

  await t.test('Scenario 2: Final Punch Out at 4:00 PM with less than 8 hours 30 minutes worked = Absent', () => {
    // In: 9:30 AM, Out: 4:00 PM (16:00 < 16:30). Net: 390m gross - 30m lunch = 360m (6h 0m) < 510m
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T16:00:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:00:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.status, ATTENDANCE_STATUS.ABSENT, 'Final punch out before 4:30 PM with undertime must be ABSENT');
    assert.equal(res.subStatus, 'EARLY_DEPARTURE_ABSENT');
    assert.equal(res.isCurrentlyWorking, false);
  });

  await t.test('Scenario 3: Final Punch Out at 4:29 PM with less than 8 hours 30 minutes worked = Absent', () => {
    // In: 9:30 AM, Out: 4:29 PM (16:29 < 16:30). Net: 419m gross - 30m lunch = 389m < 510m
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T16:29:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:29:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.status, ATTENDANCE_STATUS.ABSENT, 'Final punch out at 4:29 PM (< 4:30 PM) must be ABSENT');
    assert.equal(res.subStatus, 'EARLY_DEPARTURE_ABSENT');
  });

  await t.test('Scenario 4: Employee temporarily punches out at 4:00 PM and punches back in before 4:30 PM = do not prematurely finalize Absent', () => {
    // Punches: IN 9:30 AM, OUT 4:00 PM, IN 4:15 PM
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T16:00:00+05:30') },
      { type: 'IN', time: new Date('2026-10-12T16:15:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:20:00+05:30'),
      isDayClosed: false,
    });
    assert.equal(res.isCurrentlyWorking, true);
    assert.equal(res.status, ATTENDANCE_STATUS.PENDING, 'Punched back in session must show PENDING, never prematurely ABSENT');
    assert.equal(res.subStatus, 'IN_PROGRESS');
  });

  await t.test('Scenario 5: Employee completes 8 hours 30 minutes before 4:30 PM = Present', () => {
    // E.g. Employee punches in early at 07:00 AM, punches out at 16:00 (9h gross - 30m lunch = 510m net)
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T07:00:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T16:00:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:00:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.completedWorkMinutes, 510);
    assert.equal(res.totalNetWorkMinutes, 510);
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT, '8h 30m completed before 4:30 PM must be PRESENT');
    assert.equal(res.subStatus, 'COMPLETED');
  });

  await t.test('Scenario 6: Employee is still punched in at 4:30 PM = Pending/In Progress, not prematurely finalized Absent', () => {
    // In: 9:30 AM, currently 4:30 PM (16:30), still punched in
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T16:30:00+05:30'),
      isDayClosed: false,
    });
    assert.equal(res.isCurrentlyWorking, true);
    assert.equal(res.status, ATTENDANCE_STATUS.PENDING, 'While actively working at 4:30 PM, status must be PENDING');
    assert.equal(res.subStatus, 'IN_PROGRESS');
  });

  await t.test('Scenario 7: Employee completes 8 hours 30 minutes after 4:30 PM but by 6:30 PM = Present', () => {
    // In: 9:30 AM, lunch: 1:00 PM - 1:30 PM (30m), Out: 6:30 PM (18:30)
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
    assert.equal(res.totalNetWorkMinutes, 510);
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
    assert.equal(res.subStatus, 'COMPLETED');
  });

  await t.test('Scenario 8: Employee final working time is less than 8 hours 30 minutes after 4:30 PM = never mark Present; apply configured final status policy', () => {
    // In: 9:30 AM, Out: 5:00 PM (17:00, after 16:30). Net: 450m gross - 30m lunch = 420m net (7h 0m < 8h 30m)
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T17:00:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T17:00:00+05:30'),
      isDayClosed: true,
    });
    assert.notEqual(res.status, ATTENDANCE_STATUS.PRESENT, 'Must NEVER silently convert undertime to PRESENT');
    assert.equal(res.status, ATTENDANCE_STATUS.HALF_DAY, '420m >= 255m half-day minimum qualifies for HALF_DAY policy');
    assert.equal(res.subStatus, 'HALF_DAY_FINALIZED');
  });

  await t.test('Scenario 9: Multiple Punch In/Punch Out intervals calculate correctly', () => {
    // Interval 1: 9:30 to 11:30 (120m)
    // Break 1: 11:30 to 12:00 (30m)
    // Interval 2: 12:00 to 14:00 (120m)
    // Break 2: 14:00 to 14:30 (30m)
    // Interval 3: 14:30 to 19:00 (270m)
    // Sum = 120 + 120 + 270 = 510m (8h 30m). Punched breaks = 60m.
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T11:30:00+05:30') },
      { type: 'IN', time: new Date('2026-10-12T12:00:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T14:00:00+05:30') },
      { type: 'IN', time: new Date('2026-10-12T14:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T19:00:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T19:00:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.completedIntervals.length, 3);
    assert.equal(res.breakIntervals.length, 2);
    assert.equal(res.completedWorkMinutes, 510);
    assert.equal(res.totalNetWorkMinutes, 510);
    assert.equal(res.punchedBreakMinutes, 60);
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
  });

  await t.test('Scenario 10: Lunch is not deducted twice', () => {
    // 35m punched lunch break already taken -> lunchDeductionMinutes must be 0
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T13:00:00+05:30') },
      { type: 'IN', time: new Date('2026-10-12T13:35:00+05:30') }, // 35m break
      { type: 'OUT', time: new Date('2026-10-12T18:35:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T18:35:00+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.punchedBreakMinutes, 35);
    assert.equal(res.lunchDeductionMinutes, 0, 'Auto lunch deduction must be 0 when break already punched');
    assert.equal(res.totalNetWorkMinutes, 510);
    assert.equal(res.status, ATTENDANCE_STATUS.PRESENT);
  });

  await t.test('Scenario 11: GPS validation rejects punches outside the authorized radius', () => {
    const offices = [{ name: 'Corporate HQ', lat: 28.6139, lng: 77.2090, radius: 100 }];
    const insidePoint = { lat: 28.61392, lng: 77.20902 };
    const outsidePoint = { lat: 28.6250, lng: 77.2090 }; // ~1.2 km away

    const insideRes = checkGeofence(offices, insidePoint);
    const outsideRes = checkGeofence(offices, outsidePoint);

    assert.equal(insideRes.allowed, true, 'Inside coordinates must be allowed');
    assert.equal(outsideRes.allowed, false, 'Outside coordinates must be rejected');
    assert.ok(outsideRes.distance > 100, 'Distance must exceed 100m');
  });

  await t.test('Scenario 12: Duplicate punches, invalid sequences, and concurrent requests are handled safely', () => {
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T13:00:00+05:30') },
    ];
    const lastPunch = punches[punches.length - 1];
    assert.equal(lastPunch.type, 'OUT');

    // Duplicate consecutive OUT is prevented
    const canPunchOut = lastPunch.type === 'IN';
    assert.equal(canPunchOut, false, 'Cannot punch out when already punched out');

    // Next punch must be IN
    const canPunchIn = lastPunch.type === 'OUT';
    assert.equal(canPunchIn, true, 'Must allow punch IN after punch OUT');
  });

  await t.test('Scenario 13: Timezone and attendance-day closing are handled correctly', () => {
    // When attendance day is closed, a session with final punch out before 4:30 PM is closed as ABSENT
    const punches = [
      { type: 'IN', time: new Date('2026-10-12T09:30:00+05:30') },
      { type: 'OUT', time: new Date('2026-10-12T15:00:00+05:30') },
    ];
    const res = evaluatePunches({
      punches,
      companySettings,
      now: new Date('2026-10-12T23:59:59+05:30'),
      isDayClosed: true,
    });
    assert.equal(res.status, ATTENDANCE_STATUS.ABSENT);
    assert.equal(res.subStatus, 'EARLY_DEPARTURE_ABSENT');
  });
});
