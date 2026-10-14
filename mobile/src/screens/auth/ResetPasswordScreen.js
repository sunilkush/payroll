import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { resetPasswordApi } from '../../api/endpoints';
import { FormField, Header, Notice, PrimaryButton, Screen } from '../../components';
import { colors, radius, spacing, text } from '../../theme';
import { hasMinLength, hasNumber, passwordError, passwordStrength, STRENGTH_LABEL, STRENGTH_TONE } from '../../utils/password';

// Email ke link se token nikalta hai: poora link chipkaya ho ya sirf token.
const tokenFrom = (pasted) => pasted.trim().match(/[?&]token=([^&#\s]+)/)?.[1] ?? pasted.trim();

function StrengthBar({ score }) {
  const tone = colors[STRENGTH_TONE[score]];
  return (
    <View style={styles.strength} accessibilityLabel={score ? `Password strength: ${STRENGTH_LABEL[score]}` : undefined}>
      <View style={styles.segments}>
        {[1, 2, 3, 4].map((segment) => (
          <View key={segment} style={[styles.segment, segment <= score && { backgroundColor: tone }]} />
        ))}
      </View>
      <Text style={[text.small, styles.strengthLabel, score > 0 && { color: tone }]}>{STRENGTH_LABEL[score]}</Text>
    </View>
  );
}

function CheckItem({ done, children }) {
  const Icon = done ? Check : Circle;
  return (
    <View style={styles.check} accessibilityLabel={`${children}: ${done ? 'done' : 'not yet'}`}>
      <Icon size={16} strokeWidth={2} color={done ? colors.success : colors.muted} />
      <Text style={[text.small, done && styles.checkDone]}>{children}</Text>
    </View>
  );
}

// Naya password (POST /auth/reset-password). Deep link se khulta hai: payroster://reset-password?token=...
// (route.params.token). Token na ho (screen seedhi khuli) to email ka link chipkane ka field dikhta hai.
export default function ResetPasswordScreen({ navigation, route }) {
  const linkToken = route.params?.token ?? '';
  const [pasted, setPasted] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const token = linkToken || tokenFrom(pasted);
  const matches = Boolean(confirm) && password === confirm;

  const submit = async () => {
    const problems = {};
    if (!token) problems.token = 'Paste the reset link from your email.';
    const weak = passwordError(password);
    if (weak) problems.password = weak;
    if (!matches) problems.confirm = 'Both passwords must match.';
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError('');
    try {
      const res = await resetPasswordApi(token, password);
      // Server ne har jagah se logout kar diya hai; naye password se login.
      navigation.reset({ index: 0, routes: [{ name: 'Login', params: { toast: res.message } }] });
    } catch (err) {
      setFields(err.fields);
      // Link galat / purana ho to server field nahi, seedha message deta hai.
      if (!err.fields.password && !err.fields.token) setError(err.message);
      setBusy(false);
    }
  };

  const goToLogin = () => (navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: 'Login' }] }));

  return (
    <Screen>
      <Header title="Set a new password" onBack={goToLogin} />
      <Notice variant="danger">{error}</Notice>

      <View style={styles.form}>
        {!linkToken && (
          <FormField
            label="Reset link"
            value={pasted}
            onChangeText={(value) => {
              setPasted(value);
              setFields((previous) => ({ ...previous, token: undefined }));
            }}
            error={fields.token}
            hint="Paste the link from the email we sent you"
            placeholder="https://…/reset-password?token=…"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
        )}

        <View style={styles.passwordBlock}>
          <FormField
            label="New password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFields((previous) => ({ ...previous, password: undefined }));
            }}
            error={fields.password}
            placeholder="Create a password"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            maxLength={72}
            editable={!busy}
          />
          <StrengthBar score={passwordStrength(password)} />
          <View style={styles.checklist}>
            <CheckItem done={hasMinLength(password)}>8 or more characters</CheckItem>
            <CheckItem done={hasNumber(password)}>Has a number</CheckItem>
            <CheckItem done={matches}>Both passwords match</CheckItem>
          </View>
        </View>

        <FormField
          label="Confirm password"
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            setFields((previous) => ({ ...previous, confirm: undefined }));
          }}
          error={fields.confirm}
          placeholder="Type it again"
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

      <Notice variant="warning">You'll be signed out on all other phones and browsers</Notice>

      <PrimaryButton title="Update password" onPress={submit} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.gapLg },
  passwordBlock: { gap: 10 },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.track },
  strengthLabel: { width: 48, textAlign: 'right' },
  checklist: { gap: 6 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkDone: { color: colors.successDark },
});
