import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { FormField, Notice, PrimaryButton, Screen, Toast } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { useFreeStaffLimit } from '../../utils/useFreeStaffLimit';

// route.params.toast: doosri screen se aaya message (jaise password badalne ke baad).
export default function LoginScreen({ navigation, route }) {
  const { login, notice } = useAuth();
  const freeStaffLimit = useFreeStaffLimit();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = route.params?.toast ?? '';

  const set = (key) => (value) => setForm((previous) => ({ ...previous, [key]: value }));
  const hideToast = useCallback(() => navigation.setParams({ toast: undefined }), [navigation]);

  // Login hote hi RootNavigator role ke hisaab se sahi tabs dikha deta hai.
  const submit = async () => {
    setBusy(true);
    setError('');
    setFields({});
    try {
      await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setFields(err.fields);
      // Field ka error field ke neeche dikhta hai; baaki (galat password, network) upar.
      if (!Object.keys(err.fields).length) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen overlay={<Toast message={toast} onHide={hideToast} />}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Check size={22} strokeWidth={2.5} color={colors.successBright} />
        </View>
        <Text style={styles.wordmark}>Payroll</Text>
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        Punch in from where you work.
      </Text>

      {/* notice: server ne session kyun khatam kiya (jaise subscription khatam) */}
      <Notice variant="danger">{error || notice}</Notice>

      <View style={styles.form}>
        <FormField
          label="Work email"
          value={form.email}
          onChangeText={set('email')}
          error={fields.email}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          editable={!busy}
        />
        <FormField
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          error={fields.password}
          placeholder="Your password"
          secure
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
        />
        <Pressable style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="link" disabled={busy}>
          <Text style={text.bodySemiBold}>Forgot password?</Text>
        </Pressable>
      </View>

      <PrimaryButton title="Sign in" onPress={submit} loading={busy} />

      <View style={styles.spacer} />

      <Pressable
        style={({ pressed }) => [styles.register, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Register')}
        accessibilityRole="link"
        disabled={busy}
      >
        <View style={styles.registerText}>
          <Text style={text.bodySemiBold}>New company? Register free</Text>
          <Text style={text.small}>Up to {freeStaffLimit} active staff included.</Text>
        </View>
        <ChevronRight size={20} strokeWidth={2} color={colors.muted} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mark: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink },
  heading: { ...text.screenTitle, fontSize: 30, lineHeight: 36, marginTop: 20, marginBottom: 4 },
  form: { gap: spacing.gap },
  forgot: { minHeight: sizes.touch, justifyContent: 'center', alignSelf: 'flex-end' },
  spacer: { flex: 1, minHeight: spacing.gap },
  register: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.gapLg,
  },
  registerText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});
