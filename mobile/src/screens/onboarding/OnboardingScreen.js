import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, Download, Lock, MapPin } from 'lucide-react-native';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { setOnboardingSeen } from '../../utils/onboarding';

// ---------- Illustrations (sirf Views, koi image nahi) ----------

function MapIllustration() {
  return (
    <View style={[styles.art, { backgroundColor: '#E8EEE9' }]}>
      {/* Map ki sadkein */}
      <View style={[styles.road, { top: '30%', left: 0, right: 0, height: 14 }]} />
      <View style={[styles.road, { top: 0, bottom: 0, left: '62%', width: 12 }]} />
      <View style={[styles.road, { top: '72%', left: 0, right: 0, height: 8 }]} />
      <View style={styles.geofence} />
      <View style={styles.officePin}>
        <MapPin size={18} strokeWidth={2.2} color={colors.onInk} />
      </View>
      <View style={styles.userDot} />
      <View style={styles.floatCard}>
        <View style={styles.floatTop}>
          <View style={styles.liveDot} />
          <Text style={styles.floatTitle}>
            Punched in · <Text style={styles.mono}>09:27</Text>
          </Text>
        </View>
        <Text style={text.small}>
          Inside Head Office · <Text style={styles.monoSmall}>38 m</Text>
        </Text>
        <Text style={styles.floatTimer}>05:42</Text>
      </View>
    </View>
  );
}

function PocketIllustration() {
  return (
    <View style={[styles.art, { backgroundColor: colors.infoTint }]}>
      <View style={[styles.leaveCard, { transform: [{ rotate: '-7deg' }] }]}>
        <Text style={styles.leaveLabel}>Casual Leave</Text>
        <Text style={styles.leaveNumber}>4.5</Text>
        <View style={styles.approved}>
          <Text style={styles.approvedText}>Approved</Text>
        </View>
      </View>
      <View style={[styles.slipCard, { transform: [{ rotate: '5deg' }] }]}>
        <Text style={text.small}>September · Net pay</Text>
        <Text style={styles.slipAmount}>₹31,200</Text>
        <View style={styles.slipLines}>
          <View style={[styles.slipLine, { width: '80%' }]} />
          <View style={[styles.slipLine, { width: '60%' }]} />
        </View>
        <View style={styles.slipButton}>
          <Download size={14} strokeWidth={2} color={colors.onInk} />
          <Text style={styles.slipButtonText}>Download PDF</Text>
        </View>
      </View>
    </View>
  );
}

