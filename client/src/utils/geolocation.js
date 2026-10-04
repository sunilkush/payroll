const ERROR_MESSAGES = {
  1: 'Location permission denied. Allow location in your browser settings.',
  2: 'Could not get your location. Turn on GPS/location and try again.',
  3: 'Getting your location took too long. Please try again.',
};

// Browser se current GPS position leta hai: { lat, lng, accuracy (meters) }.
// Dhyan rahe: browser location sirf HTTPS (ya localhost) par deta hai.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(ERROR_MESSAGES[error.code] || 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}
