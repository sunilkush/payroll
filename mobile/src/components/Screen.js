import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

// Har screen ka dhancha: paper background + safe area + 20 ki padding.
//   scroll      false ho to content scroll nahi hota (jaise poori screen ka map)
//   onRefresh   kheench kar taaza karna (refreshing ke saath)
//   footer      neeche chipka hua hissa (jaise primary button); keyboard ke upar rehta hai
//   overlay     content ke upar tairne wali cheez (jaise Toast)
//   edges       tab wali screens neeche ka safe area khud nahi lete: ['top']
export default function Screen({ children, scroll = true, onRefresh, refreshing = false, footer, overlay, edges = ['top', 'bottom'], padded = true }) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, padded && styles.padded]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.fill} edges={edges}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1, gap: spacing.gapLg },
  padded: { padding: spacing.screen },
  footer: { paddingHorizontal: spacing.screen, paddingTop: spacing.gap, paddingBottom: spacing.gapLg, gap: spacing.gap },
});
