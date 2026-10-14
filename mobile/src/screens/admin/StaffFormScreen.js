import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { createStaffApi, getSettingsApi, getStaffApi, setStaffStatusApi, updateStaffApi } from '../../api/endpoints';
import { Card, EmptyState, ErrorState, FormField, Header, Money, Notice, PickerField, PrimaryButton, Screen, SecondaryButton, SkeletonList, ToggleRow } from '../../components';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';

const COMPONENTS = [
  { key: 'basic', label: 'Basic' },
  { key: 'hra', label: 'HRA' },
  { key: 'special', label: 'Special allowance' },
  { key: 'other', label: 'Other' },
];

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: '',
  employeeCode: '',
  department: '',
  designation: '',
  joiningDate: '',
  isSalesManager: false,
  branchId: '',
  bankName: '',
  accountNo: '',
  ifsc: '',
  uan: '',
  esicNo: '',
  basic: '',
  hra: '',
  special: '',
  other: '',
  pfApplicable: false,
  esiApplicable: false,
  isActive: true,
};

// Server ka staff -> form (sab string, taaki input mein seedha jaye)
const toForm = (staff) => ({
  ...EMPTY,
  name: staff.name ?? '',
  email: staff.email ?? '',
  phone: staff.phone ?? '',
  employeeCode: staff.employeeCode ?? '',
  department: staff.department ?? '',
  designation: staff.designation ?? '',
  joiningDate: staff.joiningDate ? String(staff.joiningDate).slice(0, 10) : '',
  isSalesManager: Boolean(staff.isSalesManager),
  branchId: staff.branchId ? String(staff.branchId) : '',
  bankName: staff.bankDetails?.bankName ?? '',
  accountNo: staff.bankDetails?.accountNo ?? '',
  ifsc: staff.bankDetails?.ifsc ?? '',
  uan: staff.uan ?? '',
  esicNo: staff.esicNo ?? '',
  ...Object.fromEntries(COMPONENTS.map(({ key }) => [key, staff.salaryStructure?.[key] ? String(staff.salaryStructure[key]) : ''])),
  pfApplicable: Boolean(staff.pfApplicable),
  esiApplicable: Boolean(staff.esiApplicable),
  isActive: staff.isActive !== false,
});

// Form -> server ka body. Edit mein khali password nahi bhejte (bhejne par reset hota hai).
const toPayload = (form, isEdit) => ({
  name: form.name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  ...(form.password || !isEdit ? { password: form.password } : {}),
  employeeCode: form.employeeCode.trim(),
  department: form.department.trim(),
  designation: form.designation.trim(),
  joiningDate: form.joiningDate || null,
  isSalesManager: form.isSalesManager,
  // Branch wali holidays isi se lagti hain; khali = koi branch nahi
  branchId: form.branchId || null,
  bankDetails: { bankName: form.bankName.trim(), accountNo: form.accountNo.trim(), ifsc: form.ifsc.trim() },
  uan: form.uan.trim(),
  esicNo: form.esicNo.trim(),
  salaryStructure: Object.fromEntries(COMPONENTS.map(({ key }) => [key, Number(form[key]) || 0])),
  pfApplicable: form.pfApplicable,
  esiApplicable: form.esiApplicable,
});

function Section({ title, children, padded = true }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padded={padded}>{children}</Card>
    </View>
  );
}

