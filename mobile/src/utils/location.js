import * as Location from 'expo-location';

// Punch ke liye abhi ki GPS position: { lat, lng, accuracy (meters) }. Sirf foreground mein, punch ke waqt.
export async function getPunchPosition() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Allow location for PayRoster in your phone settings.');
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Location is turned off. Turn on GPS and try again.');
  }

  const { coords, mocked } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  // Android fake-GPS apps ki location par ye flag aata hai (iOS par nahi milta).
  if (mocked) throw new Error('A mock location app is active. Turn it off to punch.');
  return { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy ?? 0 };
}
