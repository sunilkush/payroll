const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceInMeters(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function nearestOffice(locations = [], position) {
  if (!position || !locations.length) return null;
  let best = null;
  for (const location of locations) {
    const radius = Math.max(10, Math.round(Number(location.radius) || 100));
    const distance = Math.round(distanceInMeters(position, location));
    const inside = distance <= radius;
    const better = !best || (inside && !best.inside) || (inside === best.inside && distance < best.distance);
    if (better) best = { location: { ...location, radius }, distance, inside };
  }
  return best;
}
