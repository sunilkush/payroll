import { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { toFieldErrors } from '../../utils/formErrors.js';
import { colors, spacing, typography } from '../../theme/index.js';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (error) setError('');
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError('');
    setFieldErrors({});

    if (!form.companyName.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      setError('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setFieldErrors(fieldMap);
      setError(Object.keys(fieldMap).length ? '' : err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Unified App Header */}
          <Header
            title="Create Organization"
            subtitle="Start free 14-day trial for your company"
            onBack={() => navigation.goBack()}
          />

          {/* Form Card */}
          <Card style={styles.card}>
            {error ? <Alert type="error">{error}</Alert> : null}

            <Input
              label="Company Name"
              required
              value={form.companyName}
              onChangeText={(text) => handleChange('companyName', text)}
              placeholder="e.g. Acme Tech Solutions"
              prefixIcon="domain"
              error={fieldErrors.companyName}
            />

            <Input
              label="Your Full Name"
              required
              value={form.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="e.g. Rajesh Sharma"
              prefixIcon="account-outline"
              error={fieldErrors.name}
            />

            <Input
              label="Work Email"
              required
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              placeholder="you@company.com"
              prefixIcon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              error={fieldErrors.email}
            />

            <Input
              label="Phone Number"
              value={form.phone}
              onChangeText={(text) => handleChange('phone', text)}
              placeholder="10-digit mobile number"
              prefixIcon="phone-outline"
              keyboardType="phone-pad"
              error={fieldErrors.phone}
            />

            <Input
              label="Password"
              required
              value={form.password}
              onChangeText={(text) => handleChange('password', text)}
              placeholder="At least 6 characters"
              prefixIcon="lock-outline"
              secureTextEntry
              error={fieldErrors.password}
            />

            <Button
              title="Create Organization"
              onPress={handleSubmit}
              loading={submitting}
              icon="rocket-launch-outline"
              iconPlacement="end"
              style={styles.submitBtn}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    marginTop: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});
