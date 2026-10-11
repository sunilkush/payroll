import { Modal, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/index.js';
import Button from './Button.jsx';

export default function ConfirmationModal({
  visible = false,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={loading ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actions}>
                <View style={styles.actionBtn}>
                  <Button
                    title={cancelText}
                    variant="outlined"
                    onPress={onClose}
                    disabled={loading}
                    size="sm"
                  />
                </View>
                <View style={styles.actionBtn}>
                  <Button
                    title={confirmText}
                    variant={confirmVariant}
                    onPress={onConfirm}
                    loading={loading}
                    size="sm"
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.modal, // 20px
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.h3, // 18px
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.sizes.body, // 14px
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
