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
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { getApiUrl, setApiUrl } from '../../config/env.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
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
      setError('Please enter your email and password');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(form);
      // Navigation is automatically handled by RootNavigator observing auth state
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message || 'Login failed. Please check your credentials.');
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
    <ScreenWrapper contentContainerStyle={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Top Brand Banner */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="wallet-membership" size={36} color={colors.primary} />
            </View>
            <Text style={styles.brandTitle}>PayRoster</Text>
            <Text style={styles.brandSubtitle}>Modern Payroll & Attendance Management</Text>
          </View>

          {/* Login Card */}
          <Card style={styles.card} elevation="md">
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.welcomeSubtext}>Sign in to your account</Text>
            </View>

            {error ? <Alert type="error">{error}</Alert> : null}

            <Input
              label="Email or Phone"
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              placeholder="you@company.com"
              prefixIcon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              value={form.password}
              onChangeText={(text) => handleChange('password', text)}
              placeholder="••••••••"
              prefixIcon="lock-outline"
              secureTextEntry
            />

            <View style={styles.forgotRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Sign In"
              onPress={handleSubmit}
              loading={submitting}
              icon="arrow-right"
              iconPlacement="end"
              style={styles.submitBtn}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Server Config link for Developer / Test mode */}
          <TouchableOpacity
            style={styles.serverConfigBtn}
            onPress={() => setServerModalVisible(true)}
          >
            <MaterialCommunityIcons name="server-network" size={14} color={colors.textMuted} />
            <Text style={styles.serverConfigText}>
              Server: {getApiUrl().replace('/api/v1', '')}
            </Text>
          </TouchableOpacity>

          {/* Server URL Modal */}
          <Modal
            visible={serverModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setServerModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <Card style={styles.modalCard} elevation="lg">
                <Text style={styles.modalTitle}>Backend Server API</Text>
                <Text style={styles.modalSubtitle}>
                  Change API URL to connect to local IP or cloud server:
                </Text>

                {serverSavedMsg ? <Alert type="success">{serverSavedMsg}</Alert> : null}

                <Input
                  label="API Base URL"
                  value={customServerUrl}
                  onChangeText={setCustomServerUrl}
                  placeholder="http://192.168.1.5:5000/api/v1"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.modalBtnRow}>
                  <Button
                    title="Reset Default"
                    variant="secondary"
                    onPress={handleResetServerUrl}
                    style={styles.modalBtn}
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveServerUrl}
                    style={styles.modalBtn}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setServerModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </Card>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  brandTitle: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    padding: 24,
  },
  cardHeader: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  welcomeSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  submitBtn: {
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  serverConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 8,
  },
  serverConfigText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
  },
  modalCloseBtn: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  modalCloseText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});
