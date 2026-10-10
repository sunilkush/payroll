import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { colors, typography } from '../../theme/index.js';

export default function StaffLeavesPlaceholder({ navigation }) {
  return (
    <ScreenWrapper>
      <Header title="My Leaves" />
      <Card style={styles.card} elevation="md">
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="calendar-check" size={48} color={colors.success} />
        </View>
        <Text style={styles.title}>Leave Management & Balance</Text>
        <Text style={styles.desc}>
          Check Casual Leave (CL) and Earned Leave (EL) balances, apply for leave with auto-balance blocking, and track approval status.
        </Text>
        <Text style={styles.phaseNotice}>
          Phase 4: Staff Leave Module
        </Text>
        <Button
          title="Back to Dashboard"
          variant="outline"
          onPress={() => navigation.navigate('StaffHome')}
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
    backgroundColor: '#dcfce7',
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
    color: colors.success,
    fontWeight: typography.weights.semibold,
    marginBottom: 20,
  },
  backBtn: {
    width: '100%',
  },
});
