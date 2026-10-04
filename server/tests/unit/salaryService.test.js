import '../setup.js';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { computePayroll } from '../../services/salaryService.js';

const rates = {
  payrollDaysBasis: 30,
  pf: { employeeRate: 12, employerRate: 12, epsRate: 8.33, wageCeiling: 15000, edliRate: 0.5, adminRate: 0.5, wageFloorPercent: 50 },
  esi: { employeeRate: 0.75, employerRate: 3.25, wageLimit: 21000 },
};
const company = (settings = {}) => ({ settings: { pfEnabled: true, esiEnabled: true, pfCapAtCeiling: true, ...settings } });
const staff = (overrides = {}) => ({
  salaryStructure: { basic: 15000, hra: 5000, special: 0, other: 0 },
  pfApplicable: true,
  esiApplicable: true,
  ...overrides,
});
const compute = (overrides = {}) =>
  computePayroll({ user: staff(), company: company(), rates, lopDays: 0, calendarDays: 30, esiCoveredInPeriod: false, ...overrides });

describe('computePayroll (30 days basis)', () => {
  test('poora mahina: gross 20000, PF 1800, ESI 150, net 18050', () => {
    const p = compute();
    assert.equal(p.payableDays, 30);
    assert.equal(p.earnings.gross, 20000);
    assert.deepEqual(p.deductions, { pf: 1800, esi: 150, other: 0, total: 1950 });
    assert.equal(p.netSalary, 18050);
    assert.deepEqual(p.employerContribution, { epf: 550, eps: 1250, edli: 75, pfAdmin: 75, esi: 650, total: 2600 });
  });

  test('3 LOP: 27 din, har component pro-rata', () => {
    const p = compute({ lopDays: 3 });
    assert.equal(p.payableDays, 27);
    assert.equal(p.earnings.basic, 13500);
    assert.equal(p.earnings.hra, 4500);
    assert.equal(p.earnings.gross, 18000);
    assert.equal(p.deductions.pf, 1620);
    assert.equal(p.deductions.esi, 135);
    assert.equal(p.netSalary, 16245);
  });

  test('31 din ke mahine mein bhi 30 hi: 0 LOP par poori salary', () => {
    assert.equal(compute({ calendarDays: 31 }).earnings.gross, 20000);
  });

  test('February (28 din) poora present: poori salary', () => {
    const p = compute({ calendarDays: 28 });
    assert.equal(p.payableDays, 30);
    assert.equal(p.earnings.gross, 20000);
  });

  test('February poora absent: 0 (30 - 28 = 2 din nahi)', () => {
    const p = compute({ lopDays: 28, calendarDays: 28 });
    assert.equal(p.payableDays, 0);
    assert.equal(p.netSalary, 0);
    assert.equal(p.deductions.total, 0);
  });

  test('31 din ke mahine mein 31 LOP: 0, minus nahi', () => {
    const p = compute({ lopDays: 31, calendarDays: 31 });
    assert.equal(p.payableDays, 0);
    assert.equal(p.netSalary, 0);
  });

  test('company level PF/ESI OFF: koi deduction nahi', () => {
    const p = compute({ company: company({ pfEnabled: false, esiEnabled: false }) });
    assert.equal(p.deductions.total, 0);
    assert.equal(p.netSalary, 20000);
    assert.equal(p.employerContribution.total, 0);
  });

  test('staff level PF/ESI OFF: koi deduction nahi', () => {
    const p = compute({ user: staff({ pfApplicable: false, esiApplicable: false }) });
    assert.equal(p.deductions.total, 0);
  });

  test('sirf PF ON: ESI nahi katta', () => {
    const p = compute({ company: company({ esiEnabled: false }) });
    assert.equal(p.deductions.pf, 1800);
    assert.equal(p.deductions.esi, 0);
    assert.equal(p.esiCovered, false);
  });

  test('gross 21000 se upar: ESI nahi, jab tak period mein covered na ho', () => {
    const user = staff({ salaryStructure: { basic: 15000, hra: 10000, special: 0, other: 0 } });
    assert.equal(compute({ user }).deductions.esi, 0);
    assert.equal(compute({ user, esiCoveredInPeriod: true }).deductions.esi, 188);
  });

  test('other deductions net se katte hain', () => {
    const p = compute({ otherDeductions: 1050 });
    assert.equal(p.deductions.total, 3000);
    assert.equal(p.netSalary, 17000);
  });

  test('other deduction bachi salary se zyada ho to utna hi katta hai (net minus mein nahi)', () => {
    const p = compute({ otherDeductions: 999999 });
    assert.equal(p.netSalary, 0);
    assert.equal(p.deductions.other, 18050);
  });

  test('paise 2 decimal tak round hote hain', () => {
    const user = staff({ salaryStructure: { basic: 10000.33, hra: 0, special: 0, other: 0 } });
    const p = compute({ user, lopDays: 7 });
    assert.equal(p.earnings.basic, 7666.92);
    assert.equal(p.earnings.gross, 7666.92);
  });
});
