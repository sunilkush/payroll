// Company ki "kitni GPS accuracy tak punch chalega" (settings.maxGpsAccuracy) staff ko API mein nahi milti.
// Isliye server ka default (100 m) maan kar chalte hain, aur server jab "Max allowed is 50m" bole to wahi yaad rakhte hain.
let maxGpsAccuracy = 100;

export const getMaxGpsAccuracy = () => maxGpsAccuracy;

// Server ke error message se: "GPS accuracy is too low (160m). Max allowed is 50m. ..." -> 50. Mila to true.
export function learnMaxGpsAccuracy(message) {
  const value = Number(message?.match(/Max allowed is (\d+)\s*m/)?.[1]);
  if (!value) return false;
  maxGpsAccuracy = value;
  return true;
}
