import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, sizes, spacing, text } from '../theme';

// Neeche tairta message + "Undo" (jaise approve ke baad). Kab hatna hai wo screen tay karti hai (timer wahan).
export default function UndoToast({ message, onUndo }) {
  if (!message) return null;
  return (
    <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={[text.bodyMedium, styles.text]} numberOfLines={2}>
        {message}
      </Text>
      {onUndo && (
        <Pressable style={styles.undo} onPress={onUndo} accessibilityRole="button" accessibilityLabel="Undo">
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.gapLg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: sizes.button,
  },
  text: { flex: 1, color: colors.onInk, fontSize: 14, lineHeight: 20 },
  undo: { minHeight: sizes.touch, minWidth: sizes.touch, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  undoText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.successBright },
});
