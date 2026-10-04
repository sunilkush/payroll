import '../setup.js';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calculateEsi, calculatePf, contributionPeriodStart } from '../../services/statutoryService.js';

const PF = { employeeRate: 12, employerRate: 12, epsRate: 8.33, wageCeiling: 15000, edliRate: 0.5, adminRate: 0.5, wageFloorPercent: 50 };
const ESI = { employeeRate: 0.75, employerRate: 3.25, wageLimit: 21000 };

describe('PF', () => {
  test('basic 15000: employee 1800, EPS 1250, EPF 550, EDLI 75, admin 75', () => {
    const pf = calculatePf({ enabled: true, earnedBasic: 15000, earnedGross: 20000, capAtCeiling: true, rates: PF });
    assert.deepEqual(pf, { wage: 15000, employee: 1800, employerEps: 1250, employerEpf: 550, edli: 75, admin: 75 });
  });

  test('50% floor: basic gross ke aadhe se kam ho to wage = gross ka 50%', () => {
    const pf = calculatePf({ enabled: true, earnedBasic: 8000, earnedGross: 20000, capAtCeiling: true, rates: PF });
    assert.equal(pf.wage, 10000);
    assert.equal(pf.employee, 1200);
    assert.equal(pf.employerEps + pf.employerEpf, 1200);
  });

  test('floor 0 ho to rule band', () => {
    const pf = calculatePf({ enabled: true, earnedBasic: 8000, earnedGross: 20000, capAtCeiling: true, rates: { ...PF, wageFloorPercent: 0 } });
    assert.equal(pf.wage, 8000);
    assert.equal(pf.employee, 960);
  });

  test('cap ON: ceiling par ruk jata hai', () => {
    const pf = calculatePf({ enabled: true, earnedBasic: 30000, earnedGross: 50000, capAtCeiling: true, rates: PF });
    assert.equal(pf.wage, 15000);
    assert.equal(pf.employee, 1800);
  });

  test('cap OFF: actual par, lekin EPS aur EDLI ceiling tak hi', () => {
    const pf = calculatePf({ enabled: true, earnedBasic: 30000, earnedGross: 50000, capAtCeiling: false, rates: PF });
    assert.deepEqual(pf, { wage: 30000, employee: 3600, employerEps: 1250, employerEpf: 2350, edli: 75, admin: 150 });
  });

  test('OFF: sab zero', () => {
    const pf = calculatePf({ enabled: false, earnedBasic: 15000, earnedGross: 20000, capAtCeiling: true, rates: PF });
    assert.deepEqual(pf, { wage: 0, employee: 0, employerEpf: 0, employerEps: 0, edli: 0, admin: 0 });
  });
});

describe('ESI', () => {
  test('gross 20000: employee 150, employer 650 (float ki wajah se 151 nahi)', () => {
    const esi = calculateEsi({ enabled: true, monthlyGross: 20000, earnedGross: 20000, coveredInPeriod: false, rates: ESI });
    assert.deepEqual(esi, { covered: true, employee: 150, employer: 650 });
  });

  test('agle poore rupee tak round up', () => {
    const esi = calculateEsi({ enabled: true, monthlyGross: 21000, earnedGross: 10001, coveredInPeriod: false, rates: ESI });
    assert.equal(esi.employee, 76); // 75.0075
    assert.equal(esi.employer, 326); // 325.0325
  });

  test('limit ke barabar par lagu, ek rupya upar par nahi', () => {
    assert.equal(calculateEsi({ enabled: true, monthlyGross: 21000, earnedGross: 21000, coveredInPeriod: false, rates: ESI }).covered, true);
    assert.equal(calculateEsi({ enabled: true, monthlyGross: 21001, earnedGross: 21001, coveredInPeriod: false, rates: ESI }).covered, false);
  });

  test('contribution period ke beech salary limit se upar jaye to bhi chalta rehta hai', () => {
    const esi = calculateEsi({ enabled: true, monthlyGross: 25000, earnedGross: 25000, coveredInPeriod: true, rates: ESI });
    assert.deepEqual(esi, { covered: true, employee: 188, employer: 813 });
  });

  test('OFF: period mein covered ho to bhi zero', () => {
    const esi = calculateEsi({ enabled: false, monthlyGross: 10000, earnedGross: 10000, coveredInPeriod: true, rates: ESI });
    assert.deepEqual(esi, { covered: false, employee: 0, employer: 0 });
  });

  test('contribution periods: Apr-Sep aur Oct-Mar', () => {
    assert.equal(contributionPeriodStart('2026-04'), '2026-04');
    assert.equal(contributionPeriodStart('2026-09'), '2026-04');
    assert.equal(contributionPeriodStart('2026-10'), '2026-10');
    assert.equal(contributionPeriodStart('2026-12'), '2026-10');
    assert.equal(contributionPeriodStart('2027-03'), '2026-10');
  });
});
