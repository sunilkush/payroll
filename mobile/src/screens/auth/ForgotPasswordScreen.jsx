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
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, typography } from '../../theme/index.js';

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
    <ScreenWrapper contentContainerStyle={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>Reset instructions will be sent to your email</Text>
            </View>
          </View>

          <Card style={styles.card} elevation="md">
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="key-outline" size={32} color={colors.primary} />
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
    paddingVertical: 20,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  helpText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  backToLogin: {
    alignItems: 'center',
    padding: 8,
  },
  backToLoginText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
