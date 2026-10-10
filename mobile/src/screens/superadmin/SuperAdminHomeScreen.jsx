import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { listCompaniesApi } from '../../api/companyApi.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { greeting } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function SuperAdminHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await listCompaniesApi();
        setCompanies(res?.data?.companies || []);
      } catch (err) {
        console.warn('Superadmin load companies error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.userNameText}>{user?.name || 'Super Admin'}</Text>
          <Badge label="Super Admin" variant="danger" size="sm" style={styles.roleBadge} />
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={handleLogout}>
          <Text style={styles.avatarText}>{initials(user?.name || 'SA')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Platform Overview</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="domain" size={20} color={colors.primary} />
          </View>
          <Text style={styles.statVal}>{companies.length}</Text>
          <Text style={styles.statLabel}>Total Companies</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: colors.successBg }]}>
            <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />
          </View>
          <Text style={styles.statVal}>Active</Text>
          <Text style={styles.statLabel}>Platform Status</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.modulesList}>
        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('SuperAdminCompanies')}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#e0e7ff' }]}>
            <MaterialCommunityIcons name="domain" size={22} color={colors.primary} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Manage Companies</Text>
            <Text style={styles.moduleDesc}>View all registered tenants, plan requests & admins</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('SuperAdminSettings')}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#ede9fe' }]}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.chart1} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Global Statutory Settings</Text>
            <Text style={styles.moduleDesc}>Configure nationwide PF & ESI rates and rules</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="outline"
        icon="logout"
        style={styles.logoutBtn}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  userNameText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  roleBadge: {
    marginTop: 4,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modulesList: {
    gap: 12,
    marginBottom: 24,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  moduleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  moduleDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 8,
  },
});
