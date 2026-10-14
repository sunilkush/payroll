import AsyncStorage from '@react-native-async-storage/async-storage';

// App ka intro (onboarding) sirf pehli baar. Settings se dobara khol sakte hain.
// Memory mein bhi copy, taaki logout ke baad Login stack bina await ke sahi pehli screen chune.
const KEY = 'onboardingSeen';
let seen = false;

export async function getOnboardingSeen() {
  try {
    seen = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    seen = false;
  }
  return seen;
}

// getOnboardingSeen ke baad (App.js khulte hi ise chala deta hai)
export const onboardingSeenNow = () => seen;

export async function setOnboardingSeen() {
  seen = true;
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Save na ho to agli baar intro phir dikhega; app chalta rahe
  }
}
