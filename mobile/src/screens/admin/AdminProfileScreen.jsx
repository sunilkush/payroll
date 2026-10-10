import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate } from '../../utils/format.js';
import { initials, ROLE_LABEL } from '../../utils/roles.js';

export default function AdminProfileScreen({ navigation }) {
  const { user, company, logout } = useAuth();
  const [activeModal, setActiveModal] = useState(null); // 'account' | 'company' | 'security' | 'help'

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from your Admin account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const navMenuItems = [
    {
      id: 'account',
      title: 'Administrator Account',
      subtitle: 'Personal details and credentials',
      icon: 'account-circle-outline',
      onPress: () => setActiveModal('account'),
    },
    {
      id: 'company',
      title: 'Company Profile & Info',
      subtitle: company?.name || 'Organization details',
      icon: 'domain',
      onPress: () => setActiveModal('company'),
    },
    {
      id: 'branches',
      title: 'Office Branches & Geofence',
      subtitle: 'Working hours, radius & GPS',
      icon: 'map-marker-radius-outline',
      onPress: () => navigation.navigate('AdminSettings'),
    },
    {
      id: 'billing',
      title: 'Subscription & Billing',
      subtitle: `Current Plan: ${company?.plan || 'Free'}`,
      icon: 'credit-card-outline',
      onPress: () => navigation.navigate('AdminBilling'),
    },
    {
      id: 'reports',
      title: 'Reports & Audit Logs',
      subtitle: 'Payroll, attendance & PF/ESI',
      icon: 'file-chart-outline',
      onPress: () => navigation.navigate('AdminReports'),
    },
    {
      id: 'security',
      title: 'Security & App Policy',
      subtitle: 'Password, session & encryption',
      icon: 'shield-check-outline',
      onPress: () => setActiveModal('security'),
    },
    {
      id: 'help',
      title: 'Support & Help Desk',
      subtitle: 'Documentation & system assistance',
      icon: 'help-circle-outline',
      onPress: () => setActiveModal('help'),
    },
  ];

  return (
    <ScreenWrapper scrollable contentContainerStyle={styles.container}>
      <Header
        title="Admin Profile"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Top Profile Header */}
      <Card style={styles.profileHeaderCard} elevation="sm">
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials(user?.name || 'AD')}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'admin@company.com'}</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={ROLE_LABEL[user?.role] || 'HR Admin'}
                variant="primary"
                size="sm"
              />
              <Badge
                label={`${company?.plan || 'Free'} Plan`}
                variant="info"
                size="sm"
                style={{ marginLeft: 6 }}
              />
            </View>
          </View>
        </View>

        {/* Company Quick Metric Strip */}
        <View style={styles.companyStrip}>
          <View style={styles.stripCol}>
            <Text style={styles.stripLabel}>Organization</Text>
            <Text style={styles.stripValue} numberOfLines={1}>
              {company?.name || 'Not Configured'}
            </Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripCol}>
            <Text style={styles.stripLabel}>Staff Limit</Text>
            <Text style={styles.stripValue}>
              {company?.staffLimit ? `${company.staffLimit} Members` : 'Unlimited'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Quick Services Navigation */}
      <Text style={styles.sectionTitle}>Administration & Settings</Text>
      <Card style={styles.menuCard} elevation="xs">
        {navMenuItems.map((item, index) => {
          const isLast = index === navMenuItems.length - 1;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, !isLast && styles.menuRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSub}>{item.subtitle}</Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </Card>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Sign Out from PayRoster</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>PayRoster Mobile v1.0.0 • Production Build</Text>

      {/* Details Modals */}
      <Modal
        visible={Boolean(activeModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {navMenuItems.find((m) => m.id === activeModal)?.title || 'Information'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeModal === 'account' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Admin Name" value={user?.name || '—'} />
                  <InfoRow label="Email Address" value={user?.email || '—'} />
                  <InfoRow label="Phone Number" value={user?.phone || 'Not added'} />
                  <InfoRow label="Access Role" value={ROLE_LABEL[user?.role] || 'HR Administrator'} />
                  <InfoRow label="Account Status" value="Active & Verified" />
                  <InfoRow label="Member Since" value={user?.createdAt ? formatDate(user.createdAt) : '2025'} />
                </View>
              )}

              {activeModal === 'company' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Company Name" value={company?.name || '—'} />
                  <InfoRow label="Business Email" value={company?.email || user?.email || '—'} />
                  <InfoRow label="Phone" value={company?.phone || 'Not provided'} />
                  <InfoRow label="Address" value={company?.address || 'Not configured'} />
                  <InfoRow label="Active Plan" value={`${company?.plan || 'Free'} Subscription`} />
                  <InfoRow label="Staff Allowance" value={company?.staffLimit ? `${company.staffLimit} Allowed` : 'Unlimited'} />
                  <InfoRow label="Payroll Status" value={company?.payrollEnabled ? 'Active' : 'Disabled'} />
                  <InfoRow label="Leave Policy" value={company?.leaveEnabled ? 'Active (CL & EL)' : 'Disabled'} />
                </View>
              )}

              {activeModal === 'security' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Authentication" value="JWT Bearer Token" />
                  <InfoRow label="Session Status" value="Encrypted Local SecureStore" />
                  <InfoRow label="Biometric Punch" value="Available on Punch Screen" />
                  <InfoRow label="Geofence Accuracy" value="GPS High Precision (10-100m)" />
                  <View style={styles.securityNote}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
                    <Text style={styles.securityNoteText}>
                      Your administrative credentials and company payroll calculations are end-to-end protected.
                    </Text>
                  </View>
                </View>
              )}

              {activeModal === 'help' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Documentation" value="payroster.io/docs" />
                  <InfoRow label="Support Email" value="support@payroster.io" />
                  <InfoRow label="Emergency Line" value="+91 (080) 4567-8900" />
                  <InfoRow label="App Version" value="1.0.0 (Material Design 3)" />
                  <Button
                    title="Close"
                    variant="primary"
                    size="md"
                    onPress={() => setActiveModal(null)}
                    style={{ marginTop: 16 }}
                  />
                </View>
              )}
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  profileHeaderCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    ...shadows.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stripCol: {
    flex: 1,
  },
  stripLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  stripValue: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  stripDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 10,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 20,
    ...shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  menuSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.danger,
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalBody: {
    paddingVertical: 4,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: colors.primary,
    flex: 1,
    lineHeight: 17,
  },
});
