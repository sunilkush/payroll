import { useState } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Segmented } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import AttendanceStatus from '../../components/AttendanceStatus/AttendanceStatus.jsx';
import Badge from '../../components/Badge/Badge.jsx';
import Button from '../../components/Button/Button.jsx';
import ChartCard from '../../components/ChartCard/ChartCard.jsx';
import { AreaTrend, BarTrend, Donut } from '../../components/Charts/Charts.jsx';
import DashboardRow from '../../components/DashboardGrid/DashboardGrid.jsx';
import DataTable from '../../components/DataTable/DataTable.jsx';
import ListCard, { ListRow } from '../../components/ListCard/ListCard.jsx';
import MeetingsToday from '../../components/MeetingsToday/MeetingsToday.jsx';
import StatCard, { StatGrid } from '../../components/StatCard/StatCard.jsx';
import UserCell from '../../components/UserCell/UserCell.jsx';
import WelcomeHeader from '../../components/WelcomeHeader/WelcomeHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCompactCurrency, formatCurrency, formatDate, formatShortDate, formatTime, timeAgo } from '../../utils/format.js';
import { useDashboard } from '../../utils/useDashboard.js';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];
const DAY_TEXT = { WEEK_OFF: 'Today is a week off', HOLIDAY: 'Today is a holiday' };
const ACTIVITY_ICON = {
  PUNCH_IN: { icon: <LoginOutlined />, tone: 'success' },
  PUNCH_OUT: { icon: <LogoutOutlined />, tone: 'muted' },
  LEAVE_APPLIED: { icon: <CalendarOutlined />, tone: 'warning' },
  LEAVE_APPROVED: { icon: <CheckCircleOutlined />, tone: 'success' },
  LEAVE_REJECTED: { icon: <CalendarOutlined />, tone: 'danger' },
  LEAVE_CANCELLED: { icon: <CalendarOutlined />, tone: 'muted' },
};
const STATUS_ORDER = ['PRESENT', 'LEAVE', 'NOT_MARKED', 'WEEK_OFF', 'HOLIDAY'];

const ATTENDANCE_COLUMNS = [
  {
    title: 'Staff',
    key: 'staff',
    sorter: (a, b) => a.staff.name.localeCompare(b.staff.name),
    render: (_, row) => <UserCell name={row.staff.name} sub={row.staff.employeeCode} to={`/admin/attendance/${row.staff._id}`} />,
  },
  {
    title: 'Status',
    key: 'status',
    sorter: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    render: (_, row) => <AttendanceStatus status={row.status} />,
  },
  {
    title: 'Punch in',
    key: 'punchIn',
    sorter: (a, b) => new Date(a.punchIn ?? 0) - new Date(b.punchIn ?? 0),
    render: (_, row) => formatTime(row.punchIn),
  },
  {
    title: 'Punch out',
    key: 'punchOut',
    render: (_, row) => (row.missedPunchOut ? <Badge tone="warning">Missed</Badge> : formatTime(row.punchOut)),
  },
  { title: 'Location', key: 'location', render: (_, row) => row.locationName ?? '-' },
];

