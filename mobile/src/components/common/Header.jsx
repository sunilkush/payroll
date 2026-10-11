import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function Header({
  title,
  subtitle,
  onBack,
  onBackPress,
  canGoBack,
  rightIcon,
  onRightPress,
  rightAction,
  rightComponent,
  style,
}) {
  const handleBack = onBack || onBackPress;
  const showBack = Boolean(handleBack || canGoBack);
  const actionIcon = rightIcon || rightAction?.icon;
  const actionPress = onRightPress || rightAction?.onPress;

  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightComponent ? (
        <View style={styles.rightComponent}>{rightComponent}</View>
      ) : actionIcon ? (
        <TouchableOpacity
          onPress={actionPress}
          style={styles.rightBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name={actionIcon} size={22} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const AppHeader = Header;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    marginBottom: spacing.xs,
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    marginLeft: spacing.sm,
  },
  rightComponent: {
    marginLeft: spacing.sm,
  },
});
