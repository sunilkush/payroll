import {
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  PercentageOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import AttendanceStatus from '../../components/AttendanceStatus/AttendanceStatus.jsx';
import Button from '../../components/Button/Button.jsx';
import ChartCard from '../../components/ChartCard/ChartCard.jsx';
import { AreaTrend, BarTrend, Donut } from '../../components/Charts/Charts.jsx';
import DashboardRow from '../../components/DashboardGrid/DashboardGrid.jsx';
import ListCard, { ListRow } from '../../components/ListCard/ListCard.jsx';
import StatCard, { StatGrid } from '../../components/StatCard/StatCard.jsx';
import WelcomeHeader from '../../components/WelcomeHeader/WelcomeHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCompactCurrency, formatCurrency, formatDate, formatShortDate, formatTime, WEEKDAYS } from '../../utils/format.js';
import { useDashboard } from '../../utils/useDashboard.js';
import './StaffHome.css';

const DAY_TEXT = { WEEK_OFF: 'Today is a week off', HOLIDAY: 'Today is a holiday' };

export default function StaffHome() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const { data, error, reload } = useDashboard();

  const first = !data;
  const kpis = data?.kpis;
  const today = data?.today;
  const thisMonth = data?.monthly.at(-1);
  const done = Boolean(today?.punchOut);

  let punchStatus = 'Not punched in yet';
  if (today?.punchIn) punchStatus = `Punched in at ${formatTime(today.punchIn)}`;
  if (done) punchStatus = 'Attendance complete for today';
  if (today && !today.punchIn && DAY_TEXT[today.dayType]) punchStatus = DAY_TEXT[today.dayType];

  const diff = (current, previous) => (current === null || previous === null || current === undefined ? null : current - previous);

  return (
    <section>
      <WelcomeHeader user={user} subtitle={company?.name}>
        {company?.leaveEnabled && (
          <Button variant="secondary" icon={<CalendarOutlined />} onClick={() => navigate('/staff/leaves')}>
            Apply leave
          </Button>
        )}
        {!done && (
          <Button icon={<EnvironmentOutlined />} onClick={() => navigate('/staff/punch')}>
            {today?.punchIn ? 'Punch out' : 'Punch in'}
          </Button>
        )}
      </WelcomeHeader>

      {error && (
        <Alert>
          {error}{' '}
          <Button size="sm" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </Alert>
      )}

      <StatGrid>
        <StatCard
          title="Days present (this month)"
          icon={<CheckCircleOutlined />}
          tone="success"
          loading={first}
          value={kpis?.present.value}
          hint={kpis ? `${kpis.present.previous} last month` : ''}
          series={data?.monthly.map((row) => ({ value: row.present }))}
          to="/staff/attendance"
        />
        <StatCard
          title="Attendance rate"
          icon={<PercentageOutlined />}
          loading={first}
          value={kpis?.rate.value === null || kpis?.rate.value === undefined ? '-' : `${kpis.rate.value}%`}
          delta={diff(kpis?.rate.value, kpis?.rate.previous) === null ? undefined : { value: diff(kpis.rate.value, kpis.rate.previous), unit: ' pts', label: 'vs last month' }}
          hint="No working days counted yet"
          to="/staff/attendance"
        />
        {company?.leaveEnabled && (
          <StatCard
            title="Leave balance"
            icon={<CalendarOutlined />}
            tone="warning"
            loading={first}
            value={kpis?.leave ? `${kpis.leave.cl + kpis.leave.el} days` : '-'}
            hint={kpis?.leave ? `CL ${kpis.leave.cl} · EL ${kpis.leave.el}${kpis.leave.pending ? ` · ${kpis.leave.pending} pending` : ''}` : ''}
            to="/staff/leaves"
          />
        )}
        <StatCard
          title="Net salary"
          icon={<WalletOutlined />}
          tone="info"
          loading={first}
          value={kpis?.salary ? formatCurrency(kpis.salary.value) : 'No slip yet'}
          delta={
            kpis?.salary && kpis.salary.changePercent !== null
              ? { value: kpis.salary.changePercent, unit: '%', label: `${kpis.salary.label} vs previous slip` }
              : undefined
          }
          hint={kpis?.salary ? `${kpis.salary.label} slip` : 'Appears after payroll is finalized'}
          series={kpis?.salary?.series}
          to="/staff/salary"
        />
      </StatGrid>

      <DashboardRow
        main={
          <ChartCard title="My attendance" subtitle="Present, leave and absent days for the last 6 months" loading={first}>
            <BarTrend
              data={data?.monthly ?? []}
              xKey="label"
              stacked
              series={[
                { key: 'present', name: 'Present', color: 'var(--color-success)' },
                { key: 'leave', name: 'Leave', color: 'var(--color-chart-1)' },
                { key: 'absent', name: 'Absent', color: 'var(--color-chart-2)' },
              ]}
            />
          </ChartCard>
        }
        side={
          <ChartCard title="Today" subtitle={today ? formatDate(today.date) : ''} loading={first}>
            <p className="staff-home__punch-status">{punchStatus}</p>
            <dl className="staff-home__times">
              <div>
                <dt>Punch in</dt>
                <dd>{formatTime(today?.punchIn)}</dd>
              </div>
              <div>
                <dt>Punch out</dt>
                <dd>{formatTime(today?.punchOut)}</dd>
              </div>
            </dl>
            {!done && (
              <Button block icon={<EnvironmentOutlined />} onClick={() => navigate('/staff/punch')}>
                {today?.punchIn ? 'Punch out' : 'Punch in'}
              </Button>
            )}
          </ChartCard>
        }
      />

      <DashboardRow
        main={
          <ListCard
            title="Recent days"
            loading={first}
            action={{ to: '/staff/attendance', label: 'Full month' }}
            empty="No days this month yet."
          >
            {(data?.recentDays ?? []).map((day) => (
              <ListRow
                key={day.date}
                title={`${formatDate(day.date)}, ${WEEKDAYS[day.weekday].slice(0, 3)}`}
                meta={day.punchIn ? `In ${formatTime(day.punchIn)}${day.punchOut ? ` · Out ${formatTime(day.punchOut)}` : ''}` : day.note}
                right={<AttendanceStatus status={day.status} />}
              />
            ))}
          </ListCard>
        }
        side={
          <>
            <ChartCard title="This month" subtitle="How your days add up" loading={first}>
              <Donut
                total={thisMonth?.present ?? 0}
                label="days present"
                data={[
                  { name: 'Present', value: thisMonth?.present ?? 0, color: 'var(--color-success)' },
                  { name: 'Leave', value: thisMonth?.leave ?? 0, color: 'var(--color-chart-1)' },
                  { name: 'Absent', value: thisMonth?.absent ?? 0, color: 'var(--color-chart-2)' },
                  { name: 'Week off / holiday', value: (thisMonth?.weekOff ?? 0) + (thisMonth?.holiday ?? 0), color: 'var(--color-chart-grid)' },
                ]}
              />
            </ChartCard>
            <ListCard title="Upcoming" subtitle="Holidays and your leave" loading={first} empty="Nothing coming up.">
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
            title="Salary trend"
            subtitle="Net salary from your finalized slips"
            loading={first}
            empty={data && data.salaryTrend.length < 2 ? 'The trend appears once you have two or more salary slips.' : undefined}
          >
            <AreaTrend
              data={data?.salaryTrend ?? []}
              xKey="label"
              formatY={formatCompactCurrency}
              formatValue={formatCurrency}
              series={[{ key: 'net', name: 'Net salary' }]}
            />
          </ChartCard>
        }
      />
    </section>
  );
}
