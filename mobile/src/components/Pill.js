import { StyleSheet, Text, View } from 'react-native';
import { pillColors, radius, text } from '../theme';
import { statusLabel, statusVariant } from '../utils/status';

// variant: success | warning | danger | info | neutral
export default function Pill({ variant = 'neutral', children }) {
  const { background, text: color } = pillColors[variant] ?? pillColors.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[text.pill, { color }]}>{children}</Text>
    </View>
  );
}

// Server ka status seedha do: <StatusPill status="HALF_DAY" /> -> amber "Half day"
export function StatusPill({ status }) {
  return <Pill variant={statusVariant(status)}>{statusLabel(status)}</Pill>;
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
});