export default function AdminHome() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(14);
  const { data, loading, error, reload } = useDashboard({ days });

  const first = !data; // pehli baar: skeleton
  const kpis = data?.kpis;
  const today = data?.today;
  const payroll = kpis?.payroll;
  const attendance = kpis?.attendance;
  const isToday = attendance?.date === today?.date;

  return (
    <section>
      <WelcomeHeader user={user} subtitle={company?.name}>
        <Button variant="secondary" icon={<WalletOutlined />} onClick={() => navigate('/admin/payroll')}>
          Run payroll
        </Button>
        <Button icon={<PlusOutlined />} onClick={() => navigate('/admin/staff/new')}>
          Add staff
        </Button>
      </WelcomeHeader>

      {error && (
        <Alert>
          {error}{' '}
          <Button size="sm" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </Alert>
      )}
      {data?.company.locationsCount === 0 && (
        <Alert type="warning">
          No office location is set, so staff cannot punch. <Link to="/admin/settings">Add a location in Settings</Link>
        </Alert>
      )}

      <StatGrid>
        <StatCard
          title="Active staff"
          icon={<TeamOutlined />}
          loading={first}
          value={kpis?.staff.value}
          delta={kpis?.staff.newThisMonth ? { value: kpis.staff.newThisMonth, unit: '', label: 'new this month' } : undefined}
          hint="No new joiners this month"
          series={kpis?.staff.series}
          to="/admin/staff"
        />
        <StatCard
          title={isToday ? 'Attendance today' : 'Attendance (last working day)'}
          icon={<CheckCircleOutlined />}
          tone="success"
          loading={first}
          value={attendance?.rate === null || attendance?.rate === undefined ? '-' : `${attendance.rate}%`}
          delta={
            attendance?.rate !== null && attendance?.previousRate !== null && attendance?.rate !== undefined
              ? { value: attendance.rate - attendance.previousRate, unit: ' pts', label: 'vs previous working day' }
              : undefined
          }
          hint={today ? DAY_TEXT[today.dayType] ?? `${today.present} of ${today.totalStaff} present` : ''}
          series={attendance?.series}
          to="/admin/attendance"
        />
        {company?.leaveEnabled ? (
          <StatCard
            title="Pending leave requests"
            icon={<CalendarOutlined />}
            tone="warning"
            loading={first}
            value={kpis?.pendingLeaves.value}
            hint={kpis?.pendingLeaves.newThisWeek ? `${kpis.pendingLeaves.newThisWeek} new this week` : 'Nothing new this week'}
            to="/admin/leaves"
          />
        ) : (
          <StatCard
            title="Not punched in today"
            icon={<ClockCircleOutlined />}
            tone="warning"
            loading={first}
            value={today?.notMarked}
            hint={today ? DAY_TEXT[today.dayType] ?? `of ${today.totalStaff} active staff` : ''}
            to="/admin/attendance"
          />
        )}
        <StatCard
          title={payroll ? `Payroll · ${payroll.label}` : 'Payroll'}
          icon={<WalletOutlined />}
          tone="info"
          loading={first}
          value={payroll ? formatCurrency(payroll.value) : 'Not generated'}
          delta={payroll?.changePercent !== null && payroll ? { value: payroll.changePercent, unit: '%', label: 'vs previous month', neutral: true } : undefined}
          hint={payroll ? (payroll.status === 'DRAFT' ? 'Draft, not finalized yet' : 'Finalized') : 'Generate payroll to see totals'}
          series={payroll?.series}
          to="/admin/payroll"
        />
      </StatGrid>

      {company?.salesEnabled && <MeetingsToday admin />}

      <DashboardRow
        main={
          <ChartCard
            title="Attendance trend"
            subtitle="Staff present each day. Week offs and holidays show as dips."
            loading={first}
            extra={<Segmented size="small" options={RANGES} value={days} onChange={setDays} disabled={loading} />}
          >
            <AreaTrend
              data={data?.attendanceTrend ?? []}
              xKey="date"
              formatX={formatShortDate}
              series={[
                { key: 'present', name: 'Present' },
                { key: 'total', name: 'Total staff', color: 'var(--color-chart-2)', dashed: true },
              ]}
            />
          </ChartCard>
        }
        side={
          <ChartCard
            title="Today"
            subtitle={today ? formatDate(today.date) : ''}
            loading={first}
            empty={today && today.totalStaff === 0 ? 'Add staff to see today’s attendance.' : today && DAY_TEXT[today.dayType] && !today.present ? `${DAY_TEXT[today.dayType]}.` : undefined}
          >
            <Donut
              total={today?.present ?? 0}
              label={`of ${today?.totalStaff ?? 0} present`}
              data={[
                { name: 'Present', value: today?.present ?? 0, color: 'var(--color-success)' },
                { name: 'On leave', value: today?.onLeave ?? 0, color: 'var(--color-chart-1)' },
                { name: 'Not punched in', value: today?.notMarked ?? 0, color: 'var(--color-chart-2)' },
              ]}
            />
          </ChartCard>
        }
      />

      <DashboardRow
        main={
          <ChartCard title="Today’s attendance" subtitle="Click a column to sort. Click a name for the full month." loading={first}>
            <DataTable
              columns={ATTENDANCE_COLUMNS}
              rows={data?.todayAttendance ?? []}
              rowKey={(row) => row.staff._id}
              searchText={(row) => `${row.staff.name} ${row.staff.employeeCode}`}
              searchPlaceholder="Search staff"
              empty="No active staff yet."
            />
          </ChartCard>
        }
        side={
          <>
            {company?.leaveEnabled && (
              <ListCard
                title="Pending leave requests"
                loading={first}
                action={{ to: '/admin/leaves', label: 'View all' }}
                empty="No pending requests. You are all caught up."
              >
                {(data?.pendingLeaves ?? []).map((leave) => (
                  <ListRow
                    key={leave._id}
                    icon={<CalendarOutlined />}
                    tone="warning"
                    title={leave.userId?.name ?? 'Staff'}
                    meta={`${leave.type} · ${leave.days} day(s) · ${formatShortDate(leave.fromDate)}`}
                    to="/admin/leaves"
                  />
                ))}
              </ListCard>
            )}
            <ListCard title="Upcoming" subtitle="Holidays and approved leave" loading={first} empty="Nothing coming up.">
              {(data?.upcoming ?? []).map((item) => (
                <ListRow
                  key={`${item.type}-${item.date}-${item.title}`}
                  icon={item.type === 'HOLIDAY' ? <GiftOutlined /> : <CalendarOutlined />}
                  tone={item.type === 'HOLIDAY' ? 'success' : 'primary'}
                  title={item.title}
                  meta={item.subtitle}
                  right={formatShortDate(item.date)}
                />
              ))}
            </ListCard>
          </>
        }
      />

      <DashboardRow
        main={
          <ChartCard
            title="Payroll cost"
            subtitle="Net salary and deductions for the last 6 months"
            loading={first}
            empty={data && !data.payrollTrend.some((row) => row.generated) ? 'No payroll generated yet. Run payroll to see the trend.' : undefined}
          >
            <BarTrend
              data={data?.payrollTrend ?? []}
              xKey="label"
              stacked
              formatY={formatCompactCurrency}
              formatValue={formatCurrency}
              series={[
                { key: 'net', name: 'Net salary' },
                { key: 'deductions', name: 'Deductions (PF / ESI / other)', color: 'var(--color-chart-2)' },
              ]}
            />
          </ChartCard>
        }
        side={
          <ListCard title="Recent activity" subtitle="Punches and leave updates" loading={first} empty="No activity yet.">
            {(data?.activity ?? []).map((item) => (
              <ListRow
                key={`${item.type}-${item.at}-${item.text}`}
                icon={ACTIVITY_ICON[item.type]?.icon}
                tone={ACTIVITY_ICON[item.type]?.tone}
                title={item.text}
                meta={item.detail}
                right={timeAgo(item.at)}
              />
            ))}
          </ListCard>
        }
      />
    </section>
  );
}
