import { useEffect, useState } from 'react';
// Har weight apne folder se: package ke index se lene par saare weights (italic bhi) app mein bundle ho jate hain.
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import SplashView from './src/screens/SplashView';
import { getOnboardingSeen } from './src/utils/onboarding';

// Native splash (wahi rang aur logo) fonts aane tak; phir JS ka SplashView jab tak saved login jaancha jata hai.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Root({ fontsReady }) {
  const { loading } = useAuth();
  const [introSeen, setIntroSeen] = useState(null); // null = abhi pata nahi

  useEffect(() => {
    getOnboardingSeen().then(setIntroSeen);
  }, []);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return null;
  // Login sahi ho to seedha role ke tabs; warna pehli baar intro, baad mein Login.
  if (loading || introSeen === null) return <SplashView />;
  return <RootNavigator />;
}

export default function App() {
  // Naam wahi jo theme/index.js ke fonts mein hain.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        {/* Font na bhi aaye to app system font par chalta rahe */}
        <Root fontsReady={fontsLoaded || Boolean(fontError)} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
