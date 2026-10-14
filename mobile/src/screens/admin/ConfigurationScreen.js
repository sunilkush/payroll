import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, Clock, CreditCard, LogOut, MapPin, Presentation, ShieldCheck } from 'lucide-react-native';
import { Card, DarkCard, ErrorState, Header, ListRow, Pill, Screen, SkeletonList } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { usePlanUsage } from '../../hooks/usePlanUsage';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatDuration } from '../../utils/format';
import { initialsOf } from '../../components/Avatar';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function IconTile({ icon: Icon, tone }) {
  const palette = { success: [colors.successTint, colors.success], info: [colors.infoTint, colors.info], warning: [colors.warningTint, colors.warning], danger: [colors.dangerTint, colors.danger], neutral: [colors.neutralTint, colors.neutral] }[tone];
  return (
    <View style={[styles.iconTile, { backgroundColor: palette[0] }]}>
      <Icon size={18} strokeWidth={2} color={palette[1]} />
    </View>
  );
}

function Group({ title, children }) {
  return (
    <View style={styles.group}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

// Admin: company ki settings ka hub (Today ke settings button se).
export default function ConfigurationScreen({ navigation }) {
  const { user, company: session, logout } = useAuth();
  const { company, error, reload } = useCompanySettings();
  const { usage } = usePlanUsage();

  // Kisi section se save karke wapas aaye to summary taaza
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const settings = company?.settings;
  const locations = company?.locations ?? [];
  const phoneZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Screen>
      <Header title="Configuration" onBack={navigation.goBack} />

      <DarkCard>
        <View style={styles.companyRow}>
          <View style={styles.initials}>
            <Text style={styles.initialsText}>{initialsOf(session?.name ?? company?.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.companyName} numberOfLines={2}>
              {session?.name ?? company?.name}
            </Text>
            <Text style={styles.companyMeta} numberOfLines={1}>
              {user?.email} · {phoneZone}
            </Text>
          </View>
          {usage && (
            <Pressable onPress={() => navigation.navigate('PlanBilling')} accessibilityRole="button" accessibilityLabel={`Plan ${usage.planName}, open billing`}>
              <Pill variant="success">{usage.planName.toUpperCase()}</Pill>
            </Pressable>
          )}
        </View>
      </DarkCard>

      {!company ? (
        error ? (
          <Card>
            <ErrorState message={error} onRetry={reload} />
          </Card>
        ) : (
          <SkeletonList rows={4} />
        )
      ) : (
        <>
          <Group title="Attendance">
            <ListRow
              left={<IconTile icon={MapPin} tone="success" />}
              title="Offices & geofence"
              subtitle={locations.length ? `${locations.length} branch${locations.length > 1 ? 'es' : ''} · GPS max ${settings.maxGpsAccuracy} m` : 'No office set — staff cannot punch in'}
              subtitleTone={locations.length ? undefined : 'danger'}
              onPress={() => navigation.navigate('Offices')}
            />
            <ListRow
              left={<IconTile icon={Clock} tone="info" />}
              title="Work hours & rules"
              subtitle={`${settings.workStartTime}–${settings.workEndTime} · ${formatDuration(settings.requiredWorkMinutes)} net${settings.workTimeEnabled ? '' : ' · tracking off'}`}
              onPress={() => navigation.navigate('WorkHours')}
              divider={false}
            />
          </Group>

          <Group title="Leave & payroll">
            <ListRow
              left={<IconTile icon={CalendarDays} tone="warning" />}
              title="Leave, holidays & week-offs"
              subtitle={`${settings.leaveEnabled ? `CL ${settings.clPerMonth} + EL ${settings.elPerMonth} / month` : 'Leave off'} · Off ${settings.weekOffDays.map((day) => DAY[day]).join(', ') || 'none'} · ${company.holidays.length} holidays`}
              onPress={() => navigation.navigate('LeaveHolidays')}
            />
            <ListRow
              left={<IconTile icon={ShieldCheck} tone="neutral" />}
              title="PF & ESI"
              subtitle={[settings.pfEnabled ? 'PF on' : 'PF off', settings.esiEnabled ? 'ESI on' : 'ESI off'].join(' · ')}
              onPress={() => navigation.navigate('PfEsi')}
              divider={false}
            />
          </Group>
        </>
      )}

      <Group title="Account">
        <ListRow
          left={<IconTile icon={CreditCard} tone="success" />}
          title="Plan & billing"
          subtitle={usage ? `${usage.planName} · ${usage.activeStaff}/${usage.staffLimit ?? '∞'} active staff` : undefined}
          onPress={() => navigation.navigate('PlanBilling')}
        />
        <ListRow left={<IconTile icon={Presentation} tone="info" />} title="View app intro" subtitle="The three welcome screens" onPress={() => navigation.navigate('AppIntro')} />
        <Pressable style={styles.signOut} onPress={logout} accessibilityRole="button">
          <IconTile icon={LogOut} tone="danger" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  initials: { width: 48, height: 48, borderRadius: radius.input, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: fonts.heading, fontSize: 18, color: colors.onInk },
  companyName: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.onInk },
  companyMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.onInkMuted },
  group: { gap: 8 },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  signOut: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingHorizontal: spacing.gapLg },
  signOutText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.danger },
});
