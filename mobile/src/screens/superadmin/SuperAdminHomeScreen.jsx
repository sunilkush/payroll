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
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loader from '../../components/common/Loader.jsx';
import NotificationCenterModal from '../../components/common/NotificationCenterModal.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { greeting } from '../../utils/format.js';
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

  return (
    <ScreenWrapper scrollable={false}>
      {/* Top Bar with Greeting & Notification Bell */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.userNameText}>{user?.name || 'Super Admin'}</Text>
          <Badge label="Super Admin" variant="danger" size="sm" style={styles.roleBadge} />
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
            {withoutAdminCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatarBtn} onPress={handleLogout}>
            <Text style={styles.avatarText}>{initials(user?.name || 'SA')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Loader message="Loading platform analytics..." />
        ) : (
          <>
            {/* 4 Platform KPI Tiles */}
            <Text style={styles.sectionTitle}>Platform Overview</Text>
            <View style={styles.statsGrid}>
              <Card style={styles.statCard} elevation="sm">
                <View style={[styles.statIconBadge, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons name="domain" size={20} color={colors.primary} />
                </View>
                <Text style={styles.statVal}>{kpis.companies?.value ?? 0}</Text>
                <Text style={styles.statLabel}>Total Tenants</Text>
                {kpis.companies?.newThisMonth > 0 && (
                  <Text style={styles.statSubText}>+{kpis.companies.newThisMonth} this month</Text>
                )}
              </Card>

              <Card style={styles.statCard} elevation="sm">
                <View style={[styles.statIconBadge, { backgroundColor: colors.successBg }]}>
                  <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />
                </View>
                <Text style={styles.statVal}>{kpis.active?.value ?? 0}</Text>
                <Text style={styles.statLabel}>Active Tenants</Text>
                {kpis.active?.blocked > 0 && (
                  <Text style={[styles.statSubText, { color: colors.danger }]}>
                    {kpis.active.blocked} blocked
                  </Text>
                )}
              </Card>

              <Card style={styles.statCard} elevation="sm">
                <View style={[styles.statIconBadge, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialCommunityIcons name="account-group" size={20} color={colors.info} />
                </View>
                <Text style={styles.statVal}>{kpis.staff?.value ?? 0}</Text>
                <Text style={styles.statLabel}>Total Staff</Text>
                {kpis.staff?.newThisMonth > 0 && (
                  <Text style={styles.statSubText}>+{kpis.staff.newThisMonth} this month</Text>
                )}
              </Card>

              <Card style={styles.statCard} elevation="sm">
                <View style={[styles.statIconBadge, { backgroundColor: '#fef3c7' }]}>
                  <MaterialCommunityIcons name="shield-account" size={20} color={colors.warning} />
                </View>
                <Text style={styles.statVal}>{kpis.admins?.value ?? 0}</Text>
                <Text style={styles.statLabel}>Org Admins</Text>
              </Card>
            </View>

            {/* Critical Alert Banner if companies lack admin */}
            {withoutAdminCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.alertBanner}
                onPress={() => navigation.navigate('SuperAdminCompanies')}
              >
                <MaterialCommunityIcons name="alert-circle" size={22} color={colors.danger} />
                <View style={styles.alertBannerInfo}>
                  <Text style={styles.alertBannerTitle}>
                    {withoutAdminCount} Company(s) Require an Admin
                  </Text>
                  <Text style={styles.alertBannerSub}>
                    Tap to view organizations and assign administrator accounts.
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.danger} />
              </TouchableOpacity>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Management Modules</Text>
            <View style={styles.modulesList}>
              <TouchableOpacity
                style={styles.moduleRow}
                onPress={() => navigation.navigate('SuperAdminCompanies')}
                activeOpacity={0.7}
              >
                <View style={[styles.moduleIconCircle, { backgroundColor: '#e0e7ff' }]}>
                  <MaterialCommunityIcons name="domain" size={22} color={colors.primary} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>Company Accounts & Upgrades</Text>
                  <Text style={styles.moduleDesc}>Onboard tenants, block/unblock, review plan requests</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moduleRow}
                onPress={() => navigation.navigate('SuperAdminSettings')}
                activeOpacity={0.7}
              >
                <View style={[styles.moduleIconCircle, { backgroundColor: '#ede9fe' }]}>
                  <MaterialCommunityIcons name="cog-outline" size={22} color={colors.chart1} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>Global Statutory Rules</Text>
                  <Text style={styles.moduleDesc}>Configure nationwide PF & ESI rates, ceilings & rules</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Top Companies by Headcount */}
            {topCompanies.length > 0 && (
              <View style={styles.topCompaniesSection}>
                <Text style={styles.sectionTitle}>Top Organizations by Headcount</Text>
                <Card style={styles.topCompaniesCard} elevation="sm">
                  {topCompanies.map((c, i) => (
                    <View
                      key={c._id || i}
                      style={[
                        styles.topCompanyRow,
                        i < topCompanies.length - 1 && styles.topCompanyBorder,
                      ]}
                    >
                      <View style={styles.rankCircle}>
                        <Text style={styles.rankText}>{i + 1}</Text>
                      </View>
                      <View style={styles.topCompanyInfo}>
                        <Text style={styles.topCompanyName}>{c.name}</Text>
                        <Text style={styles.topCompanySub}>
                          {c.admins} Admin(s) • {c.isActive ? 'Active' : 'Blocked'}
                        </Text>
                      </View>
                      <Badge
                        label={`${c.staff} Staff`}
                        variant="primary"
                        size="sm"
                      />
                    </View>
                  ))}
                </Card>
              </View>
            )}

            <Button
              title="Sign Out"
              onPress={handleLogout}
              variant="outline"
              icon="logout"
              style={styles.logoutBtn}
            />
          </>
        )}
      </ScrollView>

      {/* Notifications / Action Items Modal */}
      <NotificationCenterModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        navigation={navigation}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
    alignSelf: 'flex-start',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  avatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 14,
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statSubText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerBg,
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  alertBannerInfo: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.danger,
  },
  alertBannerSub: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  modulesList: {
    gap: 12,
    marginBottom: 16,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 14,
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
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  moduleDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topCompaniesSection: {
    marginBottom: 20,
  },
  topCompaniesCard: {
    padding: 8,
  },
  topCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  topCompanyBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },
  topCompanyInfo: {
    flex: 1,
  },
  topCompanyName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  topCompanySub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  logoutBtn: {
    marginTop: 8,
  },
});
