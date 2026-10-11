import { useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getGlobalSettingsApi, updateGlobalSettingsApi } from '../../api/globalSettingsApi.js';
import Alert from '../../components/common/Alert.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, radius, shadows, typography } from '../../theme/index.js';
import { initials } from '../../utils/roles.js';

export default function SuperAdminSettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: 'success', text: '' });

  const handleLogout = () => {
    NativeAlert.alert('Sign Out', 'Are you sure you want to sign out from Super Admin console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const [form, setForm] = useState({
    payrollDaysBasis: '30',
    pfEmployeeRate: '12',
    pfEmployerRate: '12',
    pfEpsRate: '8.33',
    pfWageCeiling: '15000',
    pfEdliRate: '0.5',
    pfAdminRate: '0.5',
    esiEmployeeRate: '0.75',
    esiEmployerRate: '3.25',
    esiWageLimit: '21000',
  });

  const loadSettings = async () => {
    try {
      const res = await getGlobalSettingsApi();
      const s = res?.data?.settings;
      if (s) {
        setForm({
          payrollDaysBasis: String(s.payrollDaysBasis ?? 30),
          pfEmployeeRate: String(s.pf?.employeeRate ?? 12),
          pfEmployerRate: String(s.pf?.employerRate ?? 12),
          pfEpsRate: String(s.pf?.epsRate ?? 8.33),
          pfWageCeiling: String(s.pf?.wageCeiling ?? 15000),
          pfEdliRate: String(s.pf?.edliRate ?? 0.5),
          pfAdminRate: String(s.pf?.adminRate ?? 0.5),
          esiEmployeeRate: String(s.esi?.employeeRate ?? 0.75),
          esiEmployerRate: String(s.esi?.employerRate ?? 3.25),
          esiWageLimit: String(s.esi?.wageLimit ?? 21000),
        });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load statutory settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg({ type: 'success', text: '' });
    try {
      const payload = {
        payrollDaysBasis: Number(form.payrollDaysBasis),
        pf: {
          employeeRate: Number(form.pfEmployeeRate),
          employerRate: Number(form.pfEmployerRate),
          epsRate: Number(form.pfEpsRate),
          wageCeiling: Number(form.pfWageCeiling),
          edliRate: Number(form.pfEdliRate),
          adminRate: Number(form.pfAdminRate),
        },
        esi: {
          employeeRate: Number(form.esiEmployeeRate),
          employerRate: Number(form.esiEmployerRate),
          wageLimit: Number(form.esiWageLimit),
        },
      };

      await updateGlobalSettingsApi(payload);
      setStatusMsg({ type: 'success', text: 'Global statutory parameters updated successfully.' });
      setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 3500);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update rates.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Fetching statutory rates..." />;
  }

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Statutory Rules"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {statusMsg.text ? <Alert type={statusMsg.type}>{statusMsg.text}</Alert> : null}

      {/* SuperAdmin Account Profile Card */}
      <Card style={styles.profileCard} elevation="xs">
        <View style={styles.profileRow}>
          <Avatar name={user?.name || 'SA'} size={52} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Super Administrator'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'admin@payroster.io'}</Text>
            <View style={styles.roleBadgeWrap}>
              <Badge label="Platform Root" variant="primary" size="sm" />
            </View>
          </View>
        </View>
      </Card>

      <Text style={styles.pageSubtitle}>
        Nationwide compliance parameters for Provident Fund (EPF), ESI, and payroll calculation.
      </Text>

      {/* 1. Payroll Basis */}
      <Text style={styles.sectionTitle}>Payroll Basis</Text>
      <Card style={styles.card} elevation="xs">
        <Input
          label="Days Basis per Month"
          value={form.payrollDaysBasis}
          onChangeText={(t) => setForm((p) => ({ ...p, payrollDaysBasis: t }))}
          placeholder="30"
          keyboardType="numeric"
          helper="Monthly gross / this number of days (standard 30 days basis)"
        />
      </Card>

      {/* 2. Provident Fund (EPF) */}
      <Text style={styles.sectionTitle}>Provident Fund (EPF)</Text>
      <Card style={styles.card} elevation="xs">
        <View style={styles.row}>
          <Input
            label="Employee Rate (%)"
            value={form.pfEmployeeRate}
            onChangeText={(t) => setForm((p) => ({ ...p, pfEmployeeRate: t }))}
            placeholder="12"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
          <Input
            label="Employer Rate (%)"
            value={form.pfEmployerRate}
            onChangeText={(t) => setForm((p) => ({ ...p, pfEmployerRate: t }))}
            placeholder="12"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
        </View>

        <View style={styles.row}>
          <Input
            label="EPS Rate (%)"
            value={form.pfEpsRate}
            onChangeText={(t) => setForm((p) => ({ ...p, pfEpsRate: t }))}
            placeholder="8.33"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
          <Input
            label="Wage Ceiling (₹)"
            value={form.pfWageCeiling}
            onChangeText={(t) => setForm((p) => ({ ...p, pfWageCeiling: t }))}
            placeholder="15000"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
        </View>

        <View style={styles.row}>
          <Input
            label="EDLI Rate (%)"
            value={form.pfEdliRate}
            onChangeText={(t) => setForm((p) => ({ ...p, pfEdliRate: t }))}
            placeholder="0.5"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
          <Input
            label="Admin Rate (%)"
            value={form.pfAdminRate}
            onChangeText={(t) => setForm((p) => ({ ...p, pfAdminRate: t }))}
            placeholder="0.5"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
        </View>
      </Card>

      {/* 3. ESI Insurance */}
      <Text style={styles.sectionTitle}>Employee State Insurance (ESI)</Text>
      <Card style={styles.card} elevation="xs">
        <View style={styles.row}>
          <Input
            label="Employee Rate (%)"
            value={form.esiEmployeeRate}
            onChangeText={(t) => setForm((p) => ({ ...p, esiEmployeeRate: t }))}
            placeholder="0.75"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
          <Input
            label="Employer Rate (%)"
            value={form.esiEmployerRate}
            onChangeText={(t) => setForm((p) => ({ ...p, esiEmployerRate: t }))}
            placeholder="3.25"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
        </View>

        <Input
          label="Wage Ceiling Limit (₹)"
          value={form.esiWageLimit}
          onChangeText={(t) => setForm((p) => ({ ...p, esiWageLimit: t }))}
          placeholder="21000"
          keyboardType="numeric"
          helper="Employees earning up to this monthly gross are covered by statutory ESI"
        />
      </Card>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Text style={styles.saveBtnText}>
          {saving ? 'Saving...' : 'Save Statutory Rules'}
        </Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
        <Text style={styles.logoutBtnText}>Sign Out from Super Admin</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  profileCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: typography.weights.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadgeWrap: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 6,
  },
  card: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...shadows.sm,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 16,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: typography.weights.semibold,
  },
});
