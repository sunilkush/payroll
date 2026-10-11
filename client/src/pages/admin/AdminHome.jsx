import { useMemo, useState } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Segmented, Tooltip } from 'antd';
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
import { useAuth } from '../../context/AuthContext.jsx';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatShortDate,
  formatTime,
  greeting,
  timeAgo,
  WEEKDAYS,
} from '../../utils/format.js';
import { roleLine } from '../../utils/roles.js';
import { useDashboard } from '../../utils/useDashboard.js';
import './AdminHome.css';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

const VIEW_OPTIONS = [
  { value: 'today', label: '⚡ Today’s Operations' },
  { value: 'analytics', label: '📊 Trends & Analytics' },
  { value: 'all', label: '📑 All Overview' },
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
  const [viewMode, setViewMode] = useState('today');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data, loading, error, reload } = useDashboard({ days });

  const first = !data; // skeleton while initial data loads
  const kpis = data?.kpis;
  const today = data?.today;
  const payroll = kpis?.payroll;
  const attendance = kpis?.attendance;
  const isToday = attendance?.date === today?.date;

  const now = new Date();
  const firstName = user ? (roleLine(user) ? user.name.split(' ')[0] : '') : '';

  // Filtered attendance rows based on quick status pill filter
  const todayAttendance = data?.todayAttendance ?? [];
  const filteredAttendance = useMemo(() => {
    if (statusFilter === 'ALL') return todayAttendance;
    if (statusFilter === 'PRESENT') return todayAttendance.filter((r) => r.status === 'PRESENT');
    if (statusFilter === 'NOT_MARKED') return todayAttendance.filter((r) => r.status === 'NOT_MARKED');
    if (statusFilter === 'LEAVE') return todayAttendance.filter((r) => r.status === 'LEAVE');
    return todayAttendance;
  }, [todayAttendance, statusFilter]);

  const allCount = todayAttendance.length;
  const presentCount = today?.present ?? 0;
  const notMarkedCount = today?.notMarked ?? 0;
  const leaveCount = today?.onLeave ?? 0;

  return (
    <section className="admin-home">
      {/* Compact Executive Header */}
      <header className="admin-home__header">
        <div className="admin-home__header-main">
          <div className="admin-home__welcome">
            <div className="admin-home__title-row">
              <h1 className="admin-home__title">
                {greeting(now)}
                {firstName && `, ${firstName}`}
              </h1>
              {company?.name && <span className="admin-home__company-tag">{company.name}</span>}
            </div>
            <div className="admin-home__subtitle">
              <span>
                {WEEKDAYS[now.getDay()]}, {formatDate(now)}
              </span>
              {today && (
                <span className="admin-home__live-pill">
                  <span className="admin-home__live-dot" />
                  {today.present}/{today.totalStaff} present ({attendance?.rate !== null && attendance?.rate !== undefined ? `${attendance.rate}%` : '0%'})
                </span>
              )}
            </div>
          </div>

          <div className="admin-home__header-actions">
            <Tooltip title="Refresh live data">
              <Button
                variant="secondary"
                size="sm"
                className="admin-home__refresh-btn"
                onClick={reload}
                disabled={loading}
                aria-label="Refresh live data"
              >
                <ReloadOutlined className={loading ? 'admin-home__refresh-icon--spinning' : ''} />
              </Button>
            </Tooltip>
            {company?.payrollEnabled && (
              <Button size="sm" variant="secondary" icon={<WalletOutlined />} onClick={() => navigate('/admin/payroll')}>
                Run payroll
              </Button>
            )}
            <Button size="sm" icon={<PlusOutlined />} onClick={() => navigate('/admin/staff/new')}>
              Add staff
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <Alert>
          {error}{' '}
          <Button size="sm" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </Alert>
      )}
      {data?.company?.locationsCount === 0 && (
        <Alert type="warning">
          No office location is set, so staff cannot punch. <Link to="/admin/settings">Add a location in Settings</Link>
        </Alert>
      )}

      {/* Compact High-Density Stat Cards Grid */}
      <StatGrid className="admin-home__stat-grid">
        <StatCard
          className="admin-home__stat-card"
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
          className="admin-home__stat-card"
          title={isToday ? 'Attendance today' : 'Attendance (last day)'}
          icon={<CheckCircleOutlined />}
          tone="success"
          loading={first}
          value={attendance?.rate === null || attendance?.rate === undefined ? '-' : `${attendance.rate}%`}
          delta={
            attendance?.rate !== null && attendance?.previousRate !== null && attendance?.rate !== undefined
              ? { value: attendance.rate - attendance.previousRate, unit: ' pts', label: 'vs prev working day' }
              : undefined
          }
          hint={today ? DAY_TEXT[today.dayType] ?? `${today.present} of ${today.totalStaff} present` : ''}
          series={attendance?.series}
          to="/admin/attendance"
        />
        {company?.leaveEnabled ? (
          <StatCard
            className="admin-home__stat-card"
            title="Pending leaves"
            icon={<CalendarOutlined />}
            tone="warning"
            loading={first}
            value={kpis?.pendingLeaves.value}
            hint={kpis?.pendingLeaves.newThisWeek ? `${kpis.pendingLeaves.newThisWeek} new this week` : 'Nothing new this week'}
            to="/admin/leaves"
          />
        ) : (
          <StatCard
            className="admin-home__stat-card"
            title="Not punched in"
            icon={<ClockCircleOutlined />}
            tone="warning"
            loading={first}
            value={today?.notMarked}
            hint={today ? DAY_TEXT[today.dayType] ?? `of ${today.totalStaff} active staff` : ''}
            to="/admin/attendance"
          />
        )}
        <StatCard
          className="admin-home__stat-card"
          title={payroll ? `Payroll · ${payroll.label}` : 'Payroll'}
          icon={<WalletOutlined />}
          tone="info"
          loading={first}
          value={payroll ? formatCurrency(payroll.value) : 'Not generated'}
          delta={payroll?.changePercent !== null && payroll ? { value: payroll.changePercent, unit: '%', label: 'vs last month', neutral: true } : undefined}
          hint={payroll ? (payroll.status === 'DRAFT' ? 'Draft, not finalized' : 'Finalized') : 'Generate to see totals'}
          series={payroll?.series}
          to="/admin/payroll"
        />
      </StatGrid>

      {/* View Switcher / Compact Filter Bar */}
      <div className="admin-home__view-bar">
        <Segmented
          className="admin-home__view-tabs"
          size="middle"
          options={VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
        />
        <span className="admin-home__view-info">
          {viewMode === 'today'
            ? `Showing today’s live attendance & quick actions`
            : viewMode === 'analytics'
            ? `Historical attendance & payroll insights`
            : `All dashboard cards`}
        </span>
      </div>

      {company?.salesEnabled && <MeetingsToday admin />}

      {/* SECTION 1: TODAY'S OPERATIONS VIEW */}
      {(viewMode === 'today' || viewMode === 'all') && (
        <DashboardRow
          main={
            <ChartCard
              className="admin-home__compact-card"
              title="Today’s live attendance"
              subtitle="Real-time check-in status. Filter by category or search staff."
              loading={first}
            >
              <DataTable
                size="small"
                pageSize={7}
                columns={ATTENDANCE_COLUMNS}
                rows={filteredAttendance}
                rowKey={(row) => row.staff._id}
                searchText={(row) => `${row.staff.name} ${row.staff.employeeCode}`}
                searchPlaceholder="Search staff..."
                empty={statusFilter === 'ALL' ? 'No active staff yet.' : `No staff with status "${statusFilter}".`}
                extraHeader={
                  <div className="admin-home__filter-chips" role="tablist" aria-label="Filter by attendance status">
                    <button
                      type="button"
                      className={`admin-home__chip ${statusFilter === 'ALL' ? 'admin-home__chip--active' : ''}`}
                      onClick={() => setStatusFilter('ALL')}
                    >
                      All <span className="admin-home__chip-count">{allCount}</span>
                    </button>
                    <button
                      type="button"
                      className={`admin-home__chip ${statusFilter === 'PRESENT' ? 'admin-home__chip--active' : ''}`}
                      onClick={() => setStatusFilter('PRESENT')}
                    >
                      Present <span className="admin-home__chip-count">{presentCount}</span>
                    </button>
                    <button
                      type="button"
                      className={`admin-home__chip ${statusFilter === 'NOT_MARKED' ? 'admin-home__chip--active' : ''}`}
                      onClick={() => setStatusFilter('NOT_MARKED')}
                    >
                      Not Marked <span className="admin-home__chip-count">{notMarkedCount}</span>
                    </button>
                    <button
                      type="button"
                      className={`admin-home__chip ${statusFilter === 'LEAVE' ? 'admin-home__chip--active' : ''}`}
                      onClick={() => setStatusFilter('LEAVE')}
                    >
                      On Leave <span className="admin-home__chip-count">{leaveCount}</span>
                    </button>
                  </div>
                }
              />
            </ChartCard>
          }
          side={
            <>
              <ChartCard
                className="admin-home__compact-card"
                title="Today’s ratio"
                subtitle={today ? formatDate(today.date) : ''}
                loading={first}
                empty={today && today.totalStaff === 0 ? 'Add staff to see today’s attendance.' : today && DAY_TEXT[today.dayType] && !today.present ? `${DAY_TEXT[today.dayType]}.` : undefined}
              >
                <Donut
                  height={180}
                  total={today?.present ?? 0}
                  label={`of ${today?.totalStaff ?? 0} present`}
                  data={[
                    { name: 'Present', value: today?.present ?? 0, color: 'var(--color-success)' },
                    { name: 'On leave', value: today?.onLeave ?? 0, color: 'var(--color-chart-1)' },
                    { name: 'Not punched in', value: today?.notMarked ?? 0, color: 'var(--color-chart-2)' },
                  ]}
                />
              </ChartCard>

              {company?.leaveEnabled && (
                <ListCard
                  className="admin-home__compact-card"
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

              {viewMode === 'today' && (
                <ListCard
                  className="admin-home__compact-card"
                  title="Recent activity"
                  subtitle="Latest punches & leave updates"
                  loading={first}
                  empty="No activity yet."
                >
                  {(data?.activity ?? []).slice(0, 5).map((item) => (
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
              )}
            </>
          }
        />
      )}

      {/* SECTION 2: TRENDS & ANALYTICS VIEW */}
      {(viewMode === 'analytics' || viewMode === 'all') && (
        <>
          <DashboardRow
            main={
              <ChartCard
                className="admin-home__compact-card"
                title="Attendance trend"
                subtitle="Staff present each day. Week offs and holidays show as dips."
                loading={first}
                extra={<Segmented size="small" options={RANGES} value={days} onChange={setDays} disabled={loading} />}
              >
                <AreaTrend
                  height={210}
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
              <ListCard
                className="admin-home__compact-card"
                title="Upcoming"
                subtitle="Holidays & approved leave"
                loading={first}
                empty="Nothing coming up."
              >
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
            }
          />

          <DashboardRow
            main={
              <ChartCard
                className="admin-home__compact-card"
                title="Payroll cost"
                subtitle="Net salary and deductions for the last 6 months"
                loading={first}
                empty={data && !data.payrollTrend.some((row) => row.generated) ? 'No payroll generated yet. Run payroll to see the trend.' : undefined}
              >
                <BarTrend
                  height={210}
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
              viewMode === 'all' ? (
                <ListCard
                  className="admin-home__compact-card"
                  title="Recent activity"
                  subtitle="Punches & leave updates"
                  loading={first}
                  empty="No activity yet."
                >
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
              ) : null
            }
          />
        </>
      )}
    </section>
  );
}
