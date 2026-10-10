import { StyleSheet, View } from 'react-native';
import { borderRadius, colors, shadows } from '../../theme/index.js';

export default function Card({ children, style, elevation = 'sm' }) {
  return (
    <View style={[styles.card, shadows[elevation], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 16,
  },
});
