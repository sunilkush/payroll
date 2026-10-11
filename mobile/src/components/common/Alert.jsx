import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function Alert({ children, message, type = 'error', onDismiss, style }) {
  const content = children || message;
  if (!content) return null;

  const getScheme = () => {
    switch (type) {
      case 'success':
        return {
          bg: colors.successContainer,
          text: colors.success,
          border: '#BBF7D0',
          icon: 'check-circle-outline',
        };
      case 'warning':
        return {
          bg: colors.warningContainer,
          text: colors.warning,
          border: '#FDE68A',
          icon: 'alert-circle-outline',
        };
      case 'info':
        return {
          bg: colors.infoContainer,
          text: colors.info,
          border: '#BAE6FD',
          icon: 'information-outline',
        };
      case 'danger':
      case 'error':
      default:
        return {
          bg: colors.errorContainer,
          text: colors.error,
          border: '#FECACA',
          icon: 'alert-circle-outline',
        };
    }
  };

  const scheme = getScheme();

  return (
    <View
      style={[
        styles.alert,
        { backgroundColor: scheme.bg, borderColor: scheme.border },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={scheme.icon}
        size={18}
        color={scheme.text}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: scheme.text }]}>{content}</Text>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss alert"
        >
          <MaterialCommunityIcons name="close" size={16} color={scheme.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.control, // 8px
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: spacing.sm,
  },
});
