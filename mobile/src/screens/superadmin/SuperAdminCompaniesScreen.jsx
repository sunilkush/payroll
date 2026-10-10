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
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { toFieldErrors } from '../../utils/formErrors.js';
import { initials } from '../../utils/roles.js';

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
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Blocked' | 'Upgrades'
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_COMPANY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const filterKey = statusFilter === 'All' ? undefined : statusFilter === 'Upgrades' ? 'upgrade' : statusFilter.toLowerCase();
      const res = await listCompaniesApi({
        search: search.trim() || undefined,
        status: filterKey,
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
      setActionMsg({ type: 'success', text: `Company "${form.name}" registered successfully!` });
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
      {/* Top Header matching Screen 2 */}
      <Header
        title="Companies"
        rightIcon="domain-plus"
        onRightPress={() => {
          setForm(EMPTY_COMPANY_FORM);
          setFieldErrors({});
          setFormError('');
          setCreateModalVisible(true);
        }}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* Search Input Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search companies..."
            containerStyle={styles.searchInputContainer}
            inputStyle={styles.searchInput}
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          activeOpacity={0.7}
          onPress={() => setCreateModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips: [All] [Active] [Blocked] [Upgrades] */}
      <View style={styles.filterRow}>
        {['All', 'Active', 'Blocked', 'Upgrades'].map((tab) => {
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

      {/* Companies List */}
      {loading ? (
        <Loader message="Loading tenant companies..." />
      ) : companies.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="domain-off" size={44} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No companies found</Text>
          <Text style={styles.emptySub}>No organizations matched the selected filter.</Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {companies.map((company) => {
            const hasUpgrade = company.planRequest?.status === 'PENDING';
            return (
              <TouchableOpacity
                key={company._id}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('SuperAdminCompanyDetail', {
                    companyId: company._id,
                    companyName: company.name,
                  })
                }
              >
                <Card style={styles.companyCard} elevation="xs">
                  <View style={styles.companyRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initials(company.name)}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                      <Text style={styles.companyName}>{company.name}</Text>
                      <Text style={styles.companySub}>
                        {company.plan || 'Standard'} Plan • {company.address || 'India'}
                      </Text>
                    </View>
                    <View style={styles.pillGroup}>
                      {hasUpgrade ? (
                        <View style={styles.upgradePill}>
                          <Text style={styles.upgradePillText}>Upgrade</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusPill,
                            company.isActive ? styles.activePill : styles.blockedPill,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              company.isActive ? styles.activePillText : styles.blockedPillText,
                            ]}
                          >
                            {company.isActive ? 'Active' : 'Blocked'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Register New Company Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
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

              <Input
                label="Company Name *"
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Acme Innovations Pvt Ltd"
                error={fieldErrors.name}
              />

              <Input
                label="Office Address"
                value={form.address}
                onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
                placeholder="e.g. Cyber City, Gurugram"
              />

              <Text style={styles.formSubHeader}>Initial Administrator</Text>

              <Input
                label="Admin Name *"
                value={form.adminName}
                onChangeText={(t) => setForm((p) => ({ ...p, adminName: t }))}
                placeholder="e.g. Priya Sharma"
                error={fieldErrors['admin.name']}
              />

              <Input
                label="Admin Email *"
                value={form.adminEmail}
                onChangeText={(t) => setForm((p) => ({ ...p, adminEmail: t }))}
                placeholder="admin@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors['admin.email']}
              />

              <Input
                label="Admin Phone"
                value={form.adminPhone}
                onChangeText={(t) => setForm((p) => ({ ...p, adminPhone: t }))}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />

              <Input
                label="Initial Password *"
                value={form.adminPassword}
                onChangeText={(t) => setForm((p) => ({ ...p, adminPassword: t }))}
                placeholder="••••••••"
                secureTextEntry
                error={fieldErrors['admin.password']}
              />

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setCreateModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Tenant"
                  onPress={handleCreateCompany}
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
    paddingHorizontal: 16,
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
  companyCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyRow: {
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
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  companySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pillGroup: {
    alignItems: 'flex-end',
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
  blockedPill: {
    backgroundColor: '#FEE2E2',
  },
  blockedPillText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  upgradePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  upgradePillText: {
    color: '#D97706',
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

  // Modal styles
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
  formSubHeader: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: 10,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
});
