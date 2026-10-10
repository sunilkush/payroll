# 📱 PayRoster Mobile App (React Native / Expo)

PayRoster is a mobile-first payroll, attendance, and leave management app built for Android and iOS using Expo SDK 57, React Native, and React Native Paper.

---

## 🚀 Quick Start (Development)

### 1. Prerequisites
- Node.js (v18+)
- Backend server running (default `http://localhost:5000` or on your LAN)
- Expo Go app on your physical Android phone (or an Android Emulator)

### 2. Run the App
From the `mobile/` directory:
```bash
npm start
# or
npx expo start
```
- Press `a` to launch in Android Emulator.
- Scan the displayed QR code with the **Expo Go** app on your physical Android device.

> **Network Note:** When running on a physical device, the app automatically determines your computer's local IP address and connects to `http://<your-ip>:5000/api/v1`. You can also tap the **"Server: ..."** link at the bottom of the Login screen to manually point to any custom URL or cloud deployment (e.g. Render).

---

## 📦 Building an Installable Android APK

The project includes pre-configured EAS build profiles in `eas.json`.

### Option A: Build Standalone APK in Cloud (Recommended — No local Android Studio needed)
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in with your free Expo account:
   ```bash
   eas login
   ```
3. Generate the APK:
   ```bash
   eas build -p android --profile preview
   ```
4. EAS will build the `.apk` in the cloud and give you a direct download link and QR code to install it on any Android device!

### Option B: Build Local APK with Android Studio
```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```
The APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.

### Option C: Production Google Play Store App Bundle (AAB)
```bash
eas build -p android --profile production
```

---

## 🛠️ App Features & Roles

### 🧑‍💼 Staff Persona
- **Geofence GPS Attendance Punch**: Live distance to office, range verification, one-tap Punch In and Punch Out with timestamp logging.
- **Monthly Attendance History**: Interactive 7-day calendar matrix with color indicators and day-by-day punch breakdowns.
- **Leave Management**: Live Casual Leave (CL) and Earned Leave (EL) balances, interactive leave application modal, and cancel requests.
- **Salary Slips**: Finalized monthly slips with detailed earnings (Basic, HRA, Special) and deductions (EPF, ESI).
- **Staff Profile**: Account details and secure sign out.

### 👔 Company Admin Persona
- **Dashboard Overview**: Today's presence summary cards (Present, On Leave, Not Punched, Total Staff).
- **Staff Directory**: Add new staff, edit salary structures, manage statutory applicability (PF/ESI), and one-tap deactivate/activate.
- **Company Attendance Monitoring**: Monthly company report and employee-wise counters.
- **Leave Approvals**: Review pending leave applications, approve paid leaves, or reject with a reason note.
- **Geofence Configuration**: Set up office branches with radius, or use the **"Use Phone's Current GPS Location"** button to auto-fill branch coordinates.

### 👑 Super Admin Persona
- **Tenant Organization Management**: List all registered companies, block/unblock tenants, review plan upgrade requests, and onboard new companies.
- **Global Statutory Rules**: Configure nationwide PF (EPF/EPS wage ceiling & rates) and ESI thresholds.

---

## 🛡️ Health & Diagnostics
```bash
npx expo-doctor
```
Ensures all dependencies and configurations adhere strictly to Expo SDK 57 standards.
