import { useState } from 'react';
import {
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { getApiUrl, setApiUrl } from '../../config/env.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Server URL config modal for dev/testing
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(getApiUrl());
  const [serverSavedMsg, setServerSavedMsg] = useState('');

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email or ID and password');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(form);
    } catch (err) {
      setError(
        err.errors?.[0]?.message ||
          err.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveServerUrl = async () => {
    await setApiUrl(customServerUrl);
    setServerSavedMsg('Server URL updated!');
    setTimeout(() => {
      setServerSavedMsg('');
      setServerModalVisible(false);
    }, 1000);
  };

  const handleResetServerUrl = async () => {
    const defaultUrl = await setApiUrl(null);
    setCustomServerUrl(defaultUrl);
    setServerSavedMsg('Reset to default!');
    setTimeout(() => {
      setServerSavedMsg('');
      setServerModalVisible(false);
    }, 1000);
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Top Brand Logo matching Screen 2 */}
          <View style={styles.brandRow}>
            <View style={styles.appIconBadge}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>
              Feature <Text style={styles.brandNameHighlight}>Payroll</Text>
            </Text>
          </View>

          {/* Welcome Titles */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to your account</Text>
          </View>

          {error ? <Alert type="error">{error}</Alert> : null}

          {/* Inputs matching Screen 2 */}
          <View style={styles.form}>
            <Input
              label="Email or Employee ID"
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              placeholder="Enter your email or ID"
              prefixIcon="account-outline"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              value={form.password}
              onChangeText={(text) => handleChange('password', text)}
              placeholder="Enter password"
              prefixIcon="lock-outline"
              secureTextEntry
            />

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.rememberForgotRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={rememberMe ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Button
              title="Login"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.loginBtn}
            />

            {/* OR Divider */}
            <View style={styles.orDividerRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Login with OTP Button */}
            <TouchableOpacity
              style={styles.otpBtn}
              onPress={() => {
                // If OTP login is tapped, show hint or future modal
                setError('OTP login is coming soon. Please sign in with your password.');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.otpBtnText}>Login with OTP</Text>
            </TouchableOpacity>

            {/* Contact HR Footer */}
            <View style={styles.contactHrRow}>
              <Text style={styles.contactHrText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.contactHrLink}>Contact HR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Server Config link for Developer / Test mode */}
          <TouchableOpacity
            style={styles.serverConfigBtn}
            onPress={() => setServerModalVisible(true)}
          >
            <MaterialCommunityIcons name="server-network" size={14} color={colors.textSecondary} />
            <Text style={styles.serverConfigText}>Server Settings</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {/* Server Config Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend API Settings</Text>
            <Text style={styles.modalDesc}>
              Configure local IP or production API endpoint.
            </Text>

            <Input
              label="Server URL"
              value={customServerUrl}
              onChangeText={setCustomServerUrl}
              placeholder="http://192.168.1.X:5000"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {serverSavedMsg ? (
              <Text style={styles.serverSuccessMsg}>{serverSavedMsg}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                title="Reset Default"
                variant="outline"
                size="sm"
                onPress={handleResetServerUrl}
                style={{ flex: 1 }}
              />
              <Button
                title="Save & Connect"
                size="sm"
                onPress={handleSaveServerUrl}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    backgroundColor: '#F8FAFC',
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 36,
  },
  appIconBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  brandNameHighlight: {
    color: colors.primary,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  form: {
    marginTop: 4,
  },
  rememberForgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  forgotText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  otpBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBtnText: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  contactHrRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  contactHrText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  contactHrLink: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  serverConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 8,
  },
  serverConfigText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: 24,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  serverSuccessMsg: {
    fontSize: 13,
    color: colors.success,
    fontWeight: typography.weights.semibold,
    marginVertical: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
