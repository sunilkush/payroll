import { BankOutlined, CheckCircleOutlined, PlusOutlined, SettingOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Progress } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import ChartCard from '../../components/ChartCard/ChartCard.jsx';
import { BarTrend, Donut } from '../../components/Charts/Charts.jsx';
import DashboardRow from '../../components/DashboardGrid/DashboardGrid.jsx';
import DataTable from '../../components/DataTable/DataTable.jsx';
import ListCard, { ListRow } from '../../components/ListCard/ListCard.jsx';
import StatCard, { StatGrid } from '../../components/StatCard/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge/StatusBadge.jsx';
import UserCell from '../../components/UserCell/UserCell.jsx';
import WelcomeHeader from '../../components/WelcomeHeader/WelcomeHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useDashboard } from '../../utils/useDashboard.js';

const COMPANY_COLUMNS = [
  {
    title: 'Company',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (_, row) => <UserCell square name={row.name} sub={row.address} to={`/superadmin/companies/${row._id}`} />,
  },
  { title: 'Staff', key: 'staff', align: 'right', sorter: (a, b) => a.staff - b.staff, render: (_, row) => row.staff },
  { title: 'Admins', key: 'admins', align: 'right', sorter: (a, b) => a.admins - b.admins, render: (_, row) => row.admins },
  {
    title: 'Status',
    key: 'status',
    sorter: (a, b) => Number(b.isActive) - Number(a.isActive),
    render: (_, row) => <StatusBadge active={row.isActive} />,
  },
  {
    title: 'Created',
    key: 'createdAt',
    sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (_, row) => formatDate(row.createdAt),
  },
];

export default function SuperAdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, reload } = useDashboard();

  const first = !data;
  const kpis = data?.kpis;
  const mostStaff = Math.max(1, ...(data?.topCompanies ?? []).map((company) => company.staff));

  return (
    <section>
      <WelcomeHeader user={user} subtitle="All companies">
        <Button variant="secondary" icon={<SettingOutlined />} onClick={() => navigate('/superadmin/settings')}>
          Global settings
        </Button>
        <Button icon={<PlusOutlined />} onClick={() => navigate('/superadmin/companies')}>
          New company
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
      {data?.withoutAdmin.length > 0 && (
        <Alert type="warning">
          {data.withoutAdmin.length} company(s) have no admin, so nobody can manage them:{' '}
          {data.withoutAdmin.slice(0, 3).map((company, index) => (
            <span key={company._id}>
              {index > 0 && ', '}
              <Link to={`/superadmin/companies/${company._id}`}>{company.name}</Link>
            </span>
          ))}
        </Alert>
      )}

      <StatGrid>
        <StatCard
          title="Companies"
          icon={<BankOutlined />}
          loading={first}
          value={kpis?.companies.value}
          delta={kpis?.companies.newThisMonth ? { value: kpis.companies.newThisMonth, unit: '', label: 'new this month' } : undefined}
          hint="None added this month"
          series={kpis?.companies.series}
          to="/superadmin/companies"
        />
        <StatCard
          title="Active companies"
          icon={<CheckCircleOutlined />}
          tone="success"
          loading={first}
          value={kpis?.active.value}
          hint={kpis ? (kpis.active.blocked ? `${kpis.active.blocked} blocked` : 'None blocked') : ''}
          to="/superadmin/companies"
        />
        <StatCard
          title="Total staff"
          icon={<TeamOutlined />}
          tone="info"
          loading={first}
          value={kpis?.staff.value}
          delta={kpis?.staff.newThisMonth ? { value: kpis.staff.newThisMonth, unit: '', label: 'added this month' } : undefined}
          hint="None added this month"
        />
        <StatCard title="Company admins" icon={<UserOutlined />} tone="warning" loading={first} value={kpis?.admins.value} hint="Across all companies" />
      </StatGrid>

      <DashboardRow
        main={
          <ChartCard title="Companies added" subtitle="New companies per month, last 6 months" loading={first}>
            <BarTrend data={data?.companiesTrend ?? []} xKey="label" series={[{ key: 'created', name: 'New companies' }]} />
          </ChartCard>
        }
        side={
          <ChartCard title="Status" subtitle="Active and blocked companies" loading={first} empty={data && !kpis.companies.value ? 'No companies yet.' : undefined}>
            <Donut
              total={data?.status.active ?? 0}
              label="active"
              data={[
                { name: 'Active', value: data?.status.active ?? 0, color: 'var(--color-success)' },
                { name: 'Blocked', value: data?.status.blocked ?? 0, color: 'var(--color-danger)' },
              ]}
            />
          </ChartCard>
        }
      />

      <DashboardRow
        main={
          <ChartCard title="Recent companies" subtitle="Click a column to sort" loading={first}>
            <DataTable
              columns={COMPANY_COLUMNS}
              rows={data?.recentCompanies ?? []}
              rowKey="_id"
              searchText={(row) => `${row.name} ${row.address ?? ''}`}
              searchPlaceholder="Search companies"
              empty="No companies yet. Create your first company to get started."
            />
          </ChartCard>
        }
        side={
          <ListCard title="Largest companies" subtitle="By number of staff" loading={first} empty="No companies yet.">
            {(data?.topCompanies ?? []).map((company) => (
              <ListRow
                key={company._id}
                icon={<BankOutlined />}
                title={company.name}
                meta={<Progress percent={Math.round((company.staff / mostStaff) * 100)} showInfo={false} size="small" />}
                right={`${company.staff} staff`}
                to={`/superadmin/companies/${company._id}`}
              />
            ))}
          </ListCard>
        }
      />
    </section>
  );
}
