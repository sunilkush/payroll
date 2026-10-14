import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { resendVerificationApi, verifyEmailApi } from '../../api/endpoints';
import { Header, Notice, OtpInput, PrimaryButton, Screen } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, sizes, spacing, text } from '../../theme';
import { useCountdown } from '../../utils/useCountdown';

const CODE_LENGTH = 6;
// Server ek code ke baad doosra itne second baad hi bhejta hai.
const RESEND_WAIT_SEC = 60;

// Khud register kiya hua account: email par aaya 6 ank ka code. Verify hone tak app yahin rukta hai
// (server bhi tab tak company ka koi data nahi deta).
export default function VerifyScreen() {
  const { user, codeSentAt, reload, logout } = useAuth();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  // Abhi-abhi register hua ho to code tabhi gaya tha; purane account se login par turant naya maang sakte hain.
  const countdown = useCountdown(codeSentAt ? Math.max(0, RESEND_WAIT_SEC - Math.floor((Date.now() - codeSentAt) / 1000)) : 0);

  const changeCode = (next) => {
    setCode(next);
    setCodeError('');
  };

  const submit = async () => {
    if (code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await verifyEmailApi(code);
      // User ab verified hai: RootNavigator apne aap app ke andar le jata hai.
      await reload();
    } catch (err) {
      if (err.fields.code) setCodeError(err.fields.code);
      else setError(err.message);
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    setInfo('');
    try {
      const res = await resendVerificationApi();
      setCode('');
      setCodeError('');
      setInfo(res.message);
      countdown.restart(RESEND_WAIT_SEC);
    } catch (err) {
      setError(err.message);
      // "Please wait 37 seconds...": server ki bachi hui ginti se hi chalo.
      const wait = err.status === 429 ? Number(err.message.match(/(\d+) seconds/)?.[1]) : 0;
      if (wait) countdown.restart(wait);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Header title="Check your email" subtitle={`Enter the 6-digit code we sent to ${user.email}`} />
      </View>

      <Notice variant="danger">{error}</Notice>
      <Notice variant="success">{info}</Notice>

      <View style={styles.code}>
        <OtpInput value={code} onChange={changeCode} length={CODE_LENGTH} error={Boolean(codeError)} disabled={busy} />
        {codeError ? (
          <Text style={styles.codeError} accessibilityRole="alert">
            {codeError}
          </Text>
        ) : null}
      </View>

      {countdown.done ? (
        <Pressable style={styles.link} onPress={resend} disabled={resending || busy} accessibilityRole="button">
          <Text style={[text.bodySemiBold, (resending || busy) && styles.dim]}>{resending ? 'Sending a new code…' : 'Resend code'}</Text>
        </Pressable>
      ) : (
        <View style={styles.link}>
          <Text style={text.body}>
            Resend in <Text style={text.mono}>{countdown.label}</Text>
          </Text>
        </View>
      )}

      <PrimaryButton title="Verify & continue" onPress={submit} loading={busy} disabled={code.length !== CODE_LENGTH} />

      <Pressable style={styles.signOut} onPress={logout} disabled={busy} accessibilityRole="button">
        <Text style={text.body}>
          Wrong email? <Text style={text.bodySemiBold}>Sign out</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { marginTop: 24 },
  code: { gap: 8, marginTop: 4 },
  codeError: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  link: { minHeight: sizes.touch, justifyContent: 'center', alignSelf: 'flex-start' },
  dim: { color: colors.muted },
  signOut: { minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center', marginTop: spacing.gap },
});
