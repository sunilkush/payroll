import { Text } from 'react-native';
import { text } from '../theme';
import { formatMoney } from '../utils/format';

// Paise hamesha isi se: mono font + Indian format (₹1,61,842). large: bada (hero card ka total).
export default function Money({ value, large = false, style }) {
  return <Text style={[large ? text.monoLarge : text.mono, style]}>{formatMoney(value)}</Text>;
}
