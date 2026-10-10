import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { colors, typography } from '../../theme/index.js';

export default function SuperAdminSettingsPlaceholder({ navigation }) {
  return (
    <ScreenWrapper>
      <Header title="Statutory Rates" />
      <Card style={styles.card} elevation="md">
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="cog-outline" size={48} color={colors.chart1} />
        </View>
        <Text style={styles.title}>Global PF & ESI Rules</Text>
        <Text style={styles.desc}>
          Configure statutory parameters: EPF rate, wage ceilings, EPS breakdown, and ESI threshold for all Indian payroll companies.
        </Text>
        <Text style={styles.phaseNotice}>Phase 6: SuperAdmin Module</Text>
        <Button
          title="Back to Dashboard"
          variant="outline"
          onPress={() => navigation.navigate('SuperAdminHome')}
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
    backgroundColor: '#ede9fe',
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
    color: colors.chart1,
    fontWeight: typography.weights.semibold,
    marginBottom: 20,
  },
  backBtn: {
    width: '100%',
  },
});
