import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

// Phone ki GPS location.
//   ask     true: permission na ho to maang leta hai (Punch screen). false: sirf pehle se di ho tab (Home ka chip).
//   watch   true: screen dikhte waqt location lagataar badalti rahe
// status: 'checking' | 'granted' | 'denied' (canAskAgain ke saath) | 'off' (phone ki location band) | 'error'
// position: { lat, lng, accuracy (meter) } ya null
export function useLocation({ ask = false, watch = false } = {}) {
  const [state, setState] = useState({ status: 'checking', canAskAgain: true, position: null, locating: false, error: '' });
  const subscription = useRef(null);
  const focused = useRef(false);

  const toPosition = ({ coords }) => ({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy ?? 9999) });

  const stopWatching = () => {
    subscription.current?.remove();
    subscription.current = null;
  };

  // request: true ho to permission ka popup bhi (button dabane par).
  const start = useCallback(
    async ({ request = ask } = {}) => {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && request && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState((previous) => ({ ...previous, status: 'denied', canAskAgain: permission.canAskAgain, locating: false }));
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setState((previous) => ({ ...previous, status: 'off', locating: false }));
        return;
      }

      setState((previous) => ({ ...previous, status: 'granted', locating: true, error: '' }));
      try {
        // Pehle ek taaza (purana cache nahi) location, phir chahiye to lagataar.
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        if (!focused.current) return;
        setState((previous) => ({ ...previous, position: toPosition(fix), locating: false }));
        if (watch && !subscription.current) {
          subscription.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Highest, timeInterval: 3000, distanceInterval: 3 },
            (update) => setState((previous) => ({ ...previous, position: toPosition(update) }))
          );
          if (!focused.current) stopWatching();
        }
      } catch (err) {
        setState((previous) => ({ ...previous, status: 'error', locating: false, error: 'Could not get your location. Try again.' }));
      }
    },
    [ask, watch]
  );

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      start();
      return () => {
        focused.current = false;
        stopWatching();
      };
    }, [start])
  );

  // Settings se permission de kar wapas aaye to dobara koshish.
  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active' && focused.current) start({ request: false });
    });
    return () => listener.remove();
  }, [start]);

  const refresh = useCallback(() => start({ request: true }), [start]);

  return { ...state, refresh, openSettings: () => Linking.openSettings() };
}
