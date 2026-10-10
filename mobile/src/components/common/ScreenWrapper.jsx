import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/index.js';

export default function ScreenWrapper({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  withPadding = true,
  backgroundColor = colors.bg,
}) {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    { backgroundColor, paddingTop: insets.top, paddingBottom: insets.bottom },
    style,
  ];

  if (!scrollable) {
    return (
      <View style={containerStyle}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.inner, withPadding && styles.padding]}
        >
          {children}
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
        style={styles.inner}
      >
        <ScrollView
          contentContainerStyle={[
            withPadding && styles.padding,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
