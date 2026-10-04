import '../setup.js';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkGeofence, distanceInMeters } from '../../services/geoService.js';

const OFFICE = { lat: 28.4595, lng: 77.0266 };

describe('geoService', () => {
  test('Haversine: 0.001 degree latitude lagbhag 111 meter', () => {
    const distance = distanceInMeters(OFFICE, { lat: 28.4605, lng: 77.0266 });
    assert.ok(Math.abs(distance - 111.2) < 1, `mila ${distance}`);
  });

  test('Haversine: Delhi se Mumbai lagbhag 1150 km', () => {
    const km = distanceInMeters({ lat: 28.6139, lng: 77.209 }, { lat: 19.076, lng: 72.8777 }) / 1000;
    assert.ok(Math.abs(km - 1150) < 15, `mila ${km}`);
  });

  test('same point par doori 0', () => {
    assert.equal(distanceInMeters(OFFICE, OFFICE), 0);
  });

  test('range ke andar: allowed', () => {
    const result = checkGeofence([{ name: 'HO', ...OFFICE, radius: 100 }], { lat: 28.4599, lng: 77.0266 });
    assert.equal(result.allowed, true);
    assert.ok(Math.abs(result.distance - 44) <= 2);
  });

  test('range ke bahar: not allowed, doori ke saath', () => {
    const result = checkGeofence([{ name: 'HO', ...OFFICE, radius: 100 }], { lat: 28.4616, lng: 77.0266 });
    assert.equal(result.allowed, false);
    assert.ok(result.distance > 225 && result.distance < 240);
  });

  test('kai branches: jis branch ki range mein ho wahi chuni jati hai', () => {
    const locations = [
      { name: 'Door wali', lat: 28.4616, lng: 77.0266, radius: 50 },
      { name: 'Paas wali', ...OFFICE, radius: 100 },
    ];
    const result = checkGeofence(locations, { lat: 28.4599, lng: 77.0266 });
    assert.equal(result.allowed, true);
    assert.equal(result.location.name, 'Paas wali');
  });
});
