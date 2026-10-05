const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Do GPS points ke beech ki doori, meters mein (Haversine). Server bhi yahi formula lagata hai
// (server/services/geoService.js); yahan sirf staff ko dikhane ke liye hai, punch ka faisla server karta hai.
export function distanceInMeters(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Sabse paas ka office aur wahan tak ki doori: { location, distance, inside } ya null.
// Kisi bhi ek office ki range ke andar hona kaafi hai.
export function nearestOffice(locations, position) {
  let best = null;
  for (const location of locations) {
    const distance = Math.round(distanceInMeters(position, location));
    const inside = distance <= location.radius;
    const better = !best || (inside && !best.inside) || (inside === best.inside && distance < best.distance);
    if (better) best = { location, distance, inside };
  }
  return best;
}
