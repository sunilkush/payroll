const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Haversine formula: do GPS points ke beech ki doori, meters mein.
export function distanceInMeters(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Company ki kisi bhi ek branch ki range ke andar hona kaafi hai.
// Return: { allowed, location, distance } - andar ho to wahi branch, warna sabse paas wali.
export function checkGeofence(locations, point) {
  let best = null;
  for (const location of locations) {
    const distance = Math.round(distanceInMeters(point, location));
    const allowed = distance <= location.radius;
    const better =
      !best || (allowed && !best.allowed) || (allowed === best.allowed && distance < best.distance);
    if (better) best = { allowed, location, distance };
  }
  return best;
}
