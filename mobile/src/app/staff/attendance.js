import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMonthlyAttendanceApi } from '../../api/endpoints.js';
import { Card, Screen, Stat, StatRow, StatusBadge, styles } from '../../components/ui.js';
import { colors } from '../../theme.js';
import { addMonths, currentMonth, formatMinutes, formatMonth, formatTime, weekdayName } from '../../utils/format.js';
import { useLoad } from '../../utils/useLoad.js';

export default function Attendance() {
  const [month, setMonth] = useState(currentMonth);
  const fetchMonth = useCallback(() => getMonthlyAttendanceApi({ month }).then((response) => response.data), [month]);
  const { data, error, loading, refreshing, refresh } = useLoad(fetchMonth);

  const isCurrent = month >= currentMonth();
  // Aane wale din aur joining se pehle ke din (status null) list mein nahi dikhte; naya din sabse upar.
  const days = (data?.days ?? []).filter((day) => day.status).reverse();

  return (
    <Screen title="My attendance" loading={loading} refreshing={refreshing} onRefresh={refresh} error={error}>
      <Card style={styles.row}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={12} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.heading}>{formatMonth(month)}</Text>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} disabled={isCurrent} hitSlop={12} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={22} color={isCurrent ? colors.border : colors.primary} />
        </Pressable>
      </Card>

      {data ? (
        <>
          <StatRow>
            <Stat label="Present" value={data.summary.present} tone="success" />
            <Stat label="Absent" value={data.summary.absent} tone="danger" />
            <Stat label="Leave" value={data.summary.leave} tone="info" />
            <Stat label="Week off" value={data.summary.weekOff} />
            <Stat label="Holiday" value={data.summary.holiday} />
            <Stat label="Missed out" value={data.summary.missedPunchOut} tone="warning" />
          </StatRow>

          {days.map((day) => (
            <Card key={day.date}>
              <View style={styles.row}>
                <Text style={styles.heading}>
                  {day.date.slice(8)} {weekdayName(day.weekday)}
                </Text>
                <StatusBadge status={day.status} />
              </View>
              {day.punchIn ? (
                <Text style={styles.text}>
                  {formatTime(day.punchIn.time)} - {day.punchOut ? formatTime(day.punchOut.time) : 'no punch out'}
                  {day.workedMinutes ? `  ·  ${formatMinutes(day.workedMinutes)}` : ''}
                </Text>
              ) : null}
              {day.note || day.late || day.earlyOut ? (
                <Text style={styles.muted}>
                  {[day.note, day.late && 'Late', day.earlyOut && 'Early out'].filter(Boolean).join('  ·  ')}
                </Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
