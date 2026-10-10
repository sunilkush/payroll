import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    Alert.alert('Sign Out', 'Are you sure you want to sign out from your PayRoster account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper scrollable contentContainerStyle={styles.container}>
      <Header
        title="My Profile"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Profile Overview Card */}
      <Card style={styles.profileCard} elevation="sm">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name || 'EM')}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <Badge label={ROLE_LABEL[user?.role] || 'Staff'} variant="primary" size="sm" />
          {user?.employeeCode ? (
            <Badge label={`ID: ${user.employeeCode}`} variant="default" size="sm" />
          ) : null}
          <Badge
            label={user?.isActive !== false ? 'Active' : 'Inactive'}
            variant={user?.isActive !== false ? 'success' : 'danger'}
            size="sm"
          />
        </View>
      </Card>

      {/* Employment Details */}
      <Text style={styles.sectionTitle}>Employment & Statutory Details</Text>
      <Card style={styles.detailsCard} elevation="sm">
        <DetailItem
          icon="domain"
          label="Organization"
          value={company?.name || 'PayRoster Tenant'}
        />
        <DetailItem
          icon="phone-outline"
          label="Mobile Phone"
          value={user?.phone || 'Not provided'}
        />
        <DetailItem
          icon="calendar-account-outline"
          label="Date of Joining"
          value={user?.joiningDate ? formatDate(user.joiningDate) : 'Not specified'}
        />
        <DetailItem
          icon="shield-check-outline"
          label="EPF (Provident Fund)"
          value={user?.pfApplicable ? 'Enrolled (12%)' : 'Not Applicable'}
        />
        <DetailItem
          icon="hospital-box-outline"
          label="ESI (Health Insurance)"
          value={user?.esiApplicable ? 'Enrolled (0.75%)' : 'Not Applicable'}
          isLast
        />
      </Card>

      {/* Quick Navigation Items */}
      <Text style={styles.sectionTitle}>Employee Services</Text>
      <Card style={styles.servicesCard} elevation="sm">
        <ServiceRow
          icon="file-document-outline"
          iconColor={colors.primary}
          iconBg={colors.primaryBg}
          title="Salary Slips & Tax Summary"
          subtitle="View monthly payslips & deduction details"
          onPress={() => navigation.navigate('StaffSalary')}
        />
        <View style={styles.rowDivider} />
        <ServiceRow
          icon="timer-edit-outline"
          iconColor={colors.warning}
          iconBg={colors.warningBg}
          title="Attendance Punch Corrections"
          subtitle="Request fix for missed or delayed punches"
          onPress={() => navigation.navigate('StaffCorrections')}
        />
        <View style={styles.rowDivider} />
        <ServiceRow
          icon="briefcase-clock-outline"
          iconColor={colors.info}
          iconBg={colors.infoBg}
          title="Client Visits & Field Meetings"
          subtitle="Geofence & visit check-in tracker"
          onPress={() => navigation.navigate('StaffMeetings')}
          isLast
        />
      </Card>

      {/* Sign Out Button */}
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

function DetailItem({ icon, label, value, isLast = false }) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailBorder]}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={colors.textSecondary}
        style={styles.detailIcon}
      />
      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ServiceRow({ icon, iconColor, iconBg, title, subtitle, onPress, isLast = false }) {
  return (
    <TouchableOpacity
      style={styles.serviceRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.serviceIconCircle, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.serviceTextCol}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
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
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  detailsCard: {
    padding: 14,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  servicesCard: {
    padding: 8,
    marginBottom: 24,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  serviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceTextCol: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  serviceSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 10,
  },
  logoutBtn: {
    marginTop: 4,
  },
});
