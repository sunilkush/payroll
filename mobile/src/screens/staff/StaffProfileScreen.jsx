import { Alert, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate } from '../../utils/format.js';
import { initials, ROLE_LABEL } from '../../utils/roles.js';

export default function StaffProfileScreen({ navigation }) {
  const { user, company, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper>
      <Header
        title="My Profile"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <Card style={styles.profileCard} elevation="md">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name || 'ST')}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <Badge label={ROLE_LABEL[user?.role] || user?.role} variant="primary" />
          {user?.employeeCode && (
            <Badge label={`ID: ${user.employeeCode}`} variant="default" style={styles.codeBadge} />
          )}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Account Details</Text>
      <Card style={styles.detailsCard}>
        <DetailItem icon="domain" label="Company" value={company?.name || 'PayRoster'} />
        <DetailItem icon="phone-outline" label="Phone" value={user?.phone || 'Not provided'} />
        <DetailItem
          icon="calendar-outline"
          label="Joining Date"
          value={user?.joiningDate ? formatDate(user.joiningDate) : 'Not specified'}
        />
        <DetailItem
          icon="shield-account-outline"
          label="PF Status"
          value={user?.pfApplicable ? 'Enrolled' : 'Not Enrolled'}
        />
      </Card>

      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="danger"
        icon="logout"
        style={styles.logoutBtn}
      />
    </ScreenWrapper>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.textSecondary} style={styles.detailIcon} />
      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.sm,
  },
  avatarText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  email: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeBadge: {
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailIcon: {
    marginRight: 14,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 8,
  },
});
