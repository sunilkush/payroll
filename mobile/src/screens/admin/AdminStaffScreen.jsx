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
  createStaffApi,
  listStaffApi,
  setStaffStatusApi,
  updateStaffApi,
} from '../../api/staffApi.js';
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
import { formatCurrency, grossSalary } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  employeeCode: '',
  basic: '',
  hra: '',
  special: '',
  other: '',
  pfApplicable: false,
  esiApplicable: false,
};

export default function AdminStaffScreen({ navigation }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await listStaffApi({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setStaffList(res?.data?.items || []);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to fetch staff members.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const openAddModal = () => {
    setEditingStaffId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (staff) => {
    setEditingStaffId(staff._id);
    setForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      password: '',
      employeeCode: staff.employeeCode || '',
      basic: String(staff.salaryStructure?.basic ?? ''),
      hra: String(staff.salaryStructure?.hra ?? ''),
      special: String(staff.salaryStructure?.special ?? ''),
      other: String(staff.salaryStructure?.other ?? ''),
      pfApplicable: Boolean(staff.pfApplicable),
      esiApplicable: Boolean(staff.esiApplicable),
    });
    setFieldErrors({});
    setFormError('');
    setModalVisible(true);
  };

  const handleToggleStatus = (staff) => {
    const willActivate = !staff.isActive;
    NativeAlert.alert(
      willActivate ? `Activate ${staff.name}?` : `Deactivate ${staff.name}?`,
      willActivate
        ? 'They will be allowed to log in and punch attendance.'
        : 'They will be logged out immediately. Historical records are preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willActivate ? 'Activate' : 'Deactivate',
          style: willActivate ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await setStaffStatusApi(staff._id, willActivate);
              setActionMsg({
                type: 'success',
                text: `${staff.name} ${willActivate ? 'activated' : 'deactivated'}.`,
              });
              fetchStaff();
              setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
            } catch (err) {
              setActionMsg({ type: 'error', text: err.message });
            }
          },
        },
      ]
    );
  };

  const handleSaveStaff = async () => {
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      employeeCode: form.employeeCode.trim(),
      salaryStructure: {
        basic: form.basic ? Number(form.basic) : 0,
        hra: form.hra ? Number(form.hra) : 0,
        special: form.special ? Number(form.special) : 0,
        other: form.other ? Number(form.other) : 0,
      },
      pfApplicable: form.pfApplicable,
      esiApplicable: form.esiApplicable,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      if (editingStaffId) {
        await updateStaffApi(editingStaffId, payload);
        setActionMsg({ type: 'success', text: 'Staff details updated.' });
      } else {
        await createStaffApi(payload);
        setActionMsg({ type: 'success', text: 'New staff member added.' });
      }
      setModalVisible(false);
      fetchStaff();
      setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setFieldErrors(fieldMap);
      setFormError(Object.keys(fieldMap).length ? '' : err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Staff Directory"
        rightIcon="account-plus"
        onRightPress={openAddModal}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* Search Input */}
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, email, or code..."
        prefixIcon="magnify"
        containerStyle={styles.searchContainer}
      />

      {/* MD3 Filter Chips */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All Staff' },
          { key: 'active', label: 'Active' },
          { key: 'inactive', label: 'Inactive' },
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
                  size={15}
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

      {/* Add Staff Button */}
      <Button
        title="Add New Staff"
        onPress={openAddModal}
        icon="account-plus"
        style={styles.addBtn}
      />

      {/* Staff List */}
      {loading ? (
        <Loader message="Loading team members..." />
      ) : staffList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="account-search" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No staff found</Text>
          <Text style={styles.emptySub}>Try searching with a different term or add new staff.</Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {staffList.map((staff) => {
            const gross = grossSalary(staff.salaryStructure);
            return (
              <Card key={staff._id} style={styles.staffCard} elevation="sm">
                <View style={styles.staffHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials(staff.name)}</Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffEmail}>{staff.email}</Text>
                    {staff.employeeCode ? (
                      <Text style={styles.staffCode}>ID: {staff.employeeCode}</Text>
                    ) : null}
                  </View>
                  <Badge
                    label={staff.isActive ? 'Active' : 'Inactive'}
                    variant={staff.isActive ? 'success' : 'danger'}
                    size="sm"
                  />
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Monthly Gross</Text>
                    <Text style={styles.metaVal}>{formatCurrency(gross)}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Statutory</Text>
                    <Text style={styles.metaVal}>
                      {staff.pfApplicable ? 'PF' : ''}
                      {staff.pfApplicable && staff.esiApplicable ? ' + ' : ''}
                      {staff.esiApplicable ? 'ESI' : ''}
                      {!staff.pfApplicable && !staff.esiApplicable ? 'None' : ''}
                    </Text>
                  </View>
                  {staff.phone ? (
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Phone</Text>
                      <Text style={styles.metaVal}>{staff.phone}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(staff)}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleToggleStatus(staff)}
                  >
                    <MaterialCommunityIcons
                      name={staff.isActive ? 'account-off-outline' : 'account-check-outline'}
                      size={16}
                      color={staff.isActive ? colors.danger : colors.success}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: staff.isActive ? colors.danger : colors.success },
                      ]}
                    >
                      {staff.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaffId ? 'Edit Staff Member' : 'Add New Staff Member'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Alert type="error">{formError}</Alert> : null}

              <Input
                label="Full Name *"
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Rahul Sharma"
                prefixIcon="account-outline"
                error={fieldErrors.name}
              />

              <Input
                label="Email Address *"
                value={form.email}
                onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
                placeholder="rahul@company.com"
                prefixIcon="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.email}
              />

              <Input
                label="Mobile Phone"
                value={form.phone}
                onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
                placeholder="10-digit mobile number"
                prefixIcon="phone-outline"
                keyboardType="phone-pad"
                error={fieldErrors.phone}
              />

              <Input
                label={editingStaffId ? 'New Password (Leave blank to keep)' : 'Password *'}
                value={form.password}
                onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
                placeholder="••••••••"
                prefixIcon="lock-outline"
                secureTextEntry
                error={fieldErrors.password}
              />

              <Input
                label="Employee Code / ID"
                value={form.employeeCode}
                onChangeText={(t) => setForm((p) => ({ ...p, employeeCode: t }))}
                placeholder="e.g. EMP-101"
                prefixIcon="badge-account-horizontal-outline"
                error={fieldErrors.employeeCode}
              />

              <Text style={styles.subHeading}>Salary Structure (Monthly INR)</Text>
              <View style={styles.salaryGrid}>
                <Input
                  label="Basic Salary *"
                  value={form.basic}
                  onChangeText={(t) => setForm((p) => ({ ...p, basic: t }))}
                  placeholder="25000"
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                  error={fieldErrors['salaryStructure.basic']}
                />
                <Input
                  label="HRA"
                  value={form.hra}
                  onChangeText={(t) => setForm((p) => ({ ...p, hra: t }))}
                  placeholder="10000"
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              </View>

              <View style={styles.salaryGrid}>
                <Input
                  label="Special Allowance"
                  value={form.special}
                  onChangeText={(t) => setForm((p) => ({ ...p, special: t }))}
                  placeholder="5000"
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="Other"
                  value={form.other}
                  onChangeText={(t) => setForm((p) => ({ ...p, other: t }))}
                  placeholder="2000"
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              </View>

              <Text style={styles.subHeading}>Statutory Compliance</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, form.pfApplicable && styles.toggleBtnActive]}
                  onPress={() => setForm((p) => ({ ...p, pfApplicable: !p.pfApplicable }))}
                >
                  <MaterialCommunityIcons
                    name={form.pfApplicable ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={form.pfApplicable ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.toggleLabel}>PF Applicable (12%)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, form.esiApplicable && styles.toggleBtnActive]}
                  onPress={() => setForm((p) => ({ ...p, esiApplicable: !p.esiApplicable }))}
                >
                  <MaterialCommunityIcons
                    name={form.esiApplicable ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={form.esiApplicable ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.toggleLabel}>ESI Applicable</Text>
                </TouchableOpacity>
              </View>

              <Button
                title={editingStaffId ? 'Save Changes' : 'Create Staff Member'}
                onPress={handleSaveStaff}
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
  addBtn: {
    marginBottom: 20,
  },
  listContainer: {
    gap: 12,
  },
  staffCard: {
    padding: 16,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  staffEmail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  staffCode: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  metaVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
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
  subHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  salaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  toggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  toggleLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.medium,
    marginLeft: 6,
  },
  modalSubmitBtn: {
    marginTop: 12,
    marginBottom: 16,
  },
});
