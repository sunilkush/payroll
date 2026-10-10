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
  createCompanyApi,
  decidePlanRequestApi,
  listCompaniesApi,
  setCompanyStatusApi,
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

const EMPTY_COMPANY_FORM = {
  name: '',
  address: '',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
};

export default function SuperAdminCompaniesScreen({ navigation }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'blocked' | 'upgrade'
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_COMPANY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await listCompaniesApi({
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setCompanies(res?.data?.items || []);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to load companies.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const handleToggleStatus = (company) => {
    const willBlock = company.isActive;
    NativeAlert.alert(
      willBlock ? `Block ${company.name}?` : `Unblock ${company.name}?`,
      willBlock
        ? 'All employees and admins of this company will be unable to log in.'
        : 'Access will be restored for all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willBlock ? 'Block Tenant' : 'Unblock',
          style: willBlock ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await setCompanyStatusApi(company._id, !willBlock);
              setActionMsg({
                type: 'success',
                text: `${company.name} ${willBlock ? 'blocked' : 'unblocked'}.`,
              });
              fetchCompanies();
              setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
            } catch (err) {
              setActionMsg({ type: 'error', text: err.message });
            }
          },
        },
      ]
    );
  };

  const handlePlanDecision = (company, action) => {
    NativeAlert.alert(
      action === 'approve' ? 'Approve Upgrade?' : 'Reject Upgrade?',
      `${action === 'approve' ? 'Approve' : 'Reject'} request to upgrade ${company.name} to ${
        company.planRequest?.requestedPlan
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await decidePlanRequestApi(company._id, action);
              setActionMsg({
                type: 'success',
                text: `Upgrade request ${action === 'approve' ? 'approved' : 'rejected'}.`,
              });
              fetchCompanies();
              setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
            } catch (err) {
              setActionMsg({ type: 'error', text: err.message });
            }
          },
        },
      ]
    );
  };

  const handleCreateCompany = async () => {
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      admin: {
        name: form.adminName.trim(),
        email: form.adminEmail.trim(),
        phone: form.adminPhone.trim(),
        password: form.adminPassword.trim(),
      },
    };

    try {
      await createCompanyApi(payload);
      setActionMsg({ type: 'success', text: `Company "${form.name}" created successfully!` });
      setCreateModalVisible(false);
      setForm(EMPTY_COMPANY_FORM);
      fetchCompanies();
      setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setFieldErrors(fieldMap);
      setFormError(Object.keys(fieldMap).length ? '' : err.message || 'Creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Tenant Companies"
        rightIcon="domain-plus"
        onRightPress={() => {
          setForm(EMPTY_COMPANY_FORM);
          setFieldErrors({});
          setFormError('');
          setCreateModalVisible(true);
        }}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* Search Input */}
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search companies by name..."
        prefixIcon="magnify"
        containerStyle={styles.searchContainer}
      />

      {/* MD3 Filter Chips */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'blocked', label: 'Blocked' },
          { key: 'upgrade', label: 'Upgrades' },
        ].map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab.key)}
              activeOpacity={0.75}
            >
              {isSelected && (
                <MaterialCommunityIcons
                  name="check"
                  size={14}
                  color={colors.onPrimaryContainer}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Create Company Button */}
      <Button
        title="Register New Company"
        onPress={() => setCreateModalVisible(true)}
        icon="domain-plus"
        style={styles.createBtn}
      />

      {/* Companies List */}
      {loading ? (
        <Loader message="Loading tenant organizations..." />
      ) : companies.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="domain-off" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No companies found</Text>
          <Text style={styles.emptySub}>No organizations matched the selected filter.</Text>
        </Card>
      ) : (
        <View style={styles.companiesList}>
          {companies.map((company) => (
            <Card key={company._id} style={styles.companyCard} elevation="sm">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('SuperAdminCompanyDetail', {
                    companyId: company._id,
                    companyName: company.name,
                  })
                }
              >
                <View style={styles.companyHeader}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="domain" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyDate}>Created: {formatDate(company.createdAt)}</Text>
                  </View>
                  <View style={styles.badgeChevronCol}>
                    <Badge
                      label={company.isActive ? 'Active' : 'Blocked'}
                      variant={company.isActive ? 'success' : 'danger'}
                      size="sm"
                    />
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                  </View>
                </View>

                <View style={styles.metaBox}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Plan</Text>
                    <Badge label={company.plan || 'Free'} variant="primary" size="sm" />
                  </View>

                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Staff Count</Text>
                    <Text style={styles.metaVal}>{company.staffCount || 0}</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Locations</Text>
                    <Text style={styles.metaVal}>{company.locations?.length || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Pending Upgrade Notice & Action */}
              {company.planRequest?.requestedPlan && (
                <View style={styles.upgradeNoticeBox}>
                  <Text style={styles.upgradeNoticeText}>
                    Requested Upgrade to {company.planRequest.requestedPlan}
                  </Text>
                  <View style={styles.upgradeBtnRow}>
                    <Button
                      title="Approve"
                      size="sm"
                      variant="primary"
                      onPress={() => handlePlanDecision(company, 'approve')}
                      style={styles.decisionBtn}
                    />
                    <Button
                      title="Reject"
                      size="sm"
                      variant="danger"
                      onPress={() => handlePlanDecision(company, 'reject')}
                      style={styles.decisionBtn}
                    />
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() =>
                    navigation.navigate('SuperAdminCompanyDetail', {
                      companyId: company._id,
                      companyName: company.name,
                    })
                  }
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleStatusBtn}
                  onPress={() => handleToggleStatus(company)}
                >
                  <MaterialCommunityIcons
                    name={company.isActive ? 'block-helper' : 'check-circle-outline'}
                    size={16}
                    color={company.isActive ? colors.danger : colors.success}
                  />
                  <Text
                    style={[
                      styles.toggleStatusText,
                      { color: company.isActive ? colors.danger : colors.success },
                    ]}
                  >
                    {company.isActive ? 'Block Tenant' : 'Unblock Tenant'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Create Company Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Company</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Alert type="error">{formError}</Alert> : null}

              <Text style={styles.formSectionTitle}>Company Details</Text>
              <Input
                label="Company Name *"
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Nexus Innovations Pvt Ltd"
                prefixIcon="domain"
                error={fieldErrors.name}
              />

              <Input
                label="Company Address"
                value={form.address}
                onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
                placeholder="e.g. Cyber City, DLF Phase 2, Gurgaon"
                prefixIcon="map-marker-outline"
              />

              <Text style={styles.formSectionTitle}>Initial Administrator Account</Text>
              <Input
                label="Admin Full Name *"
                value={form.adminName}
                onChangeText={(t) => setForm((p) => ({ ...p, adminName: t }))}
                placeholder="e.g. Ramesh Chandra"
                prefixIcon="account-outline"
                error={fieldErrors['admin.name']}
              />

              <Input
                label="Admin Work Email *"
                value={form.adminEmail}
                onChangeText={(t) => setForm((p) => ({ ...p, adminEmail: t }))}
                placeholder="admin@nexus.com"
                prefixIcon="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors['admin.email']}
              />

              <Input
                label="Admin Mobile Phone"
                value={form.adminPhone}
                onChangeText={(t) => setForm((p) => ({ ...p, adminPhone: t }))}
                placeholder="10-digit mobile number"
                prefixIcon="phone-outline"
                keyboardType="phone-pad"
              />

              <Input
                label="Admin Password *"
                value={form.adminPassword}
                onChangeText={(t) => setForm((p) => ({ ...p, adminPassword: t }))}
                placeholder="Temporary login password"
                prefixIcon="lock-outline"
                secureTextEntry
                error={fieldErrors['admin.password']}
              />

              <Button
                title="Create Company & Tenant Admin"
                onPress={handleCreateCompany}
                loading={submitting}
                style={styles.modalSubmitBtn}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  searchContainer: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.weights.medium,
  },
  filterChipTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: typography.weights.bold,
  },
  createBtn: {
    marginBottom: 20,
  },
  companiesList: {
    gap: 12,
  },
  companyCard: {
    padding: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  companyDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metaVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  upgradeNoticeBox: {
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 10,
    marginBottom: 10,
  },
  upgradeNoticeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.info,
    marginBottom: 8,
  },
  upgradeBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionBtn: {
    flex: 1,
  },
  badgeChevronCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    marginTop: 4,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryBg,
  },
  editProfileText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginLeft: 4,
  },
  toggleStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  toggleStatusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginLeft: 4,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '90%',
    padding: 20,
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
  formSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  modalSubmitBtn: {
    marginTop: 14,
    marginBottom: 16,
  },
});
