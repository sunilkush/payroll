import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField, Header, Notice, PrimaryButton, Screen } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { sizes, spacing, text } from '../../theme';
import { passwordError } from '../../utils/password';
import { useFreeStaffLimit } from '../../utils/useFreeStaffLimit';

const EMPTY = { companyName: '', name: '', email: '', password: '' };

// Naya free account: ek company aur uska pehla admin (POST /auth/register).
export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const freeStaffLimit = useFreeStaffLimit();
  const [form, setForm] = useState(EMPTY);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    // Jis field ko theek kar rahe hain uska purana error hata do.
    setFields((previous) => ({ ...previous, [key]: undefined }));
  };

  const submit = async () => {
    // Password ka niyam (ek ank) app ka hai, isliye yahin jaancha jata hai; baaki sab server jaanchta hai.
    const weak = passwordError(form.password);
    if (weak) {
      setFields({ password: weak });
      return;
    }
    setBusy(true);
    setError('');
    setFields({});
    try {
      // Account bante hi login ho jata hai; email verify karni ho to RootNavigator Verify screen dikhata hai.
      await register({
        companyName: form.companyName.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
    } catch (err) {
      setFields(err.fields);
      if (!Object.keys(err.fields).length) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Register your company" onBack={navigation.goBack} />
      <Notice variant="success">Free plan — up to {freeStaffLimit} active staff, no card needed</Notice>
      <Notice variant="danger">{error}</Notice>

      <View style={styles.form}>
        <FormField
          label="Company name"
          value={form.companyName}
          onChangeText={set('companyName')}
          error={fields.companyName}
          placeholder="Shree Balaji Traders"
          autoCapitalize="words"
          autoComplete="organization"
          returnKeyType="next"
          maxLength={150}
          editable={!busy}
        />
        <FormField
          label="Your full name"
          value={form.name}
          onChangeText={set('name')}
          error={fields.name}
          placeholder="Rajesh Kumar"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          maxLength={100}
          editable={!busy}
        />
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
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!busy}
        />
        <FormField
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          error={fields.password}
          hint="At least 8 characters, with a number"
          placeholder="Create a password"
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          maxLength={72}
          editable={!busy}
        />
      </View>

      <PrimaryButton title="Create account" onPress={submit} loading={busy} />

      <Pressable style={styles.signIn} onPress={navigation.goBack} accessibilityRole="link" disabled={busy}>
        <Text style={text.body}>
          Already registered? <Text style={text.bodySemiBold}>Sign in</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.gap },
  signIn: { minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center' },
});
