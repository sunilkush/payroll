import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme/index.js';

export default function Avatar({
  name = '',
  source,
  size = 40,
  color = colors.primaryDark,
  bgColor = colors.primaryLight,
  style,
}) {
  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const fontSize = Math.round(size * 0.4);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={{ width: size, height: size, borderRadius: radius.pill }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize, color }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: {
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
});
