import { useEffect, useState } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getMonthlyAttendanceApi, getTodayApi } from '../../api/attendanceApi.js';
import { getLeaveBalanceApi } from '../../api/leaveApi.js';
import { listMyPayrollsApi } from '../../api/payrollApi.js';
import AttendanceStatus from '../../components/AttendanceStatus/AttendanceStatus.jsx';
import Button from '../../components/Button/Button.jsx';
import DashboardGrid from '../../components/DashboardGrid/DashboardGrid.jsx';
import DashboardHero from '../../components/DashboardHero/DashboardHero.jsx';
import ListCard, { ListRow } from '../../components/ListCard/ListCard.jsx';
import QuickLinks from '../../components/QuickLinks/QuickLinks.jsx';
import StatCards from '../../components/StatCards/StatCards.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadAll } from '../../utils/dashboard.js';
import { currentMonth, formatCurrency, formatDate, formatMonth, formatTime, WEEKDAYS } from '../../utils/format.js';
import './StaffHome.css';

const LINKS = [
  { name: 'Punch In / Out', description: 'Mark attendance within office range', to: '/staff/punch', icon: <EnvironmentOutlined /> },
  { name: 'My Attendance', description: 'Monthly attendance', to: '/staff/attendance', icon: <ClockCircleOutlined /> },
  { name: 'My Leaves', description: 'Apply for leave and view balance', to: '/staff/leaves', icon: <CalendarOutlined />, feature: 'leaveEnabled' },
  { name: 'My Salary', description: 'Salary slips', to: '/staff/salary', icon: <FileTextOutlined /> },
];

export default function StaffHome() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    loadAll([
      getTodayApi(),
      getMonthlyAttendanceApi({ month: currentMonth() }),
      company?.leaveEnabled ? getLeaveBalanceApi() : null,
      listMyPayrollsApi(),
    ]).then(([today, month, leave, payroll]) => setData({ today, month, leave, payroll }));
  }, [company?.leaveEnabled]);

  const attendance = data?.today?.attendance;
  const summary = data?.month?.summary;
  const balance = data?.leave?.balance;
  const lastSalary = data?.payroll?.rows?.[0];
  // Sabse naye din pehle, sirf wo jinme kuch dikhane ko hai
  const recentDays = (data?.month?.days ?? []).filter((day) => day.status).reverse().slice(0, 5);

  let punchStatus = 'Not punched in today';
  let punchLabel = 'Punch In';
  if (attendance) {
    punchStatus = `Punch in: ${formatTime(attendance.punchIn.time)}`;
    punchLabel = 'Punch Out';
  }
  if (attendance?.punchOut) punchStatus = `Done today: ${formatTime(attendance.punchIn.time)} - ${formatTime(attendance.punchOut.time)}`;

  const loaded = Boolean(data);
  const stats = [
    {
      label: 'Present (this month)',
      value: loaded ? summary?.present ?? '-' : undefined,
      icon: <CheckCircleOutlined />,
      tone: 'success',
      to: '/staff/attendance',
    },
    {
      label: 'Absent (this month)',
      value: loaded ? summary?.absent ?? '-' : undefined,
      icon: <CloseCircleOutlined />,
      tone: 'danger',
      to: '/staff/attendance',
    },
    company?.leaveEnabled && {
      label: 'Leave balance',
      value: loaded ? (balance ? `CL ${balance.CL.available} · EL ${balance.EL.available}` : '-') : undefined,
      icon: <CalendarOutlined />,
      tone: 'accent',
      to: '/staff/leaves',
    },
    {
      label: 'Last salary',
      value: loaded ? (lastSalary ? formatCurrency(lastSalary.netSalary) : 'None yet') : undefined,
      hint: lastSalary && formatMonth(lastSalary.period),
      icon: <WalletOutlined />,
      tone: 'primary',
      to: '/staff/salary',
    },
  ].filter(Boolean);

  return (
    <section>
      <DashboardHero user={user} subtitle={company?.name}>
        <p className="staff-home__punch-status">{loaded ? punchStatus : 'Loading...'}</p>
        {!attendance?.punchOut && (
          <Button block className="staff-home__punch-button" onClick={() => navigate('/staff/punch')}>
            {punchLabel}
          </Button>
        )}
      </DashboardHero>

      <StatCards items={stats} />

      <DashboardGrid>
        <ListCard
          title="Recent days"
          action={{ to: '/staff/attendance', label: 'Full month' }}
          empty="No days this month yet."
        >
          {recentDays.map((day) => (
            <ListRow
              key={day.date}
              title={`${formatDate(day.date)}, ${WEEKDAYS[day.weekday].slice(0, 3)}`}
              meta={day.punchIn ? `In ${formatTime(day.punchIn.time)}${day.punchOut ? ` · Out ${formatTime(day.punchOut.time)}` : ''}` : day.note}
              right={<AttendanceStatus status={day.status} />}
            />
          ))}
        </ListCard>
        <QuickLinks items={LINKS} />
      </DashboardGrid>
    </section>
  );
}
