import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';
import { formatDate, todayLocal } from '../../utils/format.js';

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date (YYYY-MM-DD)',
  error,
  helper,
  disabled = false,
  required = false,
  containerStyle,
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const parseCurrent = () => {
    if (!value) return new Date();
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState(parseCurrent());

  const handleOpen = () => {
    if (disabled) return;
    setViewDate(parseCurrent());
    setModalVisible(true);
  };

  const handleSelect = (y, m, d) => {
    const formatted = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange?.(formatted);
    setModalVisible(false);
  };

  const handleQuick = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onChange?.(formatted);
    setModalVisible(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const currentVal = value || '';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredStar}> *</Text>}
        </View>
      )}

      <TouchableOpacity
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.trigger,
          Boolean(error) && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
      >
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={20}
          color={error ? colors.error : colors.primary}
          style={styles.prefixIcon}
        />
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? `${value} (${formatDate(value)})` : placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Choose Date</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Quick Presets */}
                <View style={styles.quickPresetsRow}>
                  <TouchableOpacity
                    style={styles.quickPresetBtn}
                    onPress={() => handleQuick(0)}
                  >
                    <Text style={styles.quickPresetText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPresetBtn}
                    onPress={() => handleQuick(1)}
                  >
                    <Text style={styles.quickPresetText}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPresetBtn}
                    onPress={() => handleQuick(2)}
                  >
                    <Text style={styles.quickPresetText}>In 2 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPresetBtn}
                    onPress={() => handleQuick(7)}
                  >
                    <Text style={styles.quickPresetText}>In 1 Week</Text>
                  </TouchableOpacity>
                </View>

                {/* Month Navigator */}
                <View style={styles.monthNav}>
                  <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>
                    {monthNames[month]} {year}
                  </Text>
                  <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Day of Week Headers */}
                <View style={styles.weekDaysRow}>
                  {dayLabels.map((d) => (
                    <Text key={d} style={styles.weekDayText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Calendar Days Matrix */}
                <View style={styles.daysMatrix}>
                  {Array.from({ length: firstDayIndex }).map((_, idx) => (
                    <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const thisDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = thisDateStr === currentVal;
                    const isToday = thisDateStr === todayLocal();

                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => handleSelect(year, month, dayNum)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            isSelected && styles.dayCellTextSelected,
                            isToday && !isSelected && styles.dayCellTextToday,
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  requiredStar: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  triggerError: {
    borderColor: colors.error,
    backgroundColor: colors.errorContainer,
  },
  triggerDisabled: {
    backgroundColor: colors.surfaceVariant,
    opacity: 0.6,
  },
  prefixIcon: {
    marginRight: spacing.sm,
  },
  valueText: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: 4,
    fontWeight: typography.weights.medium,
  },
  helperText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickPresetBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPresetText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  navBtn: {
    padding: spacing.xs,
  },
  monthTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  daysMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayCellText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  dayCellTextToday: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});
