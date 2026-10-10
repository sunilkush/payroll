import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  createAdminApi,
  decidePlanRequestApi,
  getCompanyApi,
  setCompanyStatusApi,
  updateAdminApi,
  updateCompanyApi,
} from '../../api/companyApi.js';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { toFieldErrors } from '../../utils/formErrors.js';
import { formatDate } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

const PLAN_OPTIONS = [
  {
    key: 'FREE',
    label: 'Free',
    limit: 'Up to 10 staff',
    desc: 'Basic attendance & reports',
  },
  {
    key: 'STARTER',
    label: 'Starter',
    limit: 'Up to 50 staff',
    desc: 'Leave tracking & monthly payroll',
  },
  {
    key: 'PROFESSIONAL',
    label: 'Professional',
    limit: 'Up to 250 staff',
    desc: 'Statutory PF/ESI & field visits',
  },
  {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    limit: 'Unlimited staff',
    desc: 'Multi-branch & priority support',
  },
];

const EMPTY_ADMIN_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
};

export default function SuperAdminCompanyDetailScreen({ route, navigation }) {
  const companyId = route.params?.companyId || route.params?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Admins' | 'Plan' | 'Security'
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Company Profile Edit Modal state
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    plan: 'ENTERPRISE',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  // Add Admin Modal state
  const [addAdminModalVisible, setAddAdminModalVisible] = useState(false);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [adminErrors, setAdminErrors] = useState({});
  const [adminSaving, setAdminSaving] = useState(false);

  // Reset Password Modal state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fetchCompanyDetails = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await getCompanyApi(companyId);
      const companyData = res?.data;
      if (companyData) {
        setData(companyData);
        setProfileForm({
          name: companyData.company?.name || '',
          address: companyData.company?.address || '',
          plan: companyData.company?.plan || 'ENTERPRISE',
        });
      }
    } catch (err) {
      setActionMsg({
        type: 'error',
        text: err.message || 'Failed to load company details.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanyDetails();
  };

  const showToast = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => {
      setActionMsg({ type: 'success', text: '' });
    }, 3500);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileErrors({});
    try {
      const payload = {
        name: profileForm.name.trim(),
        address: profileForm.address.trim(),
        plan: profileForm.plan,
      };
      await updateCompanyApi(companyId, payload);
      showToast('success', 'Company profile updated successfully.');
      setEditProfileModalVisible(false);
      fetchCompanyDetails();
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setProfileErrors(fieldMap);
      showToast('error', Object.keys(fieldMap).length ? 'Please check input fields.' : err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleStatus = (company) => {
    const willBlock = company.isActive;
    NativeAlert.alert(
      willBlock ? `Block ${company.name}?` : `Unblock ${company.name}?`,
      willBlock
        ? 'All employees and admins will lose access to the portal immediately.'
        : 'Access will be restored for all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willBlock ? 'Block Tenant' : 'Unblock',
          style: willBlock ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await setCompanyStatusApi(company._id, !willBlock);
              showToast('success', `${company.name} ${willBlock ? 'blocked' : 'unblocked'}.`);
              fetchCompanyDetails();
            } catch (err) {
              showToast('error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleAddAdmin = async () => {
    setAdminSaving(true);
    setAdminErrors({});
    try {
      const payload = {
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        phone: adminForm.phone.trim(),
        password: adminForm.password.trim(),
      };
      await createAdminApi(companyId, payload);
      showToast('success', `Admin ${payload.name} created successfully.`);
      setAddAdminModalVisible(false);
      setAdminForm(EMPTY_ADMIN_FORM);
      fetchCompanyDetails();
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setAdminErrors(fieldMap);
      showToast('error', Object.keys(fieldMap).length ? 'Please check errors.' : err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    try {
      await updateAdminApi(companyId, selectedAdmin._id, { password: newPassword });
      showToast('success', `Password for ${selectedAdmin.name} updated.`);
      setResetModalVisible(false);
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Password update failed.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const company = data?.company;
  const admins = data?.admins || [];

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Company Details"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="pencil-outline"
        onRightPress={() => setEditProfileModalVisible(true)}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {loading ? (
        <Loader message="Loading company details..." />
      ) : !company ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="domain-off" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Company not found</Text>
        </Card>
      ) : (
        <View style={styles.body}>
          {/* Top Company Header Card */}
          <View style={styles.companyHeaderBox}>
            <View style={styles.companyAvatar}>
              <Text style={styles.companyAvatarText}>{initials(company.name)}</Text>
            </View>
            <Text style={styles.companyTitle}>{company.name}</Text>
            <Text style={styles.companySubtitle}>
              {company.plan || 'Standard'} Plan • {company.address || 'India'}
            </Text>
            <View
              style={[
                styles.statusPill,
                company.isActive ? styles.activePill : styles.blockedPill,
                { marginTop: 8 },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  company.isActive ? styles.activePillText : styles.blockedPillText,
                ]}
              >
                • {company.isActive ? 'Active Tenant' : 'Blocked Tenant'}
              </Text>
            </View>
          </View>

          {/* Navigation Tabs: [Overview] [Admins] [Plan] [Security] */}
          <View style={styles.tabsRow}>
            {['Overview', 'Admins', 'Plan', 'Security'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab 1: Overview */}
          {activeTab === 'Overview' && (
            <View style={styles.tabContent}>
              <Card style={styles.infoCard} elevation="xs">
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="domain" size={20} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Company Legal Name</Text>
                    <Text style={styles.infoValue}>{company.name}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Office Address</Text>
                    <Text style={styles.infoValue}>{company.address || 'Not specified'}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Onboarded On</Text>
                    <Text style={styles.infoValue}>{formatDate(company.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-group-outline" size={20} color={colors.textSecondary} />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Total Employees</Text>
                    <Text style={styles.infoValue}>{data?.staffCount ?? 0} Staff Members</Text>
                  </View>
                </View>
              </Card>

              {/* Edit Company Profile Button */}
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => setEditProfileModalVisible(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#FFFFFF" />
                <Text style={styles.editProfileBtnText}>Edit Company Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 2: Admins */}
          {activeTab === 'Admins' && (
            <View style={styles.tabContent}>
              <View style={styles.adminsHeaderRow}>
                <Text style={styles.sectionTitle}>Organization Administrators ({admins.length})</Text>
                <TouchableOpacity
                  style={styles.addAdminBtn}
                  onPress={() => setAddAdminModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="account-plus" size={16} color={colors.primary} />
                  <Text style={styles.addAdminBtnText}>Add Admin</Text>
                </TouchableOpacity>
              </View>

              {admins.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={40} color={colors.warning} />
                  <Text style={styles.emptyTitle}>No Administrators</Text>
                  <Text style={styles.emptySub}>Add an admin so this company can access their workspace.</Text>
                </Card>
              ) : (
                <View style={styles.adminsList}>
                  {admins.map((adm) => (
                    <Card key={adm._id} style={styles.adminCard} elevation="xs">
                      <View style={styles.adminRow}>
                        <View style={styles.adminAvatar}>
                          <Text style={styles.adminAvatarText}>{initials(adm.name)}</Text>
                        </View>
                        <View style={styles.adminInfo}>
                          <Text style={styles.adminName}>{adm.name}</Text>
                          <Text style={styles.adminEmail}>{adm.email}</Text>
                          {adm.phone ? <Text style={styles.adminPhone}>{adm.phone}</Text> : null}
                        </View>
                        <TouchableOpacity
                          style={styles.resetKeyBtn}
                          onPress={() => {
                            setSelectedAdmin(adm);
                            setResetModalVisible(true);
                          }}
                        >
                          <MaterialCommunityIcons name="key-change" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Tab 3: Plan & Billing */}
          {activeTab === 'Plan' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Subscription Tiers</Text>
              <View style={styles.plansList}>
                {PLAN_OPTIONS.map((plan) => {
                  const isCurrent = (company.plan || 'ENTERPRISE').toUpperCase() === plan.key;
                  return (
                    <Card
                      key={plan.key}
                      style={[styles.planCard, isCurrent && styles.planCardActive]}
                      elevation="xs"
                    >
                      <View style={styles.planCardHeader}>
                        <View>
                          <Text style={styles.planCardTitle}>{plan.label}</Text>
                          <Text style={styles.planCardLimit}>{plan.limit}</Text>
                        </View>
                        {isCurrent ? (
                          <View style={styles.currentPlanBadge}>
                            <Text style={styles.currentPlanBadgeText}>Active Plan</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.planCardDesc}>{plan.desc}</Text>
                    </Card>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tab 4: Security */}
          {activeTab === 'Security' && (
            <View style={styles.tabContent}>
              <Card style={styles.dangerCard} elevation="xs">
                <Text style={styles.dangerTitle}>Tenant Access Control</Text>
                <Text style={styles.dangerDesc}>
                  {company.isActive
                    ? 'Temporarily disable login access for all staff and admins of this company.'
                    : 'Restore full access for this company tenant.'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    company.isActive ? styles.blockBtn : styles.unblockBtn,
                  ]}
                  onPress={() => handleToggleStatus(company)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={company.isActive ? 'lock-outline' : 'lock-open-outline'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.statusToggleBtnText}>
                    {company.isActive ? 'Block Tenant Access' : 'Unblock Tenant Access'}
                  </Text>
                </TouchableOpacity>
              </Card>
            </View>
          )}
        </View>
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Company Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Company Name *"
                value={profileForm.name}
                onChangeText={(t) => setProfileForm((p) => ({ ...p, name: t }))}
                placeholder="Company Name"
                error={profileErrors.name}
              />

              <Input
                label="Office Address"
                value={profileForm.address}
                onChangeText={(t) => setProfileForm((p) => ({ ...p, address: t }))}
                placeholder="Office Address"
              />

              <Text style={styles.inputSectionLabel}>Subscription Plan</Text>
              <View style={styles.planSelectorRow}>
                {PLAN_OPTIONS.map((p) => {
                  const isSelected = profileForm.plan === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.planChip, isSelected && styles.planChipActive]}
                      onPress={() => setProfileForm((prev) => ({ ...prev, plan: p.key }))}
                    >
                      <Text style={[styles.planChipText, isSelected && styles.planChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setEditProfileModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  loading={profileSaving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Add Admin Modal */}
      <Modal
        visible={addAdminModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddAdminModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Organization Admin</Text>
              <TouchableOpacity onPress={() => setAddAdminModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name *"
                value={adminForm.name}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, name: t }))}
                placeholder="Admin Name"
                error={adminErrors.name}
              />

              <Input
                label="Email Address *"
                value={adminForm.email}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, email: t }))}
                placeholder="admin@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={adminErrors.email}
              />

              <Input
                label="Phone Number"
                value={adminForm.phone}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, phone: t }))}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />

              <Input
                label="Initial Password *"
                value={adminForm.password}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, password: t }))}
                placeholder="••••••••"
                secureTextEntry
                error={adminErrors.password}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setAddAdminModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Admin"
                  onPress={handleAddAdmin}
                  loading={adminSaving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Set a new login password for {selectedAdmin?.name}.
            </Text>

            <Input
              label="New Password *"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry
              error={passwordError}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setResetModalVisible(false);
                  setNewPassword('');
                  setPasswordError('');
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Update Password"
                onPress={handleResetPassword}
                loading={passwordSaving}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  body: {
    gap: 16,
    marginTop: 6,
  },
  companyHeaderBox: {
    alignItems: 'center',
    marginVertical: 10,
  },
  companyAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  companyAvatarText: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  companyTitle: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  companySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
  },
  activePillText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  blockedPill: {
    backgroundColor: '#FEE2E2',
  },
  blockedPillText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },

  // Tabs Row
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },

  tabContent: {
    gap: 14,
  },
  infoCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  editProfileBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
    ...shadows.sm,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },

  // Admins
  adminsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  addAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAdminBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  adminsList: {
    gap: 10,
  },
  adminCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  adminEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  adminPhone: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  resetKeyBtn: {
    padding: 6,
  },

  // Plans
  plansList: {
    gap: 10,
  },
  planCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planCardTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  planCardLimit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  currentPlanBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  currentPlanBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  planCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Security / Danger zone
  dangerCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#DC2626',
    marginBottom: 4,
  },
  dangerDesc: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 16,
  },
  statusToggleBtn: {
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  blockBtn: {
    backgroundColor: '#DC2626',
  },
  unblockBtn: {
    backgroundColor: colors.primary,
  },
  statusToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxHeight: '90%',
    padding: 20,
    borderRadius: borderRadius.xl,
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
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputSectionLabel: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  planSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  planChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
  },
  planChipActive: {
    backgroundColor: colors.primary,
  },
  planChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  planChipTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
