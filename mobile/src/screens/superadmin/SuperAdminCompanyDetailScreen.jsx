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
import Badge from '../../components/common/Badge.jsx';
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
    badgeVariant: 'default',
    desc: 'Basic attendance & reports',
  },
  {
    key: 'STARTER',
    label: 'Starter',
    limit: 'Up to 50 staff',
    badgeVariant: 'primary',
    desc: 'Leave tracking & monthly payroll',
  },
  {
    key: 'PROFESSIONAL',
    label: 'Professional',
    limit: 'Up to 250 staff',
    badgeVariant: 'warning',
    desc: 'Statutory PF/ESI & field visits',
  },
  {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    limit: 'Unlimited staff',
    badgeVariant: 'success',
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
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Company Profile Form state
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

  // 1. Save Company Profile Details
  const handleSaveProfile = async () => {
    const errors = {};
    if (!profileForm.name.trim()) {
      errors.name = 'Company name is required';
    } else if (profileForm.name.trim().length < 2) {
      errors.name = 'Company name must be at least 2 characters';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileSaving(true);
    setProfileErrors({});

    try {
      await updateCompanyApi(companyId, {
        name: profileForm.name.trim(),
        address: profileForm.address.trim(),
        plan: profileForm.plan,
      });
      showToast('success', 'Company profile updated successfully.');
      fetchCompanyDetails();
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      if (Object.keys(fieldMap).length > 0) {
        setProfileErrors(fieldMap);
      } else {
        showToast('error', err.message || 'Failed to update company profile.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  // 2. Toggle Company Active / Blocked Status
  const handleToggleCompanyStatus = () => {
    if (!data?.company) return;
    const willBlock = data.company.isActive;

    NativeAlert.alert(
      willBlock ? `Block ${data.company.name}?` : `Unblock ${data.company.name}?`,
      willBlock
        ? 'All employees and admins of this company will immediately lose access and be unable to log in.'
        : 'Access will be restored for all staff and admin accounts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willBlock ? 'Block Tenant' : 'Unblock',
          style: willBlock ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await setCompanyStatusApi(companyId, !willBlock);
              showToast(
                'success',
                `${data.company.name} ${willBlock ? 'blocked' : 'unblocked'}.`
              );
              fetchCompanyDetails();
            } catch (err) {
              showToast('error', err.message || 'Status change failed.');
            }
          },
        },
      ]
    );
  };

  // 3. Decide Plan Upgrade Request (Approve / Reject)
  const handlePlanDecision = (action) => {
    const requestedPlan = data?.company?.planRequest?.requestedPlan;
    NativeAlert.alert(
      action === 'approve' ? 'Approve Upgrade?' : 'Reject Upgrade?',
      `${action === 'approve' ? 'Approve' : 'Reject'} upgrade of ${data?.company?.name} to ${requestedPlan}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await decidePlanRequestApi(companyId, action);
              showToast(
                'success',
                `Plan upgrade request ${action === 'approve' ? 'approved' : 'rejected'}.`
              );
              fetchCompanyDetails();
            } catch (err) {
              showToast('error', err.message || 'Action failed.');
            }
          },
        },
      ]
    );
  };

  // 4. Create New Admin
  const handleCreateAdmin = async () => {
    const errors = {};
    if (!adminForm.name.trim()) errors.name = 'Full name is required';
    if (!adminForm.email.trim()) errors.email = 'Email address is required';
    if (!adminForm.password.trim()) errors.password = 'Password is required';
    else if (adminForm.password.trim().length < 6)
      errors.password = 'Password must be at least 6 characters';

    if (Object.keys(errors).length > 0) {
      setAdminErrors(errors);
      return;
    }

    setAdminSaving(true);
    setAdminErrors({});

    try {
      await createAdminApi(companyId, {
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        phone: adminForm.phone.trim() || undefined,
        password: adminForm.password.trim(),
      });
      showToast('success', `Admin "${adminForm.name}" created successfully.`);
      setAddAdminModalVisible(false);
      setAdminForm(EMPTY_ADMIN_FORM);
      fetchCompanyDetails();
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      if (Object.keys(fieldMap).length > 0) {
        setAdminErrors(fieldMap);
      } else {
        setAdminErrors({ form: err.message || 'Failed to create admin.' });
      }
    } finally {
      setAdminSaving(false);
    }
  };

  // 5. Toggle Admin Active / Inactive
  const handleToggleAdminStatus = (admin) => {
    const nextStatus = !admin.isActive;
    NativeAlert.alert(
      nextStatus ? 'Activate Admin?' : 'Deactivate Admin?',
      `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} access for ${admin.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Activate' : 'Deactivate',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateAdminApi(companyId, admin._id, { isActive: nextStatus });
              showToast('success', `${admin.name} is now ${nextStatus ? 'active' : 'inactive'}.`);
              fetchCompanyDetails();
            } catch (err) {
              showToast('error', err.message || 'Failed to update admin.');
            }
          },
        },
      ]
    );
  };

  // 6. Reset Admin Password
  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');

    try {
      await updateAdminApi(companyId, selectedAdmin._id, {
        password: newPassword.trim(),
      });
      showToast('success', `Password reset for ${selectedAdmin.name}.`);
      setResetModalVisible(false);
      setSelectedAdmin(null);
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to reset password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Loading company profile..." />;
  }

  if (!data?.company) {
    return (
      <ScreenWrapper>
        <Header title="Company Profile" onBack={() => navigation.goBack()} />
        <Card style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Company Not Found</Text>
          <Text style={styles.errorSub}>The requested tenant company could not be retrieved.</Text>
          <Button
            title="Back to Companies"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16 }}
          />
        </Card>
      </ScreenWrapper>
    );
  }

  const { company, admins = [], staffCount = 0 } = data;

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header with Back button */}
      <Header
        title={company.name}
        subtitle="Edit Profile & Manage Tenant"
        onBack={() => navigation.goBack()}
        rightIcon={company.isActive ? 'shield-check' : 'shield-alert'}
      />

      {/* Action Notification Message */}
      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* Company Summary Banner Card */}
      <Card style={styles.summaryCard} elevation="md">
        <View style={styles.summaryHeader}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="domain" size={28} color={colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>{company.name}</Text>
            <Text style={styles.summaryDate}>
              Created on {formatDate(company.createdAt)}
            </Text>
          </View>
          <Badge
            label={company.isActive ? 'Active Tenant' : 'Blocked'}
            variant={company.isActive ? 'success' : 'danger'}
          />
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{staffCount}</Text>
            <Text style={styles.statLabel}>Staff Count</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{admins.length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{company.locations?.length || 0}</Text>
            <Text style={styles.statLabel}>Locations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Badge label={company.plan || 'FREE'} variant="primary" size="sm" />
            <Text style={[styles.statLabel, { marginTop: 4 }]}>Current Plan</Text>
          </View>
        </View>

        {/* Status Toggle Button */}
        <View style={styles.statusActionRow}>
          <TouchableOpacity
            style={[
              styles.toggleStatusBtn,
              company.isActive ? styles.btnBlock : styles.btnUnblock,
            ]}
            onPress={handleToggleCompanyStatus}
          >
            <MaterialCommunityIcons
              name={company.isActive ? 'cancel' : 'check-circle-outline'}
              size={18}
              color={company.isActive ? colors.danger : colors.success}
            />
            <Text
              style={[
                styles.toggleStatusBtnText,
                { color: company.isActive ? colors.danger : colors.success },
              ]}
            >
              {company.isActive ? 'Block This Tenant' : 'Unblock Tenant Access'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Pending Plan Upgrade Request Box */}
      {company.planRequest?.requestedPlan && (
        <Card style={styles.upgradeCard} elevation="sm">
          <View style={styles.upgradeHeader}>
            <MaterialCommunityIcons name="arrow-up-bold-circle" size={24} color={colors.info} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.upgradeTitle}>Upgrade Request Pending</Text>
              <Text style={styles.upgradeSub}>
                Requested Plan:{' '}
                <Text style={{ fontWeight: typography.weights.bold, color: colors.info }}>
                  {company.planRequest.requestedPlan}
                </Text>
                {company.planRequest.note ? ` • "${company.planRequest.note}"` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.upgradeActions}>
            <Button
              title="Approve Upgrade"
              variant="primary"
              size="sm"
              icon="check"
              onPress={() => handlePlanDecision('approve')}
              style={styles.decisionBtn}
            />
            <Button
              title="Reject Request"
              variant="danger"
              size="sm"
              icon="close"
              onPress={() => handlePlanDecision('reject')}
              style={styles.decisionBtn}
            />
          </View>
        </Card>
      )}

      {/* Company Profile Edit Section */}
      <Card style={styles.sectionCard} elevation="sm">
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Company Profile Details</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Update tenant organization details and subscription tier.
        </Text>

        <Input
          label="Company Name *"
          value={profileForm.name}
          onChangeText={(val) => setProfileForm((p) => ({ ...p, name: val }))}
          placeholder="e.g. Acme Innovations Pvt Ltd"
          prefixIcon="domain"
          error={profileErrors.name}
          containerStyle={styles.inputSpacing}
        />

        <Input
          label="Registered Address"
          value={profileForm.address}
          onChangeText={(val) => setProfileForm((p) => ({ ...p, address: val }))}
          placeholder="Street address, city, state, postal code"
          prefixIcon="map-marker-outline"
          multiline
          numberOfLines={2}
          error={profileErrors.address}
          containerStyle={styles.inputSpacing}
        />

        {/* Subscription Plan Picker */}
        <Text style={styles.planPickerLabel}>Subscription Plan Tier</Text>
        <View style={styles.planGrid}>
          {PLAN_OPTIONS.map((plan) => {
            const isSelected = profileForm.plan === plan.key;
            return (
              <TouchableOpacity
                key={plan.key}
                activeOpacity={0.8}
                style={[
                  styles.planOptionCard,
                  isSelected && styles.planOptionCardSelected,
                ]}
                onPress={() => setProfileForm((p) => ({ ...p, plan: plan.key }))}
              >
                <View style={styles.planCardHeader}>
                  <Text
                    style={[
                      styles.planOptionTitle,
                      isSelected && styles.planOptionTitleSelected,
                    ]}
                  >
                    {plan.label}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </View>
                <Badge
                  label={plan.limit}
                  variant={plan.badgeVariant}
                  size="sm"
                  style={styles.planBadge}
                />
                <Text style={styles.planDesc}>{plan.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save Profile Button */}
        <Button
          title="Save Company Profile"
          icon="content-save-outline"
          loading={profileSaving}
          onPress={handleSaveProfile}
          style={styles.saveBtn}
        />
      </Card>

      {/* Administrators Management Section */}
      <Card style={styles.sectionCard} elevation="sm">
        <View style={styles.adminSectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="shield-account" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>
              Administrators ({admins.length})
            </Text>
          </View>
          <Button
            title="Add Admin"
            size="sm"
            variant="outline"
            icon="plus"
            onPress={() => {
              setAdminForm(EMPTY_ADMIN_FORM);
              setAdminErrors({});
              setAddAdminModalVisible(true);
            }}
          />
        </View>

        {admins.length === 0 ? (
          <View style={styles.emptyAdminsBox}>
            <MaterialCommunityIcons
              name="account-alert-outline"
              size={36}
              color={colors.warning}
            />
            <Text style={styles.emptyAdminsTitle}>No Administrators Assigned</Text>
            <Text style={styles.emptyAdminsSub}>
              This company currently has no tenant administrators. Click "Add Admin" to grant login access.
            </Text>
          </View>
        ) : (
          <View style={styles.adminList}>
            {admins.map((admin) => (
              <View key={admin._id} style={styles.adminCard}>
                <View style={styles.adminTopRow}>
                  <View style={styles.adminAvatar}>
                    <Text style={styles.adminAvatarText}>{initials(admin.name)}</Text>
                  </View>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminName}>{admin.name}</Text>
                    <Text style={styles.adminEmail}>
                      <MaterialCommunityIcons name="email-outline" size={13} color={colors.textSecondary} />{' '}
                      {admin.email}
                    </Text>
                    {admin.phone ? (
                      <Text style={styles.adminPhone}>
                        <MaterialCommunityIcons name="phone-outline" size={13} color={colors.textSecondary} />{' '}
                        {admin.phone}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={admin.isActive ? 'Active' : 'Disabled'}
                    variant={admin.isActive ? 'success' : 'danger'}
                    size="sm"
                  />
                </View>

                {/* Admin Action Buttons */}
                <View style={styles.adminActionRow}>
                  <TouchableOpacity
                    style={styles.adminActionBtn}
                    onPress={() => {
                      setSelectedAdmin(admin);
                      setNewPassword('');
                      setPasswordError('');
                      setResetModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="lock-reset" size={15} color={colors.primary} />
                    <Text style={styles.adminActionBtnText}>Reset Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.adminActionBtn}
                    onPress={() => handleToggleAdminStatus(admin)}
                  >
                    <MaterialCommunityIcons
                      name={admin.isActive ? 'account-off-outline' : 'account-check-outline'}
                      size={15}
                      color={admin.isActive ? colors.danger : colors.success}
                    />
                    <Text
                      style={[
                        styles.adminActionBtnText,
                        { color: admin.isActive ? colors.danger : colors.success },
                      ]}
                    >
                      {admin.isActive ? 'Disable' : 'Enable'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Add Admin Modal */}
      <Modal
        visible={addAdminModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddAdminModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Company Administrator</Text>
              <TouchableOpacity onPress={() => setAddAdminModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {adminErrors.form ? <Alert type="error">{adminErrors.form}</Alert> : null}

              <Input
                label="Full Name *"
                value={adminForm.name}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Rahul Sharma"
                prefixIcon="account"
                error={adminErrors.name}
                containerStyle={styles.inputSpacing}
              />

              <Input
                label="Email Address *"
                value={adminForm.email}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, email: t }))}
                placeholder="admin@company.com"
                prefixIcon="email"
                keyboardType="email-address"
                error={adminErrors.email}
                containerStyle={styles.inputSpacing}
              />

              <Input
                label="Phone Number"
                value={adminForm.phone}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, phone: t }))}
                placeholder="e.g. 9876543210"
                prefixIcon="phone"
                keyboardType="phone-pad"
                error={adminErrors.phone}
                containerStyle={styles.inputSpacing}
              />

              <Input
                label="Login Password *"
                value={adminForm.password}
                onChangeText={(t) => setAdminForm((p) => ({ ...p, password: t }))}
                placeholder="At least 6 characters"
                prefixIcon="lock"
                secureTextEntry
                error={adminErrors.password}
                containerStyle={styles.inputSpacing}
              />

              <Button
                title="Create Administrator"
                icon="account-plus"
                onPress={handleCreateAdmin}
                loading={adminSaving}
                style={styles.modalSubmitBtn}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Admin Password</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.resetModalSub}>
              Set a new secure password for{' '}
              <Text style={{ fontWeight: typography.weights.bold }}>
                {selectedAdmin?.name}
              </Text>{' '}
              ({selectedAdmin?.email}).
            </Text>

            <Input
              label="New Password *"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 6 characters"
              prefixIcon="lock-reset"
              secureTextEntry
              error={passwordError}
              containerStyle={styles.inputSpacing}
            />

            <Button
              title="Update Password"
              icon="check"
              onPress={handleResetPassword}
              loading={passwordSaving}
              style={styles.modalSubmitBtn}
            />
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
  errorCard: {
    alignItems: 'center',
    padding: 24,
    marginTop: 24,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
  },
  errorSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  summaryDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  statusActionRow: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  toggleStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  btnBlock: {
    backgroundColor: colors.dangerBg,
    borderColor: '#fecaca',
  },
  btnUnblock: {
    backgroundColor: colors.successBg,
    borderColor: '#bbf7d0',
  },
  toggleStatusBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginLeft: 6,
  },
  upgradeCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    marginBottom: 16,
    padding: 14,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.info,
  },
  upgradeSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionBtn: {
    flex: 1,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: 6,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputSpacing: {
    marginBottom: 14,
  },
  planPickerLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  planOptionCard: {
    width: '48.5%',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 10,
  },
  planOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planOptionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  planOptionTitleSelected: {
    color: colors.primaryDark,
  },
  planBadge: {
    marginBottom: 6,
  },
  planDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  saveBtn: {
    marginTop: 4,
  },
  adminSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyAdminsBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
  },
  emptyAdminsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 8,
  },
  emptyAdminsSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  adminList: {
    gap: 10,
  },
  adminCard: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  adminTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  adminAvatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  adminEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminPhone: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  adminActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 8,
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminActionBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  resetModalSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalSubmitBtn: {
    marginTop: 12,
    marginBottom: 8,
  },
});
