import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext.js';
import { Button, Notice, styles } from '../components/ui.js';
import { colors, space } from '../theme.js';

export default function Login() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Kamyab hone par root layout khud andar ki screens par le jata hai.
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.md }}
      >
        <View style={{ marginBottom: space.lg }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary }}>PayRoster</Text>
          <Text style={styles.muted}>Attendance, leave and salary</Text>
        </View>

        {/* notice: server ne pichhla session kyun band kiya (jaise subscription khatam) */}
        {error || notice ? <Notice tone="danger" text={error || notice} /> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          placeholder="you@company.com"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          onSubmitEditing={submit}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
        />
        <Button label="Log in" onPress={submit} loading={submitting} />
        <Text style={styles.muted}>Forgot your password? Reset it from the PayRoster website.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
