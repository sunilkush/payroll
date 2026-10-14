import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, fonts, radius, sizes } from '../theme';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (value) => String(value).padStart(2, '0');

// Mahine ka chhota calendar (Monday se) jisme ek din chunte hain.
//   value        'YYYY-MM-DD'
//   onChange     (date) => void
//   mutedDays    weekday numbers (0 = Sunday) jo halke dikhen (jaise weekly off); chune ja sakte hain
//   marked       { 'YYYY-MM-DD': true } jin dino par chhota dot (jaise pehle se holiday)
export default function MonthCalendar({ value, onChange, mutedDays = [], marked = {} }) {
  const [year0, month0] = (value || `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`).split('-').map(Number);
  const [view, setView] = useState({ year: year0, month: month0 }); // month 1-12

  const first = new Date(view.year, view.month - 1, 1);
  const days = new Date(view.year, view.month, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);

  const shift = (by) => {
    const next = new Date(view.year, view.month - 1 + by, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable style={styles.arrow} onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="Previous month">
          <ChevronLeft size={20} strokeWidth={2} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>
          {MONTHS[view.month - 1]} {view.year}
        </Text>
        <Pressable style={styles.arrow} onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="Next month">
          <ChevronRight size={20} strokeWidth={2} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEK.map((label, index) => (
          <Text key={index} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.row}>
          {cells.slice(row * 7, row * 7 + 7).map((day, column) => {
            if (!day) return <View key={column} style={styles.cell} />;
            const date = `${view.year}-${pad(view.month)}-${pad(day)}`;
            const selected = date === value;
            const muted = mutedDays.includes(new Date(view.year, view.month - 1, day).getDay());
            return (
              <Pressable
                key={column}
                style={[styles.cell, muted && styles.muted, selected && styles.selected]}
                onPress={() => onChange(date)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${day} ${MONTHS[view.month - 1]}${muted ? ', weekly off' : ''}${marked[date] ? ', already a holiday' : ''}`}
              >
                <Text style={[styles.day, muted && styles.mutedText, selected && styles.selectedText]}>{day}</Text>
                {marked[date] && !selected && <View style={styles.mark} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabel: { width: 40, textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  cell: { width: 40, height: 40, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  muted: { backgroundColor: colors.neutralTint },
  selected: { backgroundColor: colors.ink },
  day: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
  mutedText: { color: colors.muted },
  selectedText: { color: colors.onInk, fontFamily: fonts.monoSemiBold },
  mark: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.warning },
});
