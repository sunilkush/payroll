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
  const [activeModal, setActiveModal] = useState(null); // 'personal' | 'company' | 'security' | 'help'

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: 'account-outline',
      onPress: () => setActiveModal('personal'),
    },
    {
      id: 'company',
      title: 'Company Information',
      icon: 'domain',
      onPress: () => setActiveModal('company'),
    },
    {
      id: 'office',
      title: 'Office & Geofence Settings',
      icon: 'map-marker-radius-outline',
      onPress: () => navigation.navigate('AdminSettings'),
    },
    {
      id: 'billing',
      title: 'Subscription & Billing',
      icon: 'credit-card-outline',
      onPress: () => navigation.navigate('AdminBilling'),
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: 'file-chart-outline',
      onPress: () => navigation.navigate('AdminReports'),
    },
    {
      id: 'security',
      title: 'Security & App Policy',
      icon: 'shield-check-outline',
      onPress: () => setActiveModal('security'),
    },
    {
      id: 'help',
      title: 'Help & Support',
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

      {/* Top Profile Avatar & Name (Matching StaffProfileScreen style) */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials(user?.name || 'AD')}
            </Text>
          </View>
          <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
            <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
        <Text style={styles.userCode}>
          {ROLE_LABEL[user?.role] || 'HR Administrator'} • {company?.name || 'PayRoster'}
        </Text>

        {/* Status & Plan Chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chipPillPrimary}>
            <Text style={styles.chipTextPrimary}>
              {company?.plan ? `${company.plan} Plan` : 'Free Tier'}
            </Text>
          </View>
          <View style={styles.chipPillSecondary}>
            <Text style={styles.chipTextSecondary}>
              {company?.staffLimit ? `${company.staffLimit} Staff Limit` : 'Unlimited Staff'}
            </Text>
          </View>
        </View>
      </View>

      {/* List Options Card (Matching Screen 9 / StaffProfileScreen) */}
      <Card style={styles.menuCard} elevation="xs">
        {menuItems.map((item, index) => {
          const isLast = index === menuItems.length - 1;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, !isLast && styles.menuRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={colors.textSecondary}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuTitle}>{item.title}</Text>
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

      {/* Logout Button (Light Red with red icon and text - identical to StaffProfileScreen) */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>PayRoster Admin Console • v1.0.0</Text>

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
                {menuItems.find((m) => m.id === activeModal)?.title || 'Details'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeModal === 'personal' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Admin Name" value={user?.name || '—'} />
                  <InfoRow label="Email Address" value={user?.email || '—'} />
                  <InfoRow label="Phone Number" value={user?.phone || 'Not added'} />
                  <InfoRow label="Role / Privilege" value={ROLE_LABEL[user?.role] || 'HR Administrator'} />
                  <InfoRow label="Account Status" value="Active & Verified" />
                  <InfoRow label="Joined Since" value={user?.createdAt ? formatDate(user.createdAt) : '2025'} />
                </View>
              )}

              {activeModal === 'company' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Company Name" value={company?.name || '—'} />
                  <InfoRow label="Business Email" value={company?.email || user?.email || '—'} />
                  <InfoRow label="Phone Number" value={company?.phone || 'Not configured'} />
                  <InfoRow label="Headquarters" value={company?.address || 'Not configured'} />
                  <InfoRow label="Subscription Plan" value={`${company?.plan || 'Free'} Tier`} />
                  <InfoRow label="Staff Allowance" value={company?.staffLimit ? `${company.staffLimit} Members` : 'Unlimited'} />
                  <InfoRow label="Payroll System" value={company?.payrollEnabled !== false ? 'Active' : 'Disabled'} />
                  <InfoRow label="Leave Policy" value={company?.leaveEnabled !== false ? 'Active (CL & EL)' : 'Disabled'} />
                </View>
              )}

              {activeModal === 'security' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Authentication Mode" value="JWT Bearer Token" />
                  <InfoRow label="Storage Security" value="Encrypted Local SecureStore" />
                  <InfoRow label="Biometric Punch" value="Supported on Staff App" />
                  <InfoRow label="Geofence Accuracy" value="GPS Precision (10-100m)" />
                  <View style={styles.securityNote}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
                    <Text style={styles.securityNoteText}>
                      Your administrative credentials and payroll records are end-to-end encrypted with HTTPS.
                    </Text>
                  </View>
                </View>
              )}

              {activeModal === 'help' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Support Email" value="support@payroster.io" />
                  <InfoRow label="Emergency Line" value="+91 (080) 4567-8900" />
                  <InfoRow label="Documentation" value="https://payroster.io/docs" />
                  <InfoRow label="Console Version" value="v1.0.0 (Production)" />
                </View>
              )}

              <Button
                title="Close"
                variant="outline"
                onPress={() => setActiveModal(null)}
                style={{ marginTop: 20 }}
              />
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
  profileHeader: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: typography.weights.bold,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0F172A',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  userCode: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  chipPillPrimary: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  chipTextPrimary: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  chipPillSecondary: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipTextSecondary: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  menuCard: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: borderRadius.lg,
    marginBottom: 20,
    marginTop: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: typography.weights.semibold,
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 20,
    borderRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalBody: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: colors.primary,
    flex: 1,
    lineHeight: 17,
  },
});
