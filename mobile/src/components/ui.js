import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '../theme.js';

// Har screen ka dhancha: title, neeche kheench kar refresh, loading aur error ek hi jagah.
export function Screen({ title, subtitle, loading, refreshing = false, onRefresh, error, children }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {error ? <Notice tone="danger" text={error} /> : null}
        {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const TONES = {
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  danger: { bg: colors.dangerLight, fg: colors.danger },
  info: { bg: colors.infoLight, fg: colors.info },
  neutral: { bg: colors.border, fg: colors.textSecondary },
};

export function Notice({ tone = 'info', text }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={{ color: fg }}>{text}</Text>
    </View>
  );
}

// Attendance, leave aur correction ke saare status ek hi jagah se rang paate hain.
const STATUS_TONE = {
  PRESENT: 'success',
  APPROVED: 'success',
  HALF_DAY: 'warning',
  PENDING: 'warning',
  NOT_MARKED: 'warning',
  ABSENT: 'danger',
  REJECTED: 'danger',
  LEAVE: 'info',
  HOLIDAY: 'info',
  WEEK_OFF: 'neutral',
  CANCELLED: 'neutral',
};

const toLabel = (status) => status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');

export function StatusBadge({ status }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'} text={toLabel(status)} />;
}

export function Badge({ tone = 'neutral', text }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const off = disabled || loading;
  const palette = {
    primary: { bg: colors.primary, fg: colors.surface, border: colors.primary },
    danger: { bg: colors.danger, fg: colors.surface, border: colors.danger },
    outline: { bg: colors.surface, fg: colors.textSecondary, border: colors.border },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: palette.bg, borderColor: palette.border }, off && styles.buttonOff, style]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>}
    </Pressable>
  );
}

// Chhota number wala tile (present / absent / balance waghera)
export function Stat({ label, value, tone }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone && { color: TONES[tone].fg }]}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function StatRow({ children }) {
  return <View style={styles.statRow}>{children}</View>;
}

export function Empty({ text }) {
  return <Text style={[styles.muted, styles.empty]}>{text}</Text>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: -space.sm },
  loader: { marginTop: space.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  notice: { borderRadius: radius, padding: space.md },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: space.sm, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: {
    minHeight: 48,
    borderRadius: radius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonOff: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  heading: { fontSize: 16, fontWeight: '600', color: colors.text },
  text: { color: colors.textSecondary },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  label: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
});