function PayrollIllustration() {
  const checks = ['Leave & corrections approved', 'Visits verified with QR + selfie', 'PF & ESI worked out'];
  return (
    <View style={[styles.art, styles.payrollArt, { backgroundColor: colors.warningTint }]}>
      <View style={styles.lockedCard}>
        <View style={styles.lockedTop}>
          <Lock size={16} strokeWidth={2} color={colors.successTint} />
          <Text style={styles.lockedLabel}>September · Locked</Text>
        </View>
        <Text style={styles.lockedAmount}>₹4,86,250</Text>
        <Text style={styles.lockedMeta}>18 slips published</Text>
      </View>
      {checks.map((label) => (
        <View key={label} style={styles.checkRow}>
          <View style={styles.checkIcon}>
            <Check size={14} strokeWidth={3} color={colors.onInk} />
          </View>
          <Text style={[text.bodyMedium, styles.flex]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const SLIDES = [
  { key: 'punch', title: 'Punch in only from the office', body: 'Staff punch in from their phone. GPS and your office range confirm they are really at work, and the time is set by the server.', Art: MapIllustration },
  { key: 'pocket', title: 'Leave and salary in your pocket', body: 'Apply for leave, see your balance and download every salary slip, without asking HR.', Art: PocketIllustration },
  { key: 'payroll', title: 'Payroll, done right every month', body: 'Attendance, leave, PF and ESI flow into payroll. Review the draft, lock the month and publish slips in minutes.', Art: PayrollIllustration },
];

// App ka intro: 3 slides. Pehli baar Login se pehle; Settings se "View app intro" se dobara (route.params.replay).
export default function OnboardingScreen({ navigation, route }) {
  const replay = Boolean(route.params?.replay);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const list = useRef(null);
  const [index, setIndex] = useState(0);
  const artHeight = Math.min(400, Math.max(300, height * 0.44));
  const last = index === SLIDES.length - 1;

  const goTo = (next) => {
    list.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  // Intro khatam: dobara nahi dikhega
  const finish = async (screen = 'Login') => {
    await setOnboardingSeen();
    if (replay) navigation.goBack();
    else navigation.replace(screen);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + spacing.gapLg }]}>
      <View style={styles.topBar}>
        {index > 0 ? (
          <Pressable style={styles.topButton} onPress={() => goTo(index - 1)} accessibilityRole="button" accessibilityLabel="Back">
            <ArrowLeft size={20} strokeWidth={2} color={colors.ink} />
            <Text style={text.bodySemiBold}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {!last && (
          <Pressable style={styles.topButton} onPress={() => finish()} accessibilityRole="button">
            <Text style={styles.skip}>{replay ? 'Close' : 'Skip'}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(slide) => slide.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item: { Art, title, body } }) => (
          <View style={[styles.slide, { width }]}>
            <View style={{ height: artHeight }}>
              <Art />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        )}
      />

      <View style={styles.bottom}>
        {last ? (
          <>
            <Pressable style={styles.getStarted} onPress={() => finish()} accessibilityRole="button">
              <Text style={styles.getStartedText}>{replay ? 'Done' : 'Get started'}</Text>
              <ArrowRight size={20} strokeWidth={2} color={colors.onInk} />
            </Pressable>
            {!replay && (
              <Pressable style={styles.registerLink} onPress={() => finish('Register')} accessibilityRole="link">
                <Text style={text.body}>
                  New company? <Text style={text.bodySemiBold}>Register free</Text>
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.pagerRow}>
            <View style={styles.pageDots} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
              {SLIDES.map((slide, dotIndex) => (
                <View key={slide.key} style={[styles.pageDot, dotIndex === index && styles.pageDotActive]} />
              ))}
            </View>
            <Pressable style={styles.next} onPress={() => goTo(index + 1)} accessibilityRole="button" accessibilityLabel="Next">
              <ArrowRight size={22} strokeWidth={2} color={colors.onInk} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const card = { backgroundColor: colors.card, borderRadius: radius.card, padding: 14, borderWidth: 1, borderColor: colors.line };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screen, minHeight: sizes.touch },
  topButton: { minHeight: sizes.touch, minWidth: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 6 },
  skip: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.muted },
  slide: { paddingHorizontal: spacing.screen, paddingTop: spacing.gap, gap: spacing.gapLg },
  title: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, color: colors.ink, marginTop: 8 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.muted },
  bottom: { paddingHorizontal: spacing.screen, gap: spacing.gap },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.inputBorder },
  pageDotActive: { width: 24, backgroundColor: colors.ink },
  next: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  getStarted: { height: sizes.button, borderRadius: radius.button, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  getStartedText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.onInk },
  registerLink: { minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center' },

  // illustrations
  art: { flex: 1, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  road: { position: 'absolute', backgroundColor: '#FFFFFF', opacity: 0.8 },
  geofence: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.success, backgroundColor: 'rgba(10,107,80,0.08)' },
  officePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  userDot: { position: 'absolute', marginLeft: 70, marginTop: 50, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.info, borderWidth: 3, borderColor: colors.card },
  floatCard: { ...card, position: 'absolute', left: 16, right: 16, bottom: 16, gap: 2 },
  floatTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.successBright },
  floatTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  floatTimer: { position: 'absolute', right: 14, top: 14, fontFamily: fonts.monoSemiBold, fontSize: 18, color: colors.ink },
  mono: { fontFamily: fonts.mono },
  monoSmall: { fontFamily: fonts.mono, color: colors.ink },
  leaveCard: { position: 'absolute', left: 24, top: 44, width: 180, backgroundColor: colors.ink, borderRadius: 20, padding: 16, gap: 4 },
  leaveLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.onInkMuted },
  leaveNumber: { fontFamily: fonts.monoSemiBold, fontSize: 40, color: colors.onInk },
  approved: { alignSelf: 'flex-start', backgroundColor: colors.successTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  approvedText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.successDark },
  slipCard: { ...card, position: 'absolute', right: 24, bottom: 40, width: 200, borderRadius: 20, gap: 6 },
  slipAmount: { fontFamily: fonts.monoSemiBold, fontSize: 26, color: colors.ink },
  slipLines: { gap: 6 },
  slipLine: { height: 6, borderRadius: 3, backgroundColor: colors.divider },
  slipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: 10, paddingVertical: 8, marginTop: 4 },
  slipButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onInk },
  payrollArt: { justifyContent: 'center', alignItems: 'stretch', padding: 20, gap: 10 },
  lockedCard: { backgroundColor: colors.success, borderRadius: 20, padding: 16, gap: 2, marginBottom: 6 },
  lockedTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockedLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.successTint },
  lockedAmount: { fontFamily: fonts.monoSemiBold, fontSize: 30, color: colors.onInk },
  lockedMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.successTint },
  checkRow: { ...card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
});
