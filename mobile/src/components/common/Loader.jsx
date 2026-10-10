import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme/index.js';

export default function Loader({ message, size = 'large', fullScreen = true }) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  message: {
    marginTop: 12,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
});
