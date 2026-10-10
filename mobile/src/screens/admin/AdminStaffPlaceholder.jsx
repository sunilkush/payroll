import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { colors, typography } from '../../theme/index.js';

export default function AdminStaffPlaceholder({ navigation }) {
  return (
    <ScreenWrapper>
      <Header title="Staff Directory" />
      <Card style={styles.card} elevation="md">
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="account-group" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Staff Management</Text>
        <Text style={styles.desc}>
          Manage team members, roles, salary structures (Basic, HRA, Special allowance), PF/ESI applicability, and active/inactive status.
        </Text>
        <Text style={styles.phaseNotice}>Phase 5: Admin Module</Text>
        <Button
          title="Back to Dashboard"
          variant="outline"
          onPress={() => navigation.navigate('AdminHome')}
          style={styles.backBtn}
        />
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 28,
    marginTop: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  phaseNotice: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginBottom: 20,
  },
  backBtn: {
    width: '100%',
  },
});
