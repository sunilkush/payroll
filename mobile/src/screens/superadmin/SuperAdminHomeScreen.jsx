import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getDashboardApi } from '../../api/dashboardApi.js';
import Avatar from '../../components/common/Avatar.jsx';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import Loader from '../../components/common/Loader.jsx';
import NotificationCenterModal from '../../components/common/NotificationCenterModal.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, radius, shadows, typography } from '../../theme/index.js';
import { formatCurrency, greeting } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function SuperAdminHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getDashboardApi();
      setData(res?.data || null);
    } catch (err) {
      console.warn('Superadmin dashboard error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const kpis = data?.kpis || {};
  const withoutAdminCount = data?.withoutAdmin?.length || 0;
  const topCompanies = data?.topCompanies || [];

  const totalTenants = kpis.companies?.value ?? 0;
  const activeTenants = kpis.active?.value ?? 0;
  const totalStaff = kpis.staff?.value ?? 0;
  const orgAdmins = kpis.admins?.value ?? 0;
  const platformRevenue = kpis.revenue?.value ?? (totalTenants * 25000);

  // Dynamic 6-month platform activity derived from current date and tenant counts
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const tenantSeries = kpis.companies?.series || [];
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), currentMonthIdx - 5 + i, 1);
    const mLabel = monthNames[d.getMonth()];
    const seriesItem = tenantSeries.find((s) => s.label?.includes(mLabel));
    const count = seriesItem ? Number(seriesItem.value) : (totalTenants > 0 ? Math.max(1, Math.round(totalTenants * ((i + 1) / 6))) : 0);
    const value = totalTenants > 0 ? Math.min(1, Math.max(0.2, count / totalTenants)) : 0.2;
    return { label: mLabel, count, value };
  });

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* 1. Header with System Health Pill & Profile Avatar */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <View style={styles.platformBadgeRow}>
            <View style={styles.healthDot} />
            <Text style={styles.roleSubtext}>Platform Root • Production Active</Text>
          </View>
          <Text style={styles.greetingText}>{greeting()}</Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
            {withoutAdminCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Avatar name={user?.name || 'SA'} size={38} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Top Stats Grid (2 Columns) */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('SuperAdminCompanies')}
          activeOpacity={0.8}
        >
          <View style={styles.statCardHeader}>
            <Text style={styles.statLabel}>Total Tenants</Text>
            <MaterialCommunityIcons name="domain" size={16} color={colors.primary} />
          </View>
          <Text style={styles.statNumberBlue}>{totalTenants}</Text>
          <Text style={styles.statCardSub}>Registered Companies</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('SuperAdminCompanies')}
          activeOpacity={0.8}
        >
          <View style={styles.statCardHeader}>
            <Text style={styles.statLabel}>Active Tenants</Text>
            <MaterialCommunityIcons name="check-decagram" size={16} color="#16A34A" />
          </View>
          <Text style={styles.statNumberGreen}>{activeTenants}</Text>
          <Text style={styles.statCardSub}>Operating Normally</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Platform Users Grid (2 Columns) */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statLabel}>Total Staff</Text>
            <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.statNumberDark}>{totalStaff.toLocaleString()}</Text>
          <Text style={styles.statCardSub}>Enrolled Employees</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statLabel}>Org Admins</Text>
            <MaterialCommunityIcons name="shield-account-outline" size={16} color="#7C3AED" />
          </View>
          <Text style={styles.statNumberDark}>{orgAdmins}</Text>
          <Text style={styles.statCardSub}>Company Managers</Text>
        </View>
      </View>

      {/* 4. Full Width Platform Revenue / Subscription Card */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('SuperAdminCompanies')}
      >
        <Card style={styles.revenueCard} elevation="xs">
          <View style={styles.revenueTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="chart-line" size={18} color="#166534" />
              <Text style={styles.revenueTitle}>Platform Subscription Run Rate</Text>
            </View>
            <Badge label="Active Portfolios" variant="success" size="sm" />
          </View>
          <Text style={styles.revenueAmount}>{formatCurrency(platformRevenue)}</Text>
          <View style={styles.revenueFooterRow}>
            <Text style={styles.revenueSub}>Estimated value across {totalTenants} enterprise accounts</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.revenueLink}>View Accounts</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color="#166534" />
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Platform Operations Hub */}
      <View style={styles.hubSection}>
        <Text style={styles.sectionTitle}>Platform Governance</Text>
        <View style={styles.hubGrid}>
          {[
            { label: 'Organizations', icon: 'domain', route: 'SuperAdminCompanies', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Security & Rules', icon: 'shield-check-outline', route: 'SuperAdminSettings', color: '#7C3AED', bg: '#F3E8FF' },
            { label: 'Live Refresh', icon: 'sync', action: onRefresh, color: '#059669', bg: '#ECFDF5' },
            { label: 'Sign Out', icon: 'logout', action: handleLogout, color: '#DC2626', bg: '#FEE2E2' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.hubTile}
              onPress={item.action || (() => navigation.navigate(item.route))}
              activeOpacity={0.7}
            >
              <View style={[styles.hubIconWrap, { backgroundColor: item.bg }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.hubLabel} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. Platform Activity 6-Month Bar Chart */}
      <Card style={styles.chartCard} elevation="xs">
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartTitle}>Platform Tenant Growth</Text>
            <Text style={styles.chartSubtitle}>Last 6 Months Trajectory</Text>
          </View>
          <Badge label="Healthy Trajectory" variant="primary" size="sm" />
        </View>

        <View style={styles.barsContainer}>
          {chartMonths.map((item) => (
            <View key={item.label} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${item.value * 100}%` }]} />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* 6. Critical Alert Banner if companies lack admin */}
      {withoutAdminCount > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.alertBanner}
          onPress={() => navigation.navigate('SuperAdminCompanies')}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
          <View style={styles.alertBannerInfo}>
            <Text style={styles.alertBannerTitle}>
              {withoutAdminCount} Company(s) Need Administrator
            </Text>
            <Text style={styles.alertBannerSub}>
              Tap to review tenants and assign company admin accounts.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#DC2626" />
        </TouchableOpacity>
      )}

      {/* 7. Top Organizations by Headcount */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Top Organizations</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SuperAdminCompanies')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.topCompaniesCard} elevation="xs">
        {topCompanies.length === 0 ? (
          <View style={styles.emptyFeed}>
            <MaterialCommunityIcons name="domain" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyFeedText}>No company records found.</Text>
          </View>
        ) : (
          topCompanies.slice(0, 5).map((c, i) => (
            <TouchableOpacity
              key={c._id || i}
              activeOpacity={0.7}
              style={[
                styles.topCompanyRow,
                i < Math.min(topCompanies.length, 5) - 1 && styles.topCompanyBorder,
              ]}
              onPress={() =>
                navigation.navigate('SuperAdminCompanyDetail', {
                  companyId: c._id,
                  companyName: c.name,
                })
              }
            >
              <Avatar name={c.name || 'CP'} size={42} />
              <View style={styles.topCompanyInfo}>
                <Text style={styles.topCompanyName}>{c.name}</Text>
                <Text style={styles.topCompanySub}>
                  {c.admins || 1} Admin(s) • {c.isActive ? 'Active' : 'Blocked'}
                </Text>
              </View>
              <View style={styles.staffPill}>
                <Text style={styles.staffPillText}>{c.staff || 0} Staff</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))
        )}
      </Card>

      {/* Notification Center */}
      <NotificationCenterModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        navigation={navigation}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  greetingContainer: {
    flex: 1,
  },
  roleSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: 15,
  },
  platformBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },

  // 2-column metrics cards
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    justifyContent: 'center',
    ...shadows.xs,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  statNumberBlue: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  statNumberGreen: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },
  statNumberDark: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  statCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Full-width Revenue Card
  revenueCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
    marginBottom: 16,
    ...shadows.xs,
  },
  revenueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueTitle: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: '#166534',
  },
  revenueAmount: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: '#15803D',
    marginBottom: 6,
  },
  revenueFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 8,
  },
  revenueSub: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
  },
  revenueLink: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#166534',
  },

  // Platform Hub
  hubSection: {
    marginBottom: 18,
  },
  hubGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  hubTile: {
    width: '23%',
    alignItems: 'center',
  },
  hubIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hubLabel: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: '#334155',
    textAlign: 'center',
  },

  // Bar Chart Card
  chartCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
    ...shadows.xs,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 22,
    height: 85,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  alertBannerInfo: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#DC2626',
  },
  alertBannerSub: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },

  // Top Organizations
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  topCompaniesCard: {
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyFeedText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  topCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
  },
  topCompanyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  topCompanyInfo: {
    flex: 1,
  },
  topCompanyName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  topCompanySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  staffPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  staffPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
});
