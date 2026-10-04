import { useEffect, useState } from 'react';
import { BankOutlined, CheckCircleOutlined, PercentageOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { listCompaniesApi } from '../../api/companyApi.js';
import { getGlobalSettingsApi } from '../../api/globalSettingsApi.js';
import DashboardGrid from '../../components/DashboardGrid/DashboardGrid.jsx';
import DashboardHero from '../../components/DashboardHero/DashboardHero.jsx';
import ListCard, { ListRow } from '../../components/ListCard/ListCard.jsx';
import QuickLinks from '../../components/QuickLinks/QuickLinks.jsx';
import StatCards from '../../components/StatCards/StatCards.jsx';
import StatusBadge from '../../components/StatusBadge/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadAll } from '../../utils/dashboard.js';
import { formatCurrency } from '../../utils/format.js';

const LINKS = [
  { name: 'Companies', description: 'Company create, edit, block aur admins', to: '/superadmin/companies', icon: <BankOutlined /> },
  { name: 'Global Settings', description: 'PF/ESI rates, ceilings aur payroll ke rules', to: '/superadmin/settings', icon: <SettingOutlined /> },
];

export default function SuperAdminHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    loadAll([
      listCompaniesApi({ limit: 5 }), // sabse nayi 5 + kul ginti
      listCompaniesApi({ status: 'active', limit: 1 }),
      listCompaniesApi({ status: 'blocked', limit: 1 }),
      getGlobalSettingsApi(),
    ]).then(([recent, active, blocked, global]) => setData({ recent, active, blocked, rates: global?.settings }));
  }, []);

  const loaded = Boolean(data);
  const rates = data?.rates;

  const stats = [
    {
      label: 'Companies',
      value: loaded ? data.recent?.total ?? '-' : undefined,
      icon: <BankOutlined />,
      tone: 'primary',
      to: '/superadmin/companies',
    },
    {
      label: 'Active',
      value: loaded ? data.active?.total ?? '-' : undefined,
      icon: <CheckCircleOutlined />,
      tone: 'success',
      to: '/superadmin/companies',
    },
    {
      label: 'Blocked',
      value: loaded ? data.blocked?.total ?? '-' : undefined,
      icon: <StopOutlined />,
      tone: 'danger',
      to: '/superadmin/companies',
    },
    {
      label: 'PF / ESI (employee)',
      value: loaded ? (rates ? `${rates.pf.employeeRate}% / ${rates.esi.employeeRate}%` : '-') : undefined,
      hint: rates && `PF ceiling ${formatCurrency(rates.pf.wageCeiling)}`,
      icon: <PercentageOutlined />,
      tone: 'accent',
      to: '/superadmin/settings',
    },
  ];

  return (
    <section>
      <DashboardHero name={user.name} subtitle="Super Admin · saari companies" />

      <StatCards items={stats} />

      <DashboardGrid>
        <ListCard
          title="Nayi companies"
          action={{ to: '/superadmin/companies', label: 'Sab dekhein' }}
          empty="Abhi koi company nahi hai."
        >
          {(data?.recent?.items ?? []).map((company) => (
            <ListRow
              key={company._id}
              icon={<BankOutlined />}
              title={company.name}
              meta={`${company.staffCount} staff · ${company.adminCount} admin`}
              right={<StatusBadge active={company.isActive} />}
              to={`/superadmin/companies/${company._id}`}
            />
          ))}
        </ListCard>
        <QuickLinks items={LINKS} />
      </DashboardGrid>
    </section>
  );
}
