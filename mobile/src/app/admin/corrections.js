import { Text } from 'react-native';
import { approveCorrectionApi, listCorrectionsApi, rejectCorrectionApi } from '../../api/endpoints.js';
import ApprovalList from '../../components/ApprovalList.js';
import { styles } from '../../components/ui.js';
import { formatDate, formatTime } from '../../utils/format.js';

const fetchPending = () => listCorrectionsApi({ status: 'PENDING', limit: 50 }).then((response) => response.data.items);

// Maanga hua time, aur saath mein jo abhi record mein hai (tulna ke liye)
const change = (label, requested, recorded) =>
  requested ? `${label}: ${formatTime(requested)} (recorded ${formatTime(recorded)})` : null;

export default function AdminCorrections() {
  return (
    <ApprovalList
      title="Punch corrections"
      emptyText="No punch corrections are waiting."
      fetchPending={fetchPending}
      approve={approveCorrectionApi}
      reject={rejectCorrectionApi}
      renderBody={(item) => (
        <>
          <Text style={styles.text}>{formatDate(item.date)}</Text>
          {[change('Punch in', item.punchIn, item.recorded?.punchIn), change('Punch out', item.punchOut, item.recorded?.punchOut)]
            .filter(Boolean)
            .map((line) => (
              <Text key={line} style={styles.text}>
                {line}
              </Text>
            ))}
        </>
      )}
    />
  );
}
