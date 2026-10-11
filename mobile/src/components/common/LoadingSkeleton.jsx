import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme/index.js';

export default function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.md,
  style,
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ height = 120, style }) {
  return (
    <View style={[styles.cardWrapper, style]}>
      <LoadingSkeleton width="45%" height={18} style={{ marginBottom: 12 }} />
      <LoadingSkeleton width="90%" height={14} style={{ marginBottom: 8 }} />
      <LoadingSkeleton width="65%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  cardWrapper: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
});
