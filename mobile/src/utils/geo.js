// Server ke services/geoService.js jaisa hi hisaab, taaki screen par wahi dikhe jo server tay karega.
// (Faisla phir bhi server ka hai; ye sirf punch se pehle batane ke liye.)

const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Haversine: do GPS points ke beech ki doori, meters mein.
export function distanceInMeters(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Kisi bhi ek branch ki range ke andar hona kaafi hai.
// Return: { inside, location, distance } - andar ho to wahi branch, warna sabse paas wali. Branch hi na ho to null.
export function nearestLocation(locations, point) {
  let best = null;
  for (const location of locations ?? []) {
    const distance = Math.round(distanceInMeters(point, location));
    const inside = distance <= location.radius;
    const better = !best || (inside && !best.inside) || (inside === best.inside && distance < best.distance);
    if (better) best = { inside, location, distance };
  }
  return best;
}

// 38 -> '38 m', 1450 -> '1.4 km'
export const formatDistance = (meters) => (meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`);