// Admin: staff jodna / badalna (POST / PUT /staff). route.params: { id? (edit), usage (plan ki hadd) }
export default function StaffFormScreen({ navigation, route }) {
  const { id, usage } = route.params ?? {};
  const isEdit = Boolean(id);
  const [form, setForm] = useState(isEdit ? null : EMPTY);
  const [original, setOriginal] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [branches, setBranches] = useState([]); // company ki office locations

  useEffect(() => {
    getSettingsApi()
      .then(({ data }) => setBranches(data.company.locations))
      .catch(() => setBranches([]));
  }, []);

  const loadStaff = async () => {
    setLoadError('');
    try {
      const res = await getStaffApi(id);
      setOriginal(res.data.staff);
      setForm(toForm(res.data.staff));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    if (isEdit) loadStaff();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, errorKey = key) => (value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFields((previous) => ({ ...previous, [errorKey]: undefined }));
  };

  const gross = form ? COMPONENTS.reduce((sum, { key }) => sum + (Number(form[key]) || 0), 0) : 0;
  // Naya staff (ya band staff ko chalu karna) plan ki hadd par ruk jata hai; server bhi yahi rokta hai.
  const blocked = Boolean(usage?.full) && (!isEdit || (original && !original.isActive && form?.isActive));

  const submit = async () => {
    const problems = {};
    if (!form.name.trim()) problems.name = 'Enter the name.';
    if (!form.email.trim()) problems.email = 'Enter the email.';
    if (!form.employeeCode.trim()) problems.employeeCode = 'Enter the employee code.';
    if (!isEdit && form.password.length < 8) problems.password = 'Use at least 8 characters.';
    if (form.basic === '' || Number.isNaN(Number(form.basic))) problems['salaryStructure.basic'] = 'Enter the basic salary.';
    setFields(problems);
    if (Object.keys(problems).length) {
      setError('Some details are missing. Check the highlighted fields.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const payload = toPayload(form, isEdit);
      if (isEdit) {
        await updateStaffApi(id, payload);
        if (original.isActive !== form.isActive) await setStaffStatusApi(id, form.isActive);
      } else {
        await createStaffApi(payload);
      }
      navigation.navigate('AdminTabs', { screen: 'Staff', params: { toast: isEdit ? 'Staff details saved.' : `${form.name.trim()} added.` } });
    } catch (err) {
      setFields(err.fields);
      setError(Object.keys(err.fields).length ? 'Some details need fixing. Check the highlighted fields.' : err.message);
      setBusy(false);
    }
  };

  const header = <Header title={isEdit ? 'Edit staff' : 'Add staff'} subtitle={original?.employeeCode} onBack={navigation.goBack} />;

  if (!isEdit && usage?.full) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState
            icon={UserPlus}
            title="Your plan is full"
            message={`${usage.planName} allows ${usage.staffLimit} active staff and you have ${usage.activeStaff}. Upgrade, or mark someone inactive, to add more.`}
          />
        </Card>
        <PrimaryButton title="Upgrade plan" onPress={() => navigation.navigate('PlanBilling')} />
      </Screen>
    );
  }
  if (!form) {
    return (
      <Screen>
        {header}
        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={loadStaff} />
          </Card>
        ) : (
          <SkeletonList rows={4} />
        )}
      </Screen>
    );
  }

  const field = (key, label, props = {}, errorKey = key) => (
    <FormField label={label} value={form[key]} onChangeText={set(key, errorKey)} error={fields[errorKey]} editable={!busy} {...props} />
  );

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          {blocked && (
            <Notice variant="warning">
              Your plan's staff limit is reached, so this person cannot be made active. Upgrade the plan first.
            </Notice>
          )}
          <PrimaryButton title={isEdit ? 'Save changes' : 'Add staff'} onPress={submit} loading={busy} disabled={blocked} />
        </>
      }
    >
      {header}

      <Section title="Profile">
        {field('name', 'Full name', { autoCapitalize: 'words', maxLength: 100 })}
        {field('email', 'Email (used to log in)', { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false })}
        {field('phone', 'Phone', { keyboardType: 'phone-pad', maxLength: 15 })}
        {field('password', isEdit ? 'New password' : 'Password', {
          secure: true,
          autoCapitalize: 'none',
          hint: isEdit ? 'Leave blank to keep the current password' : 'At least 8 characters. Share it with the staff member.',
          maxLength: 72,
        })}
        {field('employeeCode', 'Employee code', { autoCapitalize: 'characters', maxLength: 20 })}
        {field('department', 'Department', { maxLength: 100 })}
        {field('designation', 'Designation', { maxLength: 100 })}
        <PickerField label="Joining date" mode="date" value={form.joiningDate} onChange={set('joiningDate')} error={fields.joiningDate} disabled={busy} />
      </Section>

      {branches.length > 0 && (
        <Section title="Branch">
          <View style={styles.chips}>
            {[{ _id: '', name: 'No branch' }, ...branches].map((branch) => {
              const selected = form.branchId === String(branch._id);
              return (
                <Pressable
                  key={branch._id || 'none'}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => set('branchId')(String(branch._id))}
                  disabled={busy}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{branch.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {fields.branchId ? <Text style={styles.error}>{fields.branchId}</Text> : <Text style={text.small}>Holidays set for a branch apply only to its staff.</Text>}
        </Section>
      )}

      <Section title="Role" padded={false}>
        <ToggleRow
          title="Field sales"
          subtitle="Can be assigned client meetings (QR check-in)"
          value={form.isSalesManager}
          onValueChange={set('isSalesManager')}
          disabled={busy}
          divider={false}
        />
      </Section>

      <Section title="Salary structure (monthly)">
        {COMPONENTS.map(({ key, label }) => (
          <View key={key}>{field(key, label, { keyboardType: 'decimal-pad', mono: true, placeholder: '0' }, `salaryStructure.${key}`)}</View>
        ))}
        <View style={styles.gross}>
          <Text style={text.bodySemiBold}>Gross</Text>
          <Money value={gross} style={styles.grossValue} />
        </View>
      </Section>

      <Section title="PF & ESI" padded={false}>
        <ToggleRow title="PF applicable" value={form.pfApplicable} onValueChange={set('pfApplicable')} disabled={busy} />
        <ToggleRow title="ESI applicable" subtitle="Deducted only when gross is within the ESI wage limit" value={form.esiApplicable} onValueChange={set('esiApplicable')} disabled={busy} divider={false} />
      </Section>

      <Section title="Statutory numbers">
        {field('uan', 'UAN', { keyboardType: 'number-pad', mono: true, maxLength: 12 })}
        {field('esicNo', 'ESIC number', { keyboardType: 'number-pad', mono: true, maxLength: 17 })}
      </Section>

      <Section title="Bank">
        {field('bankName', 'Bank name', { maxLength: 100 }, 'bankDetails.bankName')}
        {field('accountNo', 'Account number', { keyboardType: 'number-pad', mono: true, maxLength: 18 }, 'bankDetails.accountNo')}
        {field('ifsc', 'IFSC', { autoCapitalize: 'characters', mono: true, maxLength: 11, placeholder: 'SBIN0001234' }, 'bankDetails.ifsc')}
      </Section>

      {isEdit && (
        <Section title="Status" padded={false}>
          <ToggleRow
            title="Active"
            subtitle="Inactive staff cannot log in and do not count towards your plan"
            value={form.isActive}
            onValueChange={set('isActive')}
            disabled={busy}
            divider={false}
          />
        </Section>
      )}

      {isEdit && <SecondaryButton title="Cancel" onPress={navigation.goBack} disabled={busy} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.card },
  chipSelected: { borderColor: colors.success, backgroundColor: colors.successTint },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.successDark },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  gross: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.gap, borderTopWidth: 1, borderTopColor: colors.divider },
  grossValue: { fontFamily: text.monoLarge.fontFamily, fontSize: 18 },
});
