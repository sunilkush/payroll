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

export default function StaffProfileScreen({ navigation }) {
  const { user, company, logout } = useAuth();
  const [activeModal, setActiveModal] = useState(null); // 'personal' | 'work' | 'bank' | 'pf' | 'settings' | 'help'

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
      id: 'work',
      title: 'Work Information',
      icon: 'briefcase-outline',
      onPress: () => setActiveModal('work'),
    },
    {
      id: 'bank',
      title: 'Bank Details',
      icon: 'bank-outline',
      onPress: () => setActiveModal('bank'),
    },
    {
      id: 'pf',
      title: 'PF & ESI Details',
      icon: 'shield-account-outline',
      onPress: () => setActiveModal('pf'),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'cog-outline',
      onPress: () => setActiveModal('settings'),
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
        title="My Profile"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Top Profile Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || 'Rahul Sharma')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
            <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.name || 'Rahul Sharma'}</Text>
        <Text style={styles.userCode}>
          Employee ID: {user?.employeeCode || 'EMP001'}
        </Text>
      </View>

      {/* List Options matching Screen 9 */}
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

      {/* Logout Button (Screen 9 Style: Light Red with red icon and text) */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Details Modals for items */}
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
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeModal === 'personal' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Full Name" value={user?.name || 'Rahul Sharma'} />
                  <InfoRow label="Email Address" value={user?.email || 'rahul.sharma@company.com'} />
                  <InfoRow label="Phone Number" value={user?.phone || '+91 98765 43210'} />
                  <InfoRow label="Date of Birth" value="15 Aug 1994" />
                  <InfoRow label="Gender" value="Male" />
                </View>
              )}

              {activeModal === 'work' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Employee ID" value={user?.employeeCode || 'EMP001'} />
                  <InfoRow label="Company" value={company?.name || 'Feature Payroll Corp'} />
                  <InfoRow label="Department" value={user?.department || 'Information Technology'} />
                  <InfoRow label="Designation" value={user?.designation || 'Senior Software Engineer'} />
                  <InfoRow label="Joining Date" value={user?.joiningDate ? formatDate(user.joiningDate) : '15 Jan 2022'} />
                  <InfoRow label="Work Mode" value="Full Time / Hybrid" />
                </View>
              )}

              {activeModal === 'bank' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Bank Name" value="HDFC Bank" />
                  <InfoRow label="Account Number" value="•••• •••• 9842" />
                  <InfoRow label="IFSC Code" value="HDFC0001234" />
                  <InfoRow label="Account Type" value="Salary Account" />
                </View>
              )}

              {activeModal === 'pf' && (
                <View style={styles.modalBody}>
                  <InfoRow label="EPF UAN Number" value="101294820194" />
                  <InfoRow label="EPF Member ID" value="DLCPM0019283000" />
                  <InfoRow label="EPF Rate" value="12% (Statutory)" />
                  <InfoRow label="ESI Insurance No." value="3192840192" />
                  <InfoRow label="ESI Applicable" value={user?.esiApplicable !== false ? 'Yes' : 'No'} />
                </View>
              )}

              {activeModal === 'settings' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Push Notifications" value="Enabled" />
                  <InfoRow label="App Version" value="v2.4.0 (Build 120)" />
                  <InfoRow label="Theme" value="Modern Light" />
                  <InfoRow label="Biometric Auth" value="Face ID / Fingerprint Ready" />
                </View>
              )}

              {activeModal === 'help' && (
                <View style={styles.modalBody}>
                  <InfoRow label="Support Email" value="support@payroll.app" />
                  <InfoRow label="HR Helpdesk" value="hr@company.com" />
                  <InfoRow label="FAQ & Guides" value="https://help.payroll.app" />
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
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.sm,
  },
  userName: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  userCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  menuCard: {
    padding: 0,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
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
});
