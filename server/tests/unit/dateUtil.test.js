import '../setup.js';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { datesBetween, daysOfMonth, isValidDateStr, monthLabel, toDateStr, weekdayOf } from '../../utils/dateUtil.js';

describe('dateUtil', () => {
  test('daysOfMonth: leap year February', () => {
    assert.equal(daysOfMonth('2028-02').length, 29);
    assert.equal(daysOfMonth('2026-02').length, 28);
    assert.equal(daysOfMonth('2026-10').at(-1), '2026-10-31');
  });

  test('weekdayOf: 0 = Sunday', () => {
    assert.equal(weekdayOf('2026-10-04'), 0);
    assert.equal(weekdayOf('2026-10-05'), 1);
  });

  test('isValidDateStr', () => {
    assert.equal(isValidDateStr('2028-02-29'), true);
    assert.equal(isValidDateStr('2026-02-30'), false);
    assert.equal(isValidDateStr('2026-2-3'), false);
    assert.equal(isValidDateStr('abc'), false);
  });

  test('datesBetween: saal ke paar bhi', () => {
    assert.deepEqual(datesBetween('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    assert.deepEqual(datesBetween('2026-05-05', '2026-05-05'), ['2026-05-05']);
  });

  test('toDateStr: app timezone (IST) ki date deta hai', () => {
    // UTC mein 3 Oct raat 8 baje = IST mein 4 Oct subah 1:30
    assert.equal(toDateStr(new Date('2026-10-03T20:00:00Z')), '2026-10-04');
  });

  test('monthLabel', () => {
    assert.equal(monthLabel('2026-10'), 'October 2026');
  });
});
