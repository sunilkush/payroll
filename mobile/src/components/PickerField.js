import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { colors, fonts, radius, sizes, text } from '../theme';
import { formatDateWithYear } from '../utils/format';
import BottomSheet from './BottomSheet';
import { PrimaryButton } from './Buttons';

const pad = (value) => String(value).padStart(2, '0');

// value <-> Date. date: 'YYYY-MM-DD', time: 'HH:mm' (phone ke local time mein, bina timezone ke).
function toDate(mode, value) {
  const now = new Date();
  if (!value) return now;
  if (mode === 'date') {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const [hours, minutes] = value.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

const fromDate = (mode, date) =>
  mode === 'date' ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`;

// FormField jaisa dabba jo date / time picker kholta hai (Android: system ka dialog, iOS: neeche se sheet).
//   mode       'date' | 'time'
//   value      'YYYY-MM-DD' / 'HH:mm' ya ''
//   onChange   (value) => void
//   max / min  'YYYY-MM-DD' (sirf date)
export default function PickerField({ label, mode = 'date', value, onChange, error, hint, placeholder, max, min, disabled = false }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const Icon = mode === 'date' ? Calendar : Clock;
  const shown = value ? (mode === 'date' ? formatDateWithYear(value) : value) : placeholder ?? (mode === 'date' ? 'Choose a date' : '--:--');
  const limits = mode === 'date' ? { maximumDate: max ? toDate('date', max) : undefined, minimumDate: min ? toDate('date', min) : undefined } : {};

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(mode, value),
        mode,
        is24Hour: true,
        ...limits,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onChange(fromDate(mode, picked));
        },
      });
      return;
    }
    setDraft(toDate(mode, value));
    setSheetOpen(true);
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={text.label}>{label}</Text> : null}
      <Pressable
        style={[styles.box, error && styles.invalid, disabled && styles.disabled]}
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
      >
        <Text style={[styles.value, mode === 'time' && styles.mono, !value && styles.placeholder]}>{shown}</Text>
        <Icon size={20} strokeWidth={1.8} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={text.small}>{hint}</Text> : null}

      {Platform.OS !== 'android' && (
        <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={label}>
          {draft && (
            <DateTimePicker
              value={draft}
              mode={mode}
              display={mode === 'date' ? 'inline' : 'spinner'}
              is24Hour
              locale="en-GB"
              {...limits}
              onChange={(event, picked) => picked && setDraft(picked)}
              themeVariant="light"
              accentColor={colors.success}
            />
          )}
          <PrimaryButton
            title="Done"
            onPress={() => {
              onChange(fromDate(mode, draft));
              setSheetOpen(false);
            }}
          />
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 6 },
  box: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    paddingHorizontal: 14,
  },
  invalid: { borderColor: colors.danger },
  disabled: { opacity: 0.5 },
  value: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  mono: { fontFamily: fonts.mono },
  placeholder: { color: colors.muted },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});
