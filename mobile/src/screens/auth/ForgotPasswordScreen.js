import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LockKeyhole, MailCheck } from 'lucide-react-native';
import { forgotPasswordApi } from '../../api/endpoints';
import { Card, FormField, Header, Notice, PrimaryButton, Screen } from '../../components';
import { colors, fonts, radius, sizes, text } from '../../theme';
import { useCountdown } from '../../utils/useCountdown';

const RESEND_WAIT_SEC = 60;

// Email par reset link (POST /auth/forgot-password). Jawab hamesha ek jaisa hota hai, email register ho ya na ho:
// koi ye na jaan sake ki kaun sa email system mein hai. Isliye yahan bhi server ka hi message dikhta hai.
export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState(''); // khali = abhi bheja nahi
  const [busy, setBusy] = useState(false);
  const countdown = useCountdown(0);

  const send = async () => {
    setBusy(true);
    setError('');
    setEmailError('');
    try {
      const res = await forgotPasswordApi(email.trim());
      setSentMessage(res.message);
      countdown.restart(RESEND_WAIT_SEC);
    } catch (err) {
      if (err.fields.email) setEmailError(err.fields.email);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sentMessage) {
    return (
      <Screen>
        <Header title="Check your inbox" onBack={navigation.goBack} />
        <Notice variant="danger">{error}</Notice>
        <Card>
          <View style={[styles.tile, styles.tileSuccess]}>
            <MailCheck size={24} strokeWidth={1.8} color={colors.success} />
          </View>
          <Text style={text.bodySemiBold}>{sentMessage}</Text>
          <Text style={text.small}>
            We sent it to <Text style={styles.email}>{email.trim()}</Text>. The link works only once and expires soon, so use it right
            away. Check your spam folder if you do not see it.
          </Text>
        </Card>

        {countdown.done ? (
          <Pressable style={styles.link} onPress={send} disabled={busy} accessibilityRole="button">
            <Text style={[text.bodySemiBold, busy && styles.dim]}>{busy ? 'Sending…' : 'Resend link'}</Text>
          </Pressable>
        ) : (
          <View style={styles.link}>
            <Text style={text.body}>
              Resend in <Text style={text.mono}>{countdown.label}</Text>
            </Text>
          </View>
        )}

        <PrimaryButton title="Back to sign in" onPress={navigation.goBack} disabled={busy} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Forgot password" onBack={navigation.goBack} />
      <View style={styles.tile}>
        <LockKeyhole size={24} strokeWidth={1.8} color={colors.ink} />
      </View>
      <Text style={text.body}>Enter your work email and we will send you a link to set a new password.</Text>

      <Notice variant="danger">{error}</Notice>

      <FormField
        label="Work email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError('');
        }}
        error={emailError}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={send}
        editable={!busy}
        autoFocus
      />

      <PrimaryButton title="Send reset link" onPress={send} loading={busy} disabled={!email.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSuccess: { backgroundColor: colors.successTint, borderColor: colors.successTint },
  email: { fontFamily: fonts.bodySemiBold, color: colors.ink },
  link: { minHeight: sizes.touch, justifyContent: 'center', alignSelf: 'flex-start' },
  dim: { color: colors.muted },
});
