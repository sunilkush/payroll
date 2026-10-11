import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function Toast({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 3500,
  style,
}) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(() => {
          hide();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      hide();
    }
  }, [visible, message]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!visible && !message) return null;

  const configMap = {
    success: {
      icon: 'check-circle',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      color: '#065F46',
      iconColor: colors.success,
    },
    error: {
      icon: 'alert-circle',
      bg: '#FEF2F2',
      border: '#FECACA',
      color: '#991B1B',
      iconColor: colors.error,
    },
    warning: {
      icon: 'alert',
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#92400E',
      iconColor: colors.warning,
    },
    info: {
      icon: 'information',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      color: '#1E40AF',
      iconColor: colors.primary,
    },
  };

  const cfg = configMap[type] || configMap.info;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={cfg.icon} size={20} color={cfg.iconColor} style={styles.icon} />
      <Text style={[styles.message, { color: cfg.color }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={hide}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.closeBtn}
      >
        <MaterialCommunityIcons name="close" size={16} color={cfg.color} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  closeBtn: {
    marginLeft: spacing.xs,
    padding: 2,
  },
});
