import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Search, Users } from 'lucide-react-native';
import { listStaffApi } from '../../api/endpoints';
import { Avatar, Card, EmptyState, ErrorState, Header, ListRow, Money, Pill, ProgressBar, Screen, SkeletonList, Toast } from '../../components';
import { usePlanUsage } from '../../hooks/usePlanUsage';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'office', label: 'Office' },
  { value: 'field', label: 'Field sales' },
  { value: 'inactive', label: 'Inactive' },
];

// Filter -> server ke params. "Office" (sales manager nahi) server alag se nahi chhantta, isliye phone par.
const paramsOf = (filter, search) => ({
  search: search.trim() || undefined,
  status: filter === 'inactive' ? 'inactive' : filter === 'all' ? 'all' : 'active',
  salesManager: filter === 'field' ? true : undefined,
  limit: 100,
});

const grossOf = (staff) => ['basic', 'hra', 'special', 'other'].reduce((sum, key) => sum + (Number(staff.salaryStructure?.[key]) || 0), 0);

function StatutoryPill({ staff }) {
  if (!staff.isActive) return <Pill variant="danger">Inactive</Pill>;
  if (staff.pfApplicable && staff.esiApplicable) return <Pill variant="info">PF+ESI</Pill>;
  if (staff.pfApplicable) return <Pill variant="info">PF</Pill>;
  return null;
}

// Plan ki hadd: "Free plan · 8 of 10 active staff" + Upgrade
export function PlanUsageCard({ usage, onUpgrade }) {
  if (!usage) return null;
  const { planName, activeStaff, staffLimit, full } = usage;
  return (
    <Card>
      <View style={styles.usageTop}>
        <Text style={[text.bodySemiBold, styles.flex]}>
          {planName} plan · <Text style={styles.mono}>{activeStaff}</Text> of <Text style={styles.mono}>{staffLimit ?? 'unlimited'}</Text> active staff
        </Text>
        {staffLimit != null && (
          <Pressable style={styles.upgrade} onPress={onUpgrade} accessibilityRole="button">
            <Text style={styles.upgradeText}>Upgrade</Text>
          </Pressable>
        )}
      </View>
      {staffLimit != null && <ProgressBar value={activeStaff / staffLimit} tone={full ? 'danger' : activeStaff / staffLimit >= 0.8 ? 'warning' : 'success'} />}
      {full && <Text style={styles.fullText}>You have reached the limit. Upgrade to add more staff.</Text>}
    </Card>
  );
}

// Admin: staff ki list, search aur filter. route.params.toast: form se wapas aane par.
export default function StaffScreen({ navigation, route }) {
  const { usage } = usePlanUsage();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ items: null, error: '' });
  const toast = route.params?.toast ?? '';
  const hideToast = useCallback(() => navigation.setParams({ toast: undefined }), [navigation]);

  // Type karna ruke tab search (har akshar par request nahi)
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const res = await listStaffApi(paramsOf(filter, query));
      const items = filter === 'office' ? res.data.items.filter((staff) => !staff.isSalesManager) : res.data.items;
      setState({ items, error: '' });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message }));
    }
  }, [filter, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addStaff = () => navigation.navigate('StaffForm', { usage });

  return (
    <Screen edges={['top']} onRefresh={load} overlay={<Toast message={toast} onHide={hideToast} />}>
      <Header
        title="Staff"
        right={
          <Pressable style={styles.add} onPress={addStaff} accessibilityRole="button">
            <Plus size={18} strokeWidth={2} color={colors.onInk} />
            <Text style={styles.addText}>Add staff</Text>
          </Pressable>
        }
      />

      <PlanUsageCard usage={usage} onUpgrade={() => navigation.navigate('PlanBilling')} />

      <View style={styles.search}>
        <Search size={18} strokeWidth={1.8} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, code or department"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search staff"
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((option) => {
          const selected = option.value === filter;
          return (
            <Pressable
              key={option.value}
              style={[styles.filter, selected && styles.filterSelected]}
              onPress={() => {
                setState((previous) => ({ ...previous, items: null }));
                setFilter(option.value);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card padded={false}>
        {state.error && !state.items ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : !state.items ? (
          <View style={styles.cardBody}>
            <SkeletonList rows={4} />
          </View>
        ) : !state.items.length ? (
          <EmptyState icon={Users} title={query ? 'No one matches your search' : 'No staff here yet'} message={query ? 'Try another name or code.' : 'Add your first staff member.'} />
        ) : (
          state.items.map((staff, index) => (
            <ListRow
              key={staff._id}
              left={<Avatar name={staff.name} tone={staff.isActive ? 'neutral' : 'danger'} />}
              title={staff.name}
              subtitle={[staff.employeeCode, staff.department].filter(Boolean).join(' · ')}
              right={
                <View style={styles.rowRight}>
                  <Money value={grossOf(staff)} />
                  <StatutoryPill staff={staff} />
                </View>
              }
              onPress={() => navigation.navigate('StaffForm', { id: staff._id, usage })}
              divider={index < state.items.length - 1}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mono: { fontFamily: fonts.mono },
  add: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onInk },
  usageTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  upgrade: { minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 4 },
  upgradeText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.success },
  fullText: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  search: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
  },
  searchInput: { flex: 1, minHeight: sizes.input, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    minHeight: sizes.touch,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralTint,
  },
  filterSelected: { backgroundColor: colors.ink },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral },
  filterTextSelected: { color: colors.onInk, fontFamily: fonts.bodySemiBold },
  cardBody: { padding: spacing.gapLg },
  rowRight: { alignItems: 'flex-end', gap: 4 },
});
