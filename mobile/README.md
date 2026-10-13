# PayRoster mobile

React Native (Expo SDK 57, Expo Router) app. Wahi backend (`/api/v1`) use karta hai jo web app; backend mein
is app ke liye koi alag API nahi hai.

## Chalana

```bash
cd mobile
npm install
cp .env.example .env      # EXPO_PUBLIC_API_URL mein backend ka URL
npx expo start            # QR ko Expo Go se scan karo, ya "a" dabao (Android emulator)
```

- Android emulator se computer ka server `http://10.0.2.2:5000` par milta hai.
- Asli phone par computer ka LAN IP do (`http://192.168.x.x:5000`); phone aur computer ek hi Wi-Fi par hon.
- Release build mein Android sirf HTTPS chalne deta hai, isliye production mein `https://` wala URL do.

## Login aur notifications

- **Login lamba chalta hai:** login par server refresh token deta hai (30 din, `REFRESH_TOKEN_DAYS`). Access token
  expire hone par app khud naya le leta hai; user ko dobara login nahi karna padta. "Log out" server par bhi session
  khatam karta hai.
- **Push notifications** Expo ki push service se jati hain (wo aage FCM / APNs ko deti hai):
  1. `npx eas-cli init` chalao: `app.json` mein EAS `projectId` aata hai. Iske bina push token nahi banta.
  2. Android ke liye EAS mein FCM credentials jodo (Firebase project ka `google-services.json` + service account key).
  3. Development build banao (`npx eas-cli build --profile development`). **Expo Go mein Android par push nahi chalti.**
- Kab jati hain: staff ne leave / punch correction maanga -> company ke admins ko; admin ne approve / reject kiya -> us staff ko.

## App lock aur force update

- **App lock:** Profile mein switch. ON ho to app khulte waqt (aur 1 minute se zyada background mein rehne ke baad)
  fingerprint / face / phone ka PIN maangta hai. Logout par OFF ho jata hai. iOS par Face ID Expo Go mein nahi chalti.
- **Force update:** server ke `.env` mein `MOBILE_MIN_VERSION=1.1.0` likho to us se purana app "Update required"
  screen par ruk jata hai. `MOBILE_ANDROID_URL` / `MOBILE_IOS_URL` us screen ke Update button ke store links hain.
  App ka apna version `app.json` ka `version` hai.

## Offline punch

- Network na ho to punch phone mein jama ho jata hai (us waqt ke GPS aur time ke saath) aur Punch screen khulne /
  neeche kheenchne par server ko chala jata hai. Jama punch screen par "Waiting to be sent" mein dikhte hain.
- Server use `offline: true` nishaan ke saath rakhta hai, aur sirf **usi din** ka punch leta hai: time aage ka na ho
  aur pehle se darj punch ke baad ka ho. Geofence us waqt ki location par check hota hai. Mana hua punch hat jata hai
  aur wajah screen par dikhti hai (tab staff punch correction maange).

## Subscription

- Khud register karne wali company ko 30 din ka free trial milta hai (`TRIAL_DAYS`). Khatam hone se 15 / 7 / 1 din
  pehle admin ko email + push jati hai.
- Khatam hone par staff login nahi kar sakta ("contact your admin" dikhta hai); admin ko app mein sirf
  "Subscription required" screen milti hai. Plan website ke Plan & Billing se liya jata hai: app mein na daam hai
  na payment (Play Store / App Store ke billing rules ki wajah se).
- Plan chalu hote hi (Super Admin approve kare) staff ke accounts apne aap wapas chalu ho jate hain.

## Structure

```
src/app/          screens (Expo Router): login, staff/, admin/, superadmin/
src/api/          axios client (token SecureStore mein) + saare endpoints
src/context/      AuthContext (login, logout, saved session)
src/components/   ui.js (Screen, Card, Button, ...), RoleTabs, ApprovalList, ProfileScreen
src/utils/        format (IST dates), location (punch ki GPS), useLoad
```

## Kaun kya kar sakta hai

- **Staff:** punch in / out (GPS), mahine ki attendance, leave balance / apply / cancel, salary slip download.
- **Company Admin:** aaj ki attendance, leave requests aur punch corrections approve / reject.
- **Super Admin:** companies ki list (plan, staff, status).

Leave / Salary / Corrections tabs tabhi dikhte hain jab company ke plan aur settings mein wo feature ON ho.
