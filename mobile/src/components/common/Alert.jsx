import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borderRadius, colors, typography } from '../../theme/index.js';

export default function Alert({ children, message, type = 'error', onDismiss, style }) {
  const content = children || message;
  if (!content) return null;

  const getScheme = () => {
    switch (type) {
      case 'success':
        return {
          bg: colors.successBg,
          text: colors.success,
          border: '#bbf7d0',
          icon: 'check-circle-outline',
        };
      case 'warning':
        return {
          bg: colors.warningBg,
          text: colors.warning,
          border: '#fde68a',
          icon: 'alert-circle-outline',
        };
      case 'info':
        return {
          bg: colors.infoBg,
          text: colors.info,
          border: '#bfdbfe',
          icon: 'information-outline',
        };
      case 'danger':
      case 'error':
      default:
        return {
          bg: colors.dangerBg,
          text: colors.danger,
          border: '#fecaca',
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
