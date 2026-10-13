import { Text } from 'react-native';
import { approveLeaveApi, listLeavesApi, rejectLeaveApi } from '../../api/endpoints.js';
import ApprovalList from '../../components/ApprovalList.js';
import { styles } from '../../components/ui.js';
import { formatDate } from '../../utils/format.js';

const fetchPending = () => listLeavesApi({ status: 'PENDING', limit: 50 }).then((response) => response.data.items);

const HALF_DAY_TEXT = { FIRST: ' (first half)', SECOND: ' (second half)' };

export default function AdminLeaves() {
  return (
    <ApprovalList
      title="Leave requests"
      emptyText="No leave requests are waiting."
      fetchPending={fetchPending}
      approve={approveLeaveApi}
      reject={rejectLeaveApi}
      renderBody={(leave) => (
        <Text style={styles.text}>
          {leave.type} · {leave.days} {leave.days === 1 ? 'day' : 'days'} · {formatDate(leave.fromDate)}
          {leave.toDate !== leave.fromDate ? ` - ${formatDate(leave.toDate)}` : ''}
          {HALF_DAY_TEXT[leave.halfDay] ?? ''}
        </Text>
      )}
    />
  );
}
