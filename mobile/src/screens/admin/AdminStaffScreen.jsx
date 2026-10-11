import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert as NativeAlert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import EmptyState from '../../components/common/EmptyState.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
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
  designation: '',
  department: '',
  basic: '',
  hra: '',
  special: '',
  other: '',
  pfApplicable: false,
  esiApplicable: false,
  isSalesManager: false,
};

const DEFAULT_DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Operations',
  'Human Resources',
  'Accounts & Finance',
  'Information Technology',
  'Customer Support',
  'Administration',
];

const DEFAULT_DESIGNATIONS = [
  'Sales Executive',
  'Operations Manager',
  'HR Specialist',
  'Accountant',
  'Software Engineer',
  'Support Executive',
  'Team Lead',
  'Business Development Associate',
];

const AVATAR_PALETTES = [
  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' }, // Blue
  { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }, // Emerald
  { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' }, // Purple
  { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' }, // Orange
  { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' }, // Pink
  { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' }, // Teal
];

function getAvatarPalette(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export default function AdminStaffScreen({ navigation }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [selectedDept, setSelectedDept] = useState('All');
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Detail Modal State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview'); // 'Overview' | 'Salary' | 'Actions'

  // Add/Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSection, setFormSection] = useState('identity'); // 'identity' | 'role' | 'salary'

  // Dynamic suggestions: existing company departments & designations first
  const departmentOptions = useMemo(() => {
    const fromStaff = staffList
      .map((s) => s.department?.trim())
      .filter(Boolean);
    return Array.from(new Set([...fromStaff, ...DEFAULT_DEPARTMENTS]));
  }, [staffList]);

  const designationOptions = useMemo(() => {
    const fromStaff = staffList
      .map((s) => s.designation?.trim())
      .filter(Boolean);
    return Array.from(new Set([...fromStaff, ...DEFAULT_DESIGNATIONS]));
  }, [staffList]);

  // Distinct departments for filter strip
  const filterDepartments = useMemo(() => {
    const depts = staffList
      .map((s) => s.department?.trim())
      .filter(Boolean);
    return ['All', ...Array.from(new Set(depts))];
  }, [staffList]);

  // Executive KPI stats
  const kpiStats = useMemo(() => {
    const all = staffList.length;
    const active = staffList.filter((s) => s.isActive).length;
    const inactive = all - active;
    const deptsCount = new Set(
      staffList.map((s) => s.department?.trim()).filter(Boolean)
    ).size;
    return { all, active, inactive, deptsCount };
  }, [staffList]);

  // Filtered staff list based on status & department
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (selectedDept !== 'All') {
        const staffDept = (s.department || '').trim().toLowerCase();
        if (staffDept !== selectedDept.toLowerCase()) return false;
      }
      return true;
    });
  }, [staffList, selectedDept]);

  // Live gross calculation in Add/Edit form
  const formGross = useMemo(() => {
    const b = Number(form.basic) || 0;
    const h = Number(form.hra) || 0;
    const s = Number(form.special) || 0;
    const o = Number(form.other) || 0;
    return b + h + s + o;
  }, [form.basic, form.hra, form.special, form.other]);

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
    setFormSection('identity');
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
      designation: staff.designation || '',
      department: staff.department || '',
      basic: String(staff.salaryStructure?.basic ?? ''),
      hra: String(staff.salaryStructure?.hra ?? ''),
      special: String(staff.salaryStructure?.special ?? ''),
      other: String(staff.salaryStructure?.other ?? ''),
      pfApplicable: Boolean(staff.pfApplicable),
      esiApplicable: Boolean(staff.esiApplicable),
      isSalesManager: Boolean(staff.isSalesManager),
    });
    setFieldErrors({});
    setFormError('');
    setFormSection('identity');
    setModalVisible(true);
  };

  const handleCall = (phone) => {
    if (!phone) {
      NativeAlert.alert('No Phone Number', 'This staff member does not have a phone number on record.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      NativeAlert.alert('Unable to Call', 'Your device could not open the phone dialer.');
    });
  };

  const handleEmail = (email) => {
    if (!email) {
      NativeAlert.alert('No Email', 'This staff member does not have an email address on record.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      NativeAlert.alert('Unable to Email', 'Your device could not open the email client.');
    });
  };

  const handleToggleStatus = (staff) => {
    const willActivate = !staff.isActive;
    NativeAlert.alert(
      willActivate ? `Activate ${staff.name}?` : `Deactivate ${staff.name}?`,
      willActivate
        ? 'They will be allowed to log in, punch attendance, and submit requests.'
        : 'They will be logged out immediately. All previous payroll and attendance records are securely preserved.',
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
                text: `${staff.name} ${willActivate ? 'activated successfully' : 'deactivated'}.`,
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
      isSalesManager: form.isSalesManager,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      if (editingStaffId) {
        await updateStaffApi(editingStaffId, payload);
        setActionMsg({ type: 'success', text: 'Staff details updated successfully.' });
      } else {
        await createStaffApi(payload);
        setActionMsg({ type: 'success', text: 'New staff member added successfully.' });
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
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Executive Header */}
      <Header
        title="Staff Directory"
        subtitle="Manage team members, roles & compensation"
        rightIcon="account-plus"
        onRightPress={openAddModal}
      />

      {actionMsg.text ? (
        <View style={styles.actionMsgWrap}>
          <Alert type={actionMsg.type}>{actionMsg.text}</Alert>
        </View>
      ) : null}

      {/* Top Executive KPI Ribbon */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { borderLeftColor: colors.primary }]}>
          <View style={styles.kpiIconWrapPrimary}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.kpiValue}>{kpiStats.all}</Text>
            <Text style={styles.kpiLabel}>Total Staff</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: colors.success }]}>
          <View style={styles.kpiIconWrapSuccess}>
            <MaterialCommunityIcons name="account-check-outline" size={20} color={colors.success} />
          </View>
          <View>
            <Text style={styles.kpiValue}>{kpiStats.active}</Text>
            <Text style={styles.kpiLabel}>Active</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: colors.error }]}>
          <View style={styles.kpiIconWrapDanger}>
            <MaterialCommunityIcons name="account-off-outline" size={20} color={colors.error} />
          </View>
          <View>
            <Text style={styles.kpiValue}>{kpiStats.inactive}</Text>
            <Text style={styles.kpiLabel}>Inactive</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: colors.primaryDark }]}>
          <View style={styles.kpiIconWrapPurple}>
            <MaterialCommunityIcons name="domain" size={20} color={colors.primaryDark} />
          </View>
          <View>
            <Text style={styles.kpiValue}>{kpiStats.deptsCount}</Text>
            <Text style={styles.kpiLabel}>Departments</Text>
          </View>
        </View>
      </View>

      {/* Unified Search Bar */}
      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, code, dept..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.statusChipsRow}>
        {[
          { key: 'All', label: 'All', count: kpiStats.all },
          { key: 'Active', label: 'Active', count: kpiStats.active },
          { key: 'Inactive', label: 'Inactive', count: kpiStats.inactive },
        ].map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statusChip, isSelected && styles.statusChipActive]}
              onPress={() => setStatusFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.statusCountBadge, isSelected && styles.statusCountBadgeActive]}>
                <Text style={[styles.statusCountText, isSelected && styles.statusCountTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizontal Department Filter Carousel */}
      {filterDepartments.length > 2 && (
        <View style={styles.deptFilterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptFilterScroll}
          >
            {filterDepartments.map((dept) => {
              const isSelected = selectedDept.toLowerCase() === dept.toLowerCase();
              return (
                <TouchableOpacity
                  key={dept}
                  style={[styles.deptPill, isSelected && styles.deptPillActive]}
                  onPress={() => setSelectedDept(dept)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={dept === 'All' ? 'view-grid-outline' : 'domain'}
                    size={14}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text style={[styles.deptPillText, isSelected && styles.deptPillTextActive]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Staff Count Bar */}
      <View style={styles.countSummaryRow}>
        <Text style={styles.countSummaryText}>
          Showing <Text style={styles.countBold}>{filteredStaff.length}</Text> staff member{filteredStaff.length === 1 ? '' : 's'}
        </Text>
        {selectedDept !== 'All' && (
          <TouchableOpacity onPress={() => setSelectedDept('All')} style={styles.clearDeptFilterBtn}>
            <Text style={styles.clearDeptFilterText}>Clear Dept Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Staff Directory Feed */}
      {loading ? (
        <Loader message="Loading team directory..." />
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon="account-search-outline"
          title="No staff members found"
          description={
            search
              ? `No results matching "${search}". Try another keyword.`
              : 'Add your first employee to start tracking attendance and payroll.'
          }
          actionTitle="Add New Employee"
          onAction={openAddModal}
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredStaff.map((staff) => {
            const avatar = getAvatarPalette(staff.name);
            const gross = grossSalary(staff.salaryStructure);

            return (
              <TouchableOpacity
                key={staff._id}
                onPress={() => {
                  setSelectedStaff(staff);
                  setDetailTab('Overview');
                }}
                activeOpacity={0.9}
              >
                <Card style={styles.staffCard} elevation="xs">
                  {/* Top Row: Avatar, Identity & Status */}
                  <View style={styles.staffHeaderRow}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: avatar.bg, borderColor: avatar.border },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: avatar.text }]}>
                        {initials(staff.name)}
                      </Text>
                    </View>

                    <View style={styles.staffMainInfo}>
                      <View style={styles.staffNameBadgeRow}>
                        <Text style={styles.staffName} numberOfLines={1}>
                          {staff.name}
                        </Text>
                        {staff.isSalesManager && (
                          <View style={styles.salesTag}>
                            <MaterialCommunityIcons name="star" size={11} color="#B45309" />
                            <Text style={styles.salesTagText}>Sales</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.codeRow}>
                        {staff.employeeCode ? (
                          <Text style={styles.codeBadgeText}>{staff.employeeCode}</Text>
                        ) : null}
                        <Text style={styles.roleText} numberOfLines={1}>
                          {staff.designation || staff.department || 'Employee'}
                        </Text>
                      </View>
                    </View>

                    {/* Status Pill Badge */}
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(staff)}
                      activeOpacity={0.7}
                      style={[
                        styles.statusPill,
                        staff.isActive ? styles.activePill : styles.inactivePill,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          staff.isActive ? styles.activeDot : styles.inactiveDot,
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          staff.isActive ? styles.activePillText : styles.inactivePillText,
                        ]}
                      >
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Middle Meta Strip: Department, Gross Salary & statutory tags */}
                  <View style={styles.metaStrip}>
                    {staff.department ? (
                      <View style={styles.metaChip}>
                        <MaterialCommunityIcons name="domain" size={12} color={colors.textSecondary} />
                        <Text style={styles.metaChipText}>{staff.department}</Text>
                      </View>
                    ) : null}

                    {gross > 0 ? (
                      <View style={styles.salaryChip}>
                        <MaterialCommunityIcons name="cash-multiple" size={12} color="#059669" />
                        <Text style={styles.salaryChipText}>{formatCurrency(gross)}/mo</Text>
                      </View>
                    ) : null}

                    {staff.pfApplicable && (
                      <View style={styles.complianceChip}>
                        <Text style={styles.complianceChipText}>PF</Text>
                      </View>
                    )}

                    {staff.esiApplicable && (
                      <View style={styles.complianceChip}>
                        <Text style={styles.complianceChipText}>ESI</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom Quick-Action Bar */}
                  <View style={styles.cardActionsBar}>
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleCall(staff.phone)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="phone-outline"
                        size={15}
                        color={staff.phone ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.cardActionLabel,
                          !staff.phone && styles.cardActionLabelDisabled,
                        ]}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleEmail(staff.email)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="email-outline" size={15} color={colors.primary} />
                      <Text style={styles.cardActionLabel}>Email</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => openEditModal(staff)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.textSecondary} />
                      <Text style={styles.cardActionLabel}>Edit</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => {
                        setSelectedStaff(staff);
                        setDetailTab('Overview');
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="arrow-right-circle-outline" size={16} color={colors.primary} />
                      <Text style={[styles.cardActionLabel, { color: colors.primary, fontWeight: '700' }]}>
                        Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Screen 3: Executive Employee Dossier Modal */}
      <Modal
        visible={Boolean(selectedStaff)}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedStaff(null)}
      >
        <ScreenWrapper contentContainerStyle={styles.detailContainer} scrollable>
          <Header
            title="Employee Profile"
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
              {/* Profile Hero Card */}
              <Card style={styles.profileHeroCard} elevation="sm">
                <View
                  style={[
                    styles.detailLargeAvatar,
                    {
                      backgroundColor: getAvatarPalette(selectedStaff.name).bg,
                      borderColor: getAvatarPalette(selectedStaff.name).border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailLargeAvatarText,
                      { color: getAvatarPalette(selectedStaff.name).text },
                    ]}
                  >
                    {initials(selectedStaff.name)}
                  </Text>
                </View>

                <Text style={styles.detailName}>{selectedStaff.name}</Text>

                <View style={styles.detailSubRow}>
                  {selectedStaff.employeeCode ? (
                    <Text style={styles.detailCodeBadge}>{selectedStaff.employeeCode}</Text>
                  ) : null}
                  <Text style={styles.detailDesignation}>
                    {selectedStaff.designation || 'Staff Member'}
                  </Text>
                </View>

                <View style={styles.detailStatusActionRow}>
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(selectedStaff)}
                    style={[
                      styles.statusPill,
                      selectedStaff.isActive ? styles.activePill : styles.inactivePill,
                      { paddingHorizontal: 12, paddingVertical: 5 },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        selectedStaff.isActive ? styles.activeDot : styles.inactiveDot,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        selectedStaff.isActive ? styles.activePillText : styles.inactivePillText,
                      ]}
                    >
                      {selectedStaff.isActive ? 'Active Employee' : 'Deactivated'}
                    </Text>
                  </TouchableOpacity>

                  {selectedStaff.isSalesManager && (
                    <View style={[styles.salesTag, { paddingHorizontal: 10, paddingVertical: 4 }]}>
                      <MaterialCommunityIcons name="star" size={13} color="#B45309" />
                      <Text style={styles.salesTagText}>Sales Executive</Text>
                    </View>
                  )}
                </View>

                {/* Quick Dial & Email Buttons */}
                <View style={styles.quickContactRow}>
                  <TouchableOpacity
                    style={[styles.quickContactBtn, !selectedStaff.phone && styles.quickContactBtnDisabled]}
                    onPress={() => handleCall(selectedStaff.phone)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="phone" size={16} color={selectedStaff.phone ? '#FFFFFF' : '#94A3B8'} />
                    <Text style={styles.quickContactText}>Call Staff</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickContactBtn, { backgroundColor: '#475569' }]}
                    onPress={() => handleEmail(selectedStaff.email)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="email" size={16} color="#FFFFFF" />
                    <Text style={styles.quickContactText}>Send Email</Text>
                  </TouchableOpacity>
                </View>
              </Card>

              {/* Detail Navigation Tabs */}
              <View style={styles.detailTabsRow}>
                {[
                  { key: 'Overview', label: 'Identity & Info', icon: 'account-box-outline' },
                  { key: 'Salary', label: 'Compensation', icon: 'cash-multiple' },
                  { key: 'Actions', label: 'Operations', icon: 'lightning-bolt-outline' },
                ].map((tab) => {
                  const isTabActive = detailTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.detailTabBtn, isTabActive && styles.detailTabBtnActive]}
                      onPress={() => setDetailTab(tab.key)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={tab.icon}
                        size={15}
                        color={isTabActive ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.detailTabBtnText,
                          isTabActive && styles.detailTabBtnTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tab 1: Identity & Profile */}
              {detailTab === 'Overview' && (
                <View style={{ gap: 12 }}>
                  <Card style={styles.infoCard} elevation="xs">
                    <Text style={styles.cardHeaderTitle}>Contact & Employment</Text>

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="email-outline" size={18} color={colors.primary} />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Email Address</Text>
                        <Text style={styles.infoValue}>{selectedStaff.email}</Text>
                      </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="phone-outline" size={18} color={colors.primary} />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Phone Number</Text>
                        <Text style={styles.infoValue}>{selectedStaff.phone || 'Not recorded'}</Text>
                      </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="domain" size={18} color={colors.primary} />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Department</Text>
                        <Text style={styles.infoValue}>{selectedStaff.department || 'General'}</Text>
                      </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="briefcase-outline" size={18} color={colors.primary} />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Designation</Text>
                        <Text style={styles.infoValue}>{selectedStaff.designation || 'Staff'}</Text>
                      </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.primary} />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Joining Date</Text>
                        <Text style={styles.infoValue}>
                          {selectedStaff.joiningDate ? formatDate(selectedStaff.joiningDate) : 'Not specified'}
                        </Text>
                      </View>
                    </View>
                  </Card>

                  {/* Statutory & Banking Card */}
                  <Card style={styles.infoCard} elevation="xs">
                    <Text style={styles.cardHeaderTitle}>Statutory & Banking Details</Text>

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="shield-check-outline" size={18} color="#059669" />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>PF Status & UAN</Text>
                        <Text style={styles.infoValue}>
                          {selectedStaff.pfApplicable ? 'PF Applicable' : 'PF Not Applicable'}
                          {selectedStaff.uan ? ` (UAN: ${selectedStaff.uan})` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="hospital-box-outline" size={18} color="#059669" />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>ESI Status & ESIC No</Text>
                        <Text style={styles.infoValue}>
                          {selectedStaff.esiApplicable ? 'ESI Applicable' : 'ESI Not Applicable'}
                          {selectedStaff.esicNo ? ` (ESIC: ${selectedStaff.esicNo})` : ''}
                        </Text>
                      </View>
                    </View>

                    {selectedStaff.bankDetails?.accountNo ? (
                      <>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                          <MaterialCommunityIcons name="bank-outline" size={18} color={colors.primary} />
                          <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Bank Account</Text>
                            <Text style={styles.infoValue}>
                              {selectedStaff.bankDetails.bankName || 'Bank'} • A/C: {selectedStaff.bankDetails.accountNo} (IFSC: {selectedStaff.bankDetails.ifsc || 'N/A'})
                            </Text>
                          </View>
                        </View>
                      </>
                    ) : null}
                  </Card>
                </View>
              )}

              {/* Tab 2: Compensation & Salary */}
              {detailTab === 'Salary' && (
                <View style={{ gap: 12 }}>
                  <Card style={styles.salaryHeroCard} elevation="sm">
                    <Text style={styles.salaryHeroLabel}>Total Gross Monthly Salary</Text>
                    <Text style={styles.salaryHeroValue}>
                      {formatCurrency(grossSalary(selectedStaff.salaryStructure))}
                    </Text>
                    <Text style={styles.salaryHeroSub}>
                      As calculated from structured compensation components
                    </Text>
                  </Card>

                  <Card style={styles.infoCard} elevation="xs">
                    <Text style={styles.cardHeaderTitle}>Salary Breakdown Components</Text>

                    <View style={styles.salaryItemRow}>
                      <Text style={styles.salaryItemName}>Basic Salary</Text>
                      <Text style={styles.salaryItemAmount}>
                        {formatCurrency(selectedStaff.salaryStructure?.basic || 0)}
                      </Text>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.salaryItemRow}>
                      <Text style={styles.salaryItemName}>House Rent Allowance (HRA)</Text>
                      <Text style={styles.salaryItemAmount}>
                        {formatCurrency(selectedStaff.salaryStructure?.hra || 0)}
                      </Text>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.salaryItemRow}>
                      <Text style={styles.salaryItemName}>Special Allowance</Text>
                      <Text style={styles.salaryItemAmount}>
                        {formatCurrency(selectedStaff.salaryStructure?.special || 0)}
                      </Text>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.salaryItemRow}>
                      <Text style={styles.salaryItemName}>Other Allowances</Text>
                      <Text style={styles.salaryItemAmount}>
                        {formatCurrency(selectedStaff.salaryStructure?.other || 0)}
                      </Text>
                    </View>

                    <View style={[styles.infoDivider, { backgroundColor: '#CBD5E1', height: 1.5 }]} />

                    <View style={[styles.salaryItemRow, { paddingTop: 4 }]}>
                      <Text style={[styles.salaryItemName, { fontWeight: '700', color: colors.text }]}>
                        Total Monthly Gross
                      </Text>
                      <Text style={[styles.salaryItemAmount, { color: colors.primary, fontWeight: '700' }]}>
                        {formatCurrency(grossSalary(selectedStaff.salaryStructure))}
                      </Text>
                    </View>
                  </Card>

                  <Button
                    title="View Processed Payslips"
                    prefixIcon="receipt-text-outline"
                    onPress={() => {
                      setSelectedStaff(null);
                      navigation.navigate('AdminPayroll');
                    }}
                    style={{ marginTop: 4 }}
                  />
                </View>
              )}

              {/* Tab 3: Quick Operations */}
              {detailTab === 'Actions' && (
                <View style={{ gap: 12 }}>
                  <Card style={styles.infoCard} elevation="xs">
                    <View style={styles.quickActionHeader}>
                      <View style={styles.quickActionIconWrap}>
                        <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quickActionTitle}>Attendance Register</Text>
                        <Text style={styles.quickActionSub}>
                          Inspect daily punch-in, geofence logs, and monthly timesheets.
                        </Text>
                      </View>
                    </View>
                    <Button
                      title="Open Attendance Register"
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setSelectedStaff(null);
                        navigation.navigate('AdminAttendance');
                      }}
                      style={{ marginTop: 10 }}
                    />
                  </Card>

                  <Card style={styles.infoCard} elevation="xs">
                    <View style={styles.quickActionHeader}>
                      <View style={[styles.quickActionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                        <MaterialCommunityIcons name="calendar-multiselect" size={22} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quickActionTitle}>Leaves & Time Off</Text>
                        <Text style={styles.quickActionSub}>
                          Review pending leave applications and annual balance quota.
                        </Text>
                      </View>
                    </View>
                    <Button
                      title="Review Leave Requests"
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setSelectedStaff(null);
                        navigation.navigate('AdminLeaves');
                      }}
                      style={{ marginTop: 10 }}
                    />
                  </Card>

                  <Card style={styles.infoCard} elevation="xs">
                    <View style={styles.quickActionHeader}>
                      <View style={[styles.quickActionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                        <MaterialCommunityIcons name="cash-fast" size={22} color="#16A34A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quickActionTitle}>Monthly Payroll</Text>
                        <Text style={styles.quickActionSub}>
                          Review monthly pay voucher, bonuses, deductions & tax slips.
                        </Text>
                      </View>
                    </View>
                    <Button
                      title="Manage Payroll & Slips"
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setSelectedStaff(null);
                        navigation.navigate('AdminPayroll');
                      }}
                      style={{ marginTop: 10 }}
                    />
                  </Card>
                </View>
              )}
            </View>
          )}
        </ScreenWrapper>
      </Modal>

      {/* Screen 4: Add / Edit Staff Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingStaffId ? 'Edit Staff Profile' : 'Add New Staff Member'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingStaffId
                    ? 'Update employee role, contact & compensation'
                    : 'Create team login & salary profile'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Stepped Section Switcher */}
            <View style={styles.modalStepTabs}>
              {[
                { key: 'identity', label: '1. Identity', icon: 'account-outline' },
                { key: 'role', label: '2. Role & Dept', icon: 'domain' },
                { key: 'salary', label: '3. Salary & PF', icon: 'cash-multiple' },
              ].map((sec) => {
                const isActive = formSection === sec.key;
                return (
                  <TouchableOpacity
                    key={sec.key}
                    style={[styles.modalStepBtn, isActive && styles.modalStepBtnActive]}
                    onPress={() => setFormSection(sec.key)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={sec.icon}
                      size={14}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.modalStepText, isActive && styles.modalStepTextActive]}>
                      {sec.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {formError ? (
                <View style={{ marginBottom: 12 }}>
                  <Alert type="error">{formError}</Alert>
                </View>
              ) : null}

              {/* Section 1: Identity & Credentials */}
              {formSection === 'identity' && (
                <View style={styles.formSectionContainer}>
                  <Input
                    label="Full Name *"
                    value={form.name}
                    onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                    placeholder="e.g. Amit Kumar"
                    prefixIcon="account-outline"
                    error={fieldErrors.name}
                  />

                  <Input
                    label="Email Address *"
                    value={form.email}
                    onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
                    placeholder="e.g. amit@company.com"
                    prefixIcon="email-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={fieldErrors.email}
                  />

                  <Input
                    label="Phone Number"
                    value={form.phone}
                    onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
                    placeholder="+91 98765 43210"
                    prefixIcon="phone-outline"
                    keyboardType="phone-pad"
                    error={fieldErrors.phone}
                  />

                  <Input
                    label="Employee Code"
                    value={form.employeeCode}
                    onChangeText={(t) => setForm((p) => ({ ...p, employeeCode: t }))}
                    placeholder="e.g. EMP001"
                    prefixIcon="badge-account-outline"
                    error={fieldErrors.employeeCode}
                  />

                  <Input
                    label={editingStaffId ? 'New Password (leave empty to keep current)' : 'Password *'}
                    value={form.password}
                    onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
                    placeholder="Minimum 8 characters"
                    prefixIcon="lock-outline"
                    secureTextEntry
                    error={fieldErrors.password}
                  />

                  <Button
                    title="Next: Role & Department"
                    suffixIcon="arrow-right"
                    onPress={() => setFormSection('role')}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}

              {/* Section 2: Department & Designation */}
              {formSection === 'role' && (
                <View style={styles.formSectionContainer}>
                  <View style={styles.fieldSection}>
                    <Input
                      label="Department"
                      value={form.department}
                      onChangeText={(t) => setForm((p) => ({ ...p, department: t }))}
                      placeholder="Type custom or select below"
                      prefixIcon="domain"
                      error={fieldErrors.department}
                      containerStyle={{ marginBottom: 6 }}
                    />
                    <Text style={styles.suggestionTitle}>Quick Select Department:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionChipsContainer}
                    >
                      {departmentOptions.map((dept) => {
                        const isSelected = form.department?.trim().toLowerCase() === dept.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={dept}
                            style={[styles.suggestionChip, isSelected && styles.suggestionChipActive]}
                            onPress={() =>
                              setForm((p) => ({
                                ...p,
                                department: isSelected ? '' : dept,
                              }))
                            }
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={isSelected ? 'check-circle' : 'domain'}
                              size={13}
                              color={isSelected ? '#FFFFFF' : colors.primary}
                            />
                            <Text
                              style={[
                                styles.suggestionChipText,
                                isSelected && styles.suggestionChipTextActive,
                              ]}
                            >
                              {dept}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.fieldSection}>
                    <Input
                      label="Designation"
                      value={form.designation}
                      onChangeText={(t) => setForm((p) => ({ ...p, designation: t }))}
                      placeholder="Type custom or select below"
                      prefixIcon="briefcase-outline"
                      error={fieldErrors.designation}
                      containerStyle={{ marginBottom: 6 }}
                    />
                    <Text style={styles.suggestionTitle}>Quick Select Designation:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionChipsContainer}
                    >
                      {designationOptions.map((desig) => {
                        const isSelected = form.designation?.trim().toLowerCase() === desig.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={desig}
                            style={[styles.suggestionChip, isSelected && styles.suggestionChipActive]}
                            onPress={() =>
                              setForm((p) => ({
                                ...p,
                                designation: isSelected ? '' : desig,
                              }))
                            }
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={isSelected ? 'check-circle' : 'briefcase-outline'}
                              size={13}
                              color={isSelected ? '#FFFFFF' : colors.primary}
                            />
                            <Text
                              style={[
                                styles.suggestionChipText,
                                isSelected && styles.suggestionChipTextActive,
                              ]}
                            >
                              {desig}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Sales Manager Toggle */}
                  <View style={styles.switchRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchRowTitle}>Sales Manager Role</Text>
                      <Text style={styles.switchRowSub}>
                        Allows assignment of client meetings & location visits
                      </Text>
                    </View>
                    <Switch
                      value={form.isSalesManager}
                      onValueChange={(val) => setForm((p) => ({ ...p, isSalesManager: val }))}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.modalStepNavButtons}>
                    <Button
                      title="Back"
                      variant="outline"
                      onPress={() => setFormSection('identity')}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Next: Salary & PF"
                      suffixIcon="arrow-right"
                      onPress={() => setFormSection('salary')}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              {/* Section 3: Salary Structure & Statutory */}
              {formSection === 'salary' && (
                <View style={styles.formSectionContainer}>
                  {/* Live Gross Salary Ribbon */}
                  <View style={styles.liveGrossRibbon}>
                    <View>
                      <Text style={styles.liveGrossLabel}>Calculated Monthly Gross</Text>
                      <Text style={styles.liveGrossSub}>Sum of all entered components</Text>
                    </View>
                    <Text style={styles.liveGrossAmount}>{formatCurrency(formGross)}</Text>
                  </View>

                  <Input
                    label="Basic Salary (₹)"
                    value={form.basic}
                    onChangeText={(t) => setForm((p) => ({ ...p, basic: t }))}
                    placeholder="e.g. 25000"
                    keyboardType="numeric"
                    prefixIcon="currency-inr"
                    error={fieldErrors['salaryStructure.basic'] || fieldErrors.basic}
                  />

                  <Input
                    label="House Rent Allowance - HRA (₹)"
                    value={form.hra}
                    onChangeText={(t) => setForm((p) => ({ ...p, hra: t }))}
                    placeholder="e.g. 10000"
                    keyboardType="numeric"
                    prefixIcon="currency-inr"
                  />

                  <Input
                    label="Special Allowance (₹)"
                    value={form.special}
                    onChangeText={(t) => setForm((p) => ({ ...p, special: t }))}
                    placeholder="e.g. 5000"
                    keyboardType="numeric"
                    prefixIcon="currency-inr"
                  />

                  <Input
                    label="Other Allowances (₹)"
                    value={form.other}
                    onChangeText={(t) => setForm((p) => ({ ...p, other: t }))}
                    placeholder="e.g. 2000"
                    keyboardType="numeric"
                    prefixIcon="currency-inr"
                  />

                  {/* Statutory Toggles */}
                  <View style={styles.switchRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchRowTitle}>Provident Fund (PF)</Text>
                      <Text style={styles.switchRowSub}>Enable statutory PF contribution deduction</Text>
                    </View>
                    <Switch
                      value={form.pfApplicable}
                      onValueChange={(val) => setForm((p) => ({ ...p, pfApplicable: val }))}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.switchRowCard, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchRowTitle}>Employee State Insurance (ESI)</Text>
                      <Text style={styles.switchRowSub}>Enable statutory ESI medical contribution deduction</Text>
                    </View>
                    <Switch
                      value={form.esiApplicable}
                      onValueChange={(val) => setForm((p) => ({ ...p, esiApplicable: val }))}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.modalStepNavButtons}>
                    <Button
                      title="Back"
                      variant="outline"
                      onPress={() => setFormSection('role')}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={editingStaffId ? 'Save Changes' : 'Create Staff Member'}
                      onPress={handleSaveStaff}
                      loading={submitting}
                      style={{ flex: 1.4 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
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
  actionMsgWrap: {
    marginBottom: 12,
  },

  // KPI Ribbon
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    ...shadows.xs,
  },
  kpiIconWrapPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapSuccess: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapDanger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapPurple: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  // Search & Filter
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    height: 48,
    ...shadows.xs,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0F172A',
    fontWeight: typography.weights.medium,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearSearchBtn: {
    padding: 2,
    marginLeft: 6,
  },

  // Status Chips
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  statusCountBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusCountText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  statusCountTextActive: {
    color: '#FFFFFF',
  },

  // Department Filter
  deptFilterSection: {
    marginBottom: 10,
  },
  deptFilterScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  deptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deptPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  deptPillText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  deptPillTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.semibold,
  },

  // Count Summary Bar
  countSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  countSummaryText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  countBold: {
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  clearDeptFilterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F1F5F9',
  },
  clearDeptFilterText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // List Cards
  listContainer: {
    gap: 10,
  },
  staffCard: {
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  staffHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  staffMainInfo: {
    flex: 1,
  },
  staffNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    flexShrink: 1,
  },
  salesTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.pill,
  },
  salesTagText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  // Status Pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
  },
  activeDot: {
    backgroundColor: '#16A34A',
  },
  activePillText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  inactivePill: {
    backgroundColor: '#FEE2E2',
  },
  inactiveDot: {
    backgroundColor: '#DC2626',
  },
  inactivePillText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },

  // Meta Strip
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  metaChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  salaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  salaryChipText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: typography.weights.bold,
  },
  complianceChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  complianceChipText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#6D28D9',
  },

  // Card Actions Bar
  cardActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  cardActionLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: '#334155',
  },
  cardActionLabelDisabled: {
    color: '#94A3B8',
  },

  // Detail Modal
  detailContainer: {
    paddingBottom: 40,
  },
  detailBody: {
    gap: 14,
    marginTop: 6,
  },
  profileHeroCard: {
    alignItems: 'center',
    padding: 18,
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLargeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  detailLargeAvatarText: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
  },
  detailName: {
    fontSize: 19,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    textAlign: 'center',
  },
  detailSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  detailCodeBadge: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  detailDesignation: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailStatusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    width: '100%',
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  quickContactBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  quickContactText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },

  // Detail Tabs
  detailTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  detailTabBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  detailTabBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  detailTabBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },

  // Info Cards
  infoCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },

  // Salary Detail Tab
  salaryHeroCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  salaryHeroLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: typography.weights.medium,
  },
  salaryHeroValue: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: '#10B981',
    marginVertical: 4,
  },
  salaryHeroSub: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  salaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  salaryItemName: {
    fontSize: 13,
    color: '#334155',
  },
  salaryItemAmount: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },

  // Operations Tab
  quickActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  quickActionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Add/Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '92%',
    padding: 18,
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalStepTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    padding: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  modalStepBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.xs,
  },
  modalStepText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  modalStepTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  formSectionContainer: {
    gap: 2,
  },
  fieldSection: {
    marginBottom: 10,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  suggestionChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  suggestionChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.semibold,
  },
  switchRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  switchRowTitle: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  switchRowSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveGrossRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 10,
  },
  liveGrossLabel: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#065F46',
  },
  liveGrossSub: {
    fontSize: 10,
    color: '#047857',
  },
  liveGrossAmount: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  modalStepNavButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 6,
  },

  // Empty Card
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 260,
  },
});
