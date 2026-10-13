import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getPlansApi, listCompaniesApi } from '../../api/endpoints.js';
import { Badge, Card, Empty, Screen, Stat, StatRow, styles } from '../../components/ui.js';
import { colors } from '../../theme.js';
import { useLoad } from '../../utils/useLoad.js';

export default function Companies() {
  const [search, setSearch] = useState('');
  // Search "done" dabane par lagta hai, har akshar par request nahi jati.
  const [query, setQuery] = useState('');
  const fetchCompanies = useCallback(
    async () => {
      const [companies, plans] = await Promise.all([listCompaniesApi({ search: query || undefined, limit: 100 }), getPlansApi()]);
      // Plan ka naam Super Admin badal sakta hai, isliye server se: { STARTER: 'Starter', ... }
      const planNames = Object.fromEntries(plans.data.plans.map((plan) => [plan.code, plan.name]));
      return { ...companies.data, planNames };
    },
    [query]
  );
  const { data, error, loading, refreshing, refresh } = useLoad(fetchCompanies);

  return (
    <Screen title="Companies" loading={loading} refreshing={refreshing} onRefresh={refresh} error={error}>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setQuery(search.trim())}
        returnKeyType="search"
        placeholder="Search by company name"
        placeholderTextColor={colors.textMuted}
      />
      {data ? (
        <>
          <StatRow>
            <Stat label="Active" value={data.counts.active} tone="success" />
            <Stat label="Blocked" value={data.counts.blocked} tone="danger" />
            <Stat label="Upgrade requests" value={data.counts.upgrade} tone="warning" />
          </StatRow>
          {data.items.length ? null : <Empty text="No companies found." />}
          {data.items.map((company) => (
            <Card key={company._id}>
              <View style={styles.row}>
                <Text style={[styles.heading, { flexShrink: 1 }]}>{company.name}</Text>
                <Badge tone={company.isActive ? 'success' : 'danger'} text={company.isActive ? 'Active' : 'Blocked'} />
              </View>
              <Text style={styles.text}>
                {data.planNames[company.plan] ?? company.plan} plan · {company.staffCount} staff · {company.adminCount} admin
              </Text>
              {company.planRequest?.status === 'PENDING' ? (
                <Badge tone="warning" text={`Wants ${data.planNames[company.planRequest.plan] ?? company.planRequest.plan}`} />
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
