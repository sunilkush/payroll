const ERROR_MESSAGES = {
  1: 'Location permission nahi mili. Browser settings mein location allow karein.',
  2: 'Location nahi mil pa rahi. GPS/location on karke dobara try karein.',
  3: 'Location lene mein zyada time lag gaya. Dobara try karein.',
};

// Browser se current GPS position leta hai: { lat, lng, accuracy (meters) }.
// Dhyan rahe: browser location sirf HTTPS (ya localhost) par deta hai.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Is browser mein location support nahi hai.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(ERROR_MESSAGES[error.code] || 'Location nahi mil payi.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}
