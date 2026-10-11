import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';
import Button from './Button.jsx';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data. Please check your connection and try again.',
  onRetry,
  retryTitle = 'Try Again',
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="alert-circle-outline" size={36} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {Boolean(message) && <Text style={styles.message}>{message}</Text>}
      {Boolean(onRetry) && (
        <View style={styles.actionWrapper}>
          <Button
            title={retryTitle}
            onPress={onRetry}
            variant="outlined"
            size="sm"
            fullWidth={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  actionWrapper: {
    marginTop: spacing.lg,
  },
});
