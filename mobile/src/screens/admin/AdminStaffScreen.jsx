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
import { formatCurrency, formatDate, grossSalary } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  employeeCode: '',
  designation: 'Software Developer',
  department: 'IT',
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
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Screen 3: Detail Modal State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview'); // 'Overview' | 'Attendance' | 'Leave'

  // Add/Edit Modal State
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
        status: statusFilter.toLowerCase(),
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
      designation: staff.designation || 'Software Developer',
      department: staff.department || 'IT',
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
              if (selectedStaff && selectedStaff._id === staff._id) {
                setSelectedStaff({ ...selectedStaff, isActive: willActivate });
              }
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
      designation: form.designation.trim(),
      department: form.department.trim(),
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
      {/* Top Header matching Screen 2 */}
      <Header
        title="Employees"
        rightIcon="account-plus"
        onRightPress={openAddModal}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* Search Input Row with search icon & filter icon */}
      <View style={styles.searchRow}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search employees..."
          prefixIcon="magnify"
          containerStyle={styles.searchInputContainer}
        />
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7} onPress={openAddModal}>
          <MaterialCommunityIcons name="filter-variant" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips: [All] [Active] [Inactive] */}
      <View style={styles.filterRow}>
        {['All', 'Active', 'Inactive'].map((tab) => {
          const isSelected = statusFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Employees List */}
      {loading ? (
        <Loader message="Loading employees..." />
      ) : staffList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="account-search" size={44} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No employees found</Text>
          <Text style={styles.emptySub}>Try searching with a different term.</Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {staffList.map((staff) => {
            return (
              <TouchableOpacity
                key={staff._id}
                onPress={() => setSelectedStaff(staff)}
                activeOpacity={0.85}
              >
                <Card style={styles.staffCard} elevation="xs">
                  <View style={styles.staffRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initials(staff.name)}</Text>
                    </View>
                    <View style={styles.staffInfo}>
                      <Text style={styles.staffName}>{staff.name}</Text>
                      <Text style={styles.staffSub}>
                        {staff.employeeCode || 'EMP001'} • {staff.department || 'IT Department'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        staff.isActive ? styles.activePill : styles.inactivePill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          staff.isActive ? styles.activePillText : styles.inactivePillText,
                        ]}
                      >
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Screen 3: Employee Details Modal */}
      <Modal
        visible={Boolean(selectedStaff)}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedStaff(null)}
      >
        <ScreenWrapper contentContainerStyle={styles.detailContainer} scrollable>
          <Header
            title="Employee Details"
            onBack={() => setSelectedStaff(null)}
            rightIcon="pencil-outline"
            onRightPress={() => {
              const s = selectedStaff;
              setSelectedStaff(null);
              openEditModal(s);
            }}
          />

          {selectedStaff && (
            <View style={styles.detailBody}>
              {/* Top Profile Card */}
              <View style={styles.detailProfileHeader}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {initials(selectedStaff.name)}
                  </Text>
                </View>
                <Text style={styles.detailName}>{selectedStaff.name}</Text>
                <Text style={styles.detailSub}>
                  {selectedStaff.employeeCode || 'EMP001'} • {selectedStaff.department || 'IT Department'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    selectedStaff.isActive ? styles.activePill : styles.inactivePill,
                    { marginTop: 6 },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      selectedStaff.isActive ? styles.activePillText : styles.inactivePillText,
                    ]}
                  >
                    • {selectedStaff.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* Detail Tabs: [Overview] [Attendance] [Leave] */}
              <View style={styles.detailTabsRow}>
                {['Overview', 'Attendance', 'Leave'].map((tab) => {
                  const isTabActive = detailTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.detailTabBtn,
                        isTabActive && styles.detailTabBtnActive,
                      ]}
                      onPress={() => setDetailTab(tab)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.detailTabBtnText,
                          isTabActive && styles.detailTabBtnTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tab 1: Overview matching Screen 3 */}
              {detailTab === 'Overview' && (
                <Card style={styles.infoCard} elevation="xs">
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{selectedStaff.email}</Text>
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{selectedStaff.phone || '+91 98765 43210'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Joining Date</Text>
                      <Text style={styles.infoValue}>
                        {selectedStaff.joiningDate ? formatDate(selectedStaff.joiningDate) : 'Not specified'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="briefcase-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Designation</Text>
                      <Text style={styles.infoValue}>{selectedStaff.designation || 'Staff Member'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="domain" size={20} color={colors.textSecondary} />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Department</Text>
                      <Text style={styles.infoValue}>{selectedStaff.department || 'General'}</Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* Tab 2: Attendance */}
              {detailTab === 'Attendance' && (
                <Card style={styles.infoCard} elevation="xs">
                  <Text style={styles.tabSectionTitle}>Staff Attendance</Text>
                  <Text style={styles.tabSectionSub}>
                    Account: {selectedStaff.isActive ? 'Active' : 'Inactive'} • Role: {selectedStaff.role || 'Employee'}
                  </Text>
                  <Button
                    title="View Attendance Logs"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setSelectedStaff(null);
                      navigation.navigate('AdminAttendance');
                    }}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              )}

              {/* Tab 3: Leave */}
              {detailTab === 'Leave' && (
                <Card style={styles.infoCard} elevation="xs">
                  <Text style={styles.tabSectionTitle}>Leave Balance</Text>
                  <Text style={styles.tabSectionSub}>
                    {selectedStaff.leaves?.remaining !== undefined
                      ? `Available Leaves: ${selectedStaff.leaves.remaining} Days`
                      : 'Leave record as per company configuration'}
                  </Text>
                  <Button
                    title="View Leave Requests"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setSelectedStaff(null);
                      navigation.navigate('AdminLeaves');
                    }}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              )}

              {/* Bottom Solid Blue Button matching Screen 3 */}
              <TouchableOpacity
                style={styles.viewPayslipsBtn}
                onPress={() => {
                  setSelectedStaff(null);
                  navigation.navigate('AdminPayroll');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.viewPayslipsText}>View Payslips</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScreenWrapper>
      </Modal>

      {/* Add / Edit Staff Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaffId ? 'Edit Staff Member' : 'Add New Staff'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Alert type="error">{formError}</Alert> : null}

              <Input
                label="Full Name *"
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Amit Kumar"
                error={fieldErrors.name}
              />

              <Input
                label="Email Address *"
                value={form.email}
                onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
                placeholder="e.g. amit@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.email}
              />

              <Input
                label="Phone Number"
                value={form.phone}
                onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />

              <Input
                label="Employee Code"
                value={form.employeeCode}
                onChangeText={(t) => setForm((p) => ({ ...p, employeeCode: t }))}
                placeholder="e.g. EMP001"
              />

              <Input
                label="Department"
                value={form.department}
                onChangeText={(t) => setForm((p) => ({ ...p, department: t }))}
                placeholder="e.g. IT, HR, Sales"
              />

              <Input
                label="Designation"
                value={form.designation}
                onChangeText={(t) => setForm((p) => ({ ...p, designation: t }))}
                placeholder="e.g. Software Developer"
              />

              <Input
                label={editingStaffId ? 'New Password (leave blank to keep current)' : 'Password *'}
                value={form.password}
                onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
                placeholder="••••••••"
                secureTextEntry
                error={fieldErrors.password}
              />

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={editingStaffId ? 'Save Changes' : 'Create Staff'}
                  onPress={handleSaveStaff}
                  loading={submitting}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
  },
  searchInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  searchInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 10,
  },
  staffCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  staffSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
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
  inactivePill: {
    backgroundColor: '#FEE2E2',
  },
  inactivePillText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
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

  // Detail Modal styles matching Screen 3
  detailContainer: {
    paddingBottom: 40,
  },
  detailBody: {
    gap: 16,
    marginTop: 6,
  },
  detailProfileHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  detailAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  detailAvatarText: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  detailName: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  detailSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  detailTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  detailTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTabBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  detailTabBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  detailTabBtnTextActive: {
    color: colors.primary,
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
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  tabSectionSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  viewPayslipsBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...shadows.sm,
  },
  viewPayslipsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },

  // Modal Add/Edit
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
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
});
