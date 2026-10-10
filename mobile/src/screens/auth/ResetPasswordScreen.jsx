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
import { resetPasswordApi } from '../../api/authApi.js';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { colors, typography } from '../../theme/index.js';

export default function ResetPasswordScreen({ navigation, route }) {
  const initialToken = route?.params?.token || '';
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!token.trim()) {
      setError('Please enter the reset token');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const res = await resetPasswordApi(token.trim(), password);
      setSuccess(res?.message || 'Password reset successfully! Please log in.');
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message || 'Failed to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter reset code and your new password</Text>
            </View>
          </View>

          <Card style={styles.card} elevation="md">
            {error ? <Alert type="error">{error}</Alert> : null}
            {success ? (
              <View>
                <Alert type="success">{success}</Alert>
                <Button
                  title="Sign In with New Password"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.submitBtn}
                />
              </View>
            ) : (
              <>
                <Input
                  label="Reset Code / Token"
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste token from reset email"
                  prefixIcon="key-outline"
                  autoCapitalize="none"
                />

                <Input
                  label="New Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  prefixIcon="lock-outline"
                  secureTextEntry
                />

                <Input
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  prefixIcon="lock-check-outline"
                  secureTextEntry
                />

                <Button
                  title="Update Password"
                  onPress={handleSubmit}
                  loading={busy}
                  style={styles.submitBtn}
                />
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
    padding: 20,
  },
  submitBtn: {
    marginTop: 8,
  },
});
