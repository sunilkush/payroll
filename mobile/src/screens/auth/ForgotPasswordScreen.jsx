import { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { forgotPasswordApi } from '../../api/authApi.js';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const res = await forgotPasswordApi(email.trim());
      setSentMessage(res?.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message || 'Failed to send reset link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Unified App Header */}
          <Header
            title="Forgot Password"
            subtitle="Reset instructions will be sent to your email"
            onBack={() => navigation.goBack()}
          />

          <Card style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="key-outline" size={28} color={colors.primary} />
            </View>

            {error ? <Alert type="error">{error}</Alert> : null}
            {sentMessage ? (
              <View>
                <Alert type="success">{sentMessage}</Alert>
                <Text style={styles.helpText}>
                  The link is valid for 30 minutes. Please check your spam folder if you do not see it.
                </Text>
                <Button
                  title="Back to Sign In"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.submitBtn}
                />
              </View>
            ) : (
              <>
                <Input
                  label="Registered Email"
                  required
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  prefixIcon="email-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  loading={busy}
                  icon="send-outline"
                  iconPlacement="end"
                  style={styles.submitBtn}
                />

                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.backToLogin}
                >
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  helpText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backToLogin: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  backToLoginText: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
