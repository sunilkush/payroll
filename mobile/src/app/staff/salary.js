import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE, tokenStore } from '../../api/client.js';
import { getMeApi, listMyPayrollsApi } from '../../api/endpoints.js';
import { Button, Card, Empty, Screen, styles } from '../../components/ui.js';
import { formatMoney, formatMonth } from '../../utils/format.js';
import { useLoad } from '../../utils/useLoad.js';

const fetchPayrolls = () => listMyPayrollsApi().then((response) => response.data.rows);

// Slip PDF login token ke saath phone par utarti hai, phir share / save / open ka sheet khulta hai.
async function downloadSlip(payroll) {
  // Download seedha file system se hota hai (axios se nahi), isliye pehle ek chhoti API call:
  // access token purana ho to yahin refresh ho jata hai.
  await getMeApi();
  const file = new File(Paths.cache, `salary-slip-${payroll.period}.pdf`);
  if (file.exists) file.delete();
  const task = File.createDownloadTask(`${API_BASE}/payroll/${payroll._id}/slip`, file, {
    headers: { Authorization: `Bearer ${tokenStore.get()}` },
  });
  const saved = await task.downloadAsync();
  if (!saved) throw new Error('Download did not finish. Please try again.');
  await Sharing.shareAsync(saved.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

export default function Salary() {
  const { data: rows, error, loading, refreshing, refresh } = useLoad(fetchPayrolls);
  const [downloadingId, setDownloadingId] = useState(null);

  async function open(payroll) {
    setDownloadingId(payroll._id);
    try {
      await downloadSlip(payroll);
    } catch (err) {
      Alert.alert('Could not download the slip', err.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Screen title="My salary" loading={loading} refreshing={refreshing} onRefresh={refresh} error={error}>
      {rows && !rows.length ? <Empty text="No salary slips yet. Slips appear after payroll is finalized." /> : null}
      {(rows ?? []).map((payroll) => (
        <Card key={payroll._id}>
          <View style={styles.row}>
            <Text style={styles.heading}>{formatMonth(payroll.period)}</Text>
            <Text style={styles.heading}>{formatMoney(payroll.netSalary)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Earned gross</Text>
            <Text style={styles.text}>{formatMoney(payroll.earnings.gross)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Deductions (PF {formatMoney(payroll.deductions.pf)}, ESI {formatMoney(payroll.deductions.esi)})</Text>
            <Text style={styles.text}>{formatMoney(payroll.deductions.total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Payable days</Text>
            <Text style={styles.text}>
              {payroll.payableDays} (LOP {payroll.lopDays})
            </Text>
          </View>
          <Button label="Download slip" variant="outline" onPress={() => open(payroll)} loading={downloadingId === payroll._id} />
        </Card>
      ))}
    </Screen>
  );
}
