import { useEffect, useState } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getTodaySummaryApi } from '../../api/attendanceApi.js';
import { listLeavesApi } from '../../api/leaveApi.js';
import { listPayrollApi } from '../../api/payrollApi.js';
import { listStaffApi } from '../../api/staffApi.js';
import Alert from '../../components/Alert/Alert.jsx';
import Badge from '../../components/Badge/Badge.jsx';
import DashboardGrid from '../../components/DashboardGrid/DashboardGrid.jsx';
import DashboardHero from '../../components/DashboardHero/DashboardHero.jsx';
import ListCard, { ListRow } from '../../components/ListCard/ListCard.jsx';
import QuickLinks from '../../components/QuickLinks/QuickLinks.jsx';
import StatCards from '../../components/StatCards/StatCards.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadAll } from '../../utils/dashboard.js';
import { currentMonth, formatCurrency, formatDate, formatMonth } from '../../utils/format.js';

const LINKS = [
  { name: 'Staff', description: 'Staff add/edit aur salary structure', to: '/admin/staff', icon: <TeamOutlined /> },
  { name: 'Attendance', description: 'Monthly report aur missed punch-outs', to: '/admin/attendance', icon: <ClockCircleOutlined /> },
  { name: 'Leave Requests', description: 'CL/EL approve ya reject', to: '/admin/leaves', icon: <CalendarOutlined />, feature: 'leaveEnabled' },
  { name: 'Payroll', description: 'Salary generate, slips aur Excel', to: '/admin/payroll', icon: <WalletOutlined /> },
  { name: 'Settings', description: 'Office location, week off, leave, PF/ESI', to: '/admin/settings', icon: <SettingOutlined /> },
];

const DAY_HINT = { WEEK_OFF: 'Aaj week off hai', HOLIDAY: 'Aaj holiday hai' };

export default function AdminHome() {
  const { user, company } = useAuth();
  const [data, setData] = useState(null);
  const month = currentMonth();

  useEffect(() => {
    loadAll([
      getTodaySummaryApi(),
      listStaffApi({ status: 'active', limit: 1 }),
      listLeavesApi({ status: 'PENDING', limit: 5 }),
      listPayrollApi(month),
    ]).then(([today, staff, leaves, payroll]) => setData({ today, staff, leaves, payroll }));
  }, [month]);

  const loaded = Boolean(data);
  const today = data?.today;
  const payroll = data?.payroll;
  const pending = data?.leaves?.items ?? [];

  const stats = [
    {
      label: 'Active staff',
      value: loaded ? data.staff?.total ?? '-' : undefined,
      icon: <TeamOutlined />,
      tone: 'primary',
      to: '/admin/staff',
    },
    {
      label: 'Aaj present',
      value: loaded ? (today ? `${today.present} / ${today.totalStaff}` : '-') : undefined,
      hint: today && (DAY_HINT[today.dayType] ?? `${today.notMarked} ne punch nahi kiya`),
      icon: <CheckCircleOutlined />,
      tone: 'success',
      to: '/admin/attendance',
    },
    company?.leaveEnabled && {
      label: 'Pending leaves',
      value: loaded ? data.leaves?.total ?? '-' : undefined,
      icon: <CalendarOutlined />,
      tone: 'warning',
      to: '/admin/leaves',
    },
    {
      label: `Payroll (${formatMonth(month)})`,
      value: loaded ? (payroll?.rows.length ? formatCurrency(payroll.totals.netSalary) : 'Bani nahi') : undefined,
      hint: payroll?.rows.length ? (payroll.hasDraft ? 'Draft' : 'Final') : 'Generate karna baaki hai',
      icon: <WalletOutlined />,
      tone: 'accent',
      to: '/admin/payroll',
    },
  ].filter(Boolean);

  return (
    <section>
      <DashboardHero name={user.name} subtitle={company?.name} />

      {today?.locationsCount === 0 && (
        <Alert type="warning">
          Office location set nahi hai, isliye staff punch nahi kar payega. <Link to="/admin/settings">Settings mein location jodein</Link>
        </Alert>
      )}

      <StatCards items={stats} />

      <DashboardGrid>
        {company?.leaveEnabled && (
          <ListCard
            title="Pending leave requests"
            action={{ to: '/admin/leaves', label: 'Sab dekhein' }}
            empty="Koi pending request nahi hai."
          >
            {pending.map((leave) => (
              <ListRow
                key={leave._id}
                title={leave.userId?.name ?? 'Staff'}
                meta={`${formatDate(leave.fromDate)}${leave.toDate !== leave.fromDate ? ` - ${formatDate(leave.toDate)}` : ''} · ${leave.reason}`}
                right={
                  <Badge tone="warning">
                    {leave.type} · {leave.days} din
                  </Badge>
                }
                to="/admin/leaves"
              />
            ))}
          </ListCard>
        )}
        <QuickLinks items={LINKS} />
      </DashboardGrid>
    </section>
  );
}
