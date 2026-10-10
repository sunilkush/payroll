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
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { toFieldErrors } from '../../utils/formErrors.js';
import { borderRadius, colors, typography } from '../../theme/index.js';

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
      // Auth state update in AuthContext automatically redirects to AdminHome
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setFieldErrors(fieldMap);
      setError(Object.keys(fieldMap).length ? '' : err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Start free 14-day trial for your organization</Text>
            </View>
          </View>

          {/* Form Card */}
          <Card style={styles.card} elevation="md">
            {error ? <Alert type="error">{error}</Alert> : null}

            <Input
              label="Company / Organization Name *"
              value={form.companyName}
              onChangeText={(text) => handleChange('companyName', text)}
              placeholder="e.g. Acme Tech Solutions"
              prefixIcon="domain"
              error={fieldErrors.companyName}
            />

            <Input
              label="Your Full Name *"
              value={form.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="e.g. Rajesh Sharma"
              prefixIcon="account-outline"
              error={fieldErrors.name}
            />

            <Input
              label="Work Email *"
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
              label="Password *"
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
    paddingVertical: 16,
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
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
