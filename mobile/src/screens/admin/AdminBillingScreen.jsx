import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert as NativeAlert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  cancelUpgradeRequestApi,
  getBillingApi,
  requestUpgradeApi,
} from '../../api/billingApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate } from '../../utils/format.js';

const PLANS_CONFIG = [
  {
    key: 'FREE',
    name: 'Free Starter',
    subtitle: 'Small teams & trial testing',
    staffLimit: 10,
    staffLimitLabel: 'Up to 10 Staff',
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabel: '₹0',
    cycleLabel: '/ forever',
    badge: 'default',
    color: '#64748B',
    bgLight: '#F1F5F9',
    icon: 'account-outline',
    features: [
      'Real-time Geofence Attendance',
      'Staff Directory & Roles',
      'Daily Attendance Logs',
      'Android & iOS Mobile Access',
    ],
    unlockedKeyFeatures: ['GPS Geofence', '10 Staff Limit'],
  },
  {
    key: 'STARTER',
    name: 'Starter Business',
    subtitle: 'Growing businesses & retail',
    staffLimit: 50,
    staffLimitLabel: 'Up to 50 Staff',
    monthlyPrice: 999,
    annualPrice: 799,
    priceLabel: '₹999',
    annualPriceLabel: '₹799',
    cycleLabel: '/ month',
    badge: 'primary',
    color: '#2563EB',
    bgLight: '#EFF6FF',
    icon: 'shield-star',
    features: [
      'Everything in Free Plan',
      'Paid Leave (CL/EL) Approval Flow',
      'Punch In/Out Miss Corrections',
      'Monthly Payroll Engine & Slips',
      'Staff Direct Shift Schedules',
    ],
    unlockedKeyFeatures: ['Leaves (CL/EL)', 'Punch Corrections', 'Monthly Payroll', '50 Staff Limit'],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional Pro',
    subtitle: 'Regulated companies & agencies',
    isPopular: true,
    staffLimit: 250,
    staffLimitLabel: 'Up to 250 Staff',
    monthlyPrice: 2499,
    annualPrice: 1999,
    priceLabel: '₹2,499',
    annualPriceLabel: '₹1,999',
    cycleLabel: '/ month',
    badge: 'warning',
    color: '#7C3AED',
    bgLight: '#F5F3FF',
    icon: 'star-circle',
    features: [
      'Everything in Starter Plan',
      'Statutory PF & ESI Automated Deduction',
      'Work Timings & Late Punch Tracking',
      'Sales Executive Client Visits & Geo Tracking',
      'Excel & PDF Report Exports',
    ],
    unlockedKeyFeatures: ['Statutory PF/ESI', 'Work Time & Late Grace', 'Sales Visits', 'Export Engine', '250 Staff Limit'],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise Scale',
    subtitle: 'Unlimited staff & multi-branch',
    staffLimit: null,
    staffLimitLabel: 'Unlimited Staff',
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: 'Custom',
    cycleLabel: 'tailored pricing',
    badge: 'success',
    color: '#059669',
    bgLight: '#ECFDF5',
    icon: 'crown',
    features: [
      'Everything in Professional Plan',
      'Unlimited Staff Members',
      'Multi-Branch Geofences Across Cities',
      'Dedicated Customer Success Manager',
      '24/7 Priority SLA & Custom Integrations',
    ],
    unlockedKeyFeatures: ['Unlimited Staff', 'Multi-Branch Geofences', 'Dedicated SLA', 'Custom Billing'],
  },
];

const PLAN_INDEX = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 };

export default function AdminBillingScreen({ navigation }) {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [feedback, setFeedback] = useState({ type: 'success', text: '' });

  // Upgrade Modal State
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgradeNote, setUpgradeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      setFeedback({ type: 'success', text: '' });
      const res = await getBillingApi();
      setBilling(res?.data || null);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load billing information.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBilling();
  };

  const handleOpenUpgrade = (plan) => {
    setSelectedPlan(plan);
    setUpgradeNote('');
    setUpgradeModalVisible(true);
  };

  const handleSendUpgradeRequest = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await requestUpgradeApi(selectedPlan.key, upgradeNote.trim());
      setUpgradeModalVisible(false);
      setFeedback({
        type: 'success',
        text: `Upgrade request to ${selectedPlan.name} submitted! Super Admin will review and activate it.`,
      });
      fetchBilling();
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 5000);
    } catch (err) {
      NativeAlert.alert('Upgrade Request Failed', err.message || 'Unable to submit upgrade request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    NativeAlert.alert(
      'Cancel Upgrade Request?',
      'Are you sure you want to cancel your pending plan upgrade request?',
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelUpgradeRequestApi();
              setFeedback({ type: 'success', text: 'Upgrade request cancelled successfully.' });
              fetchBilling();
              setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
            } catch (err) {
              NativeAlert.alert('Error', err.message || 'Failed to cancel request.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleContactSales = () => {
    NativeAlert.alert(
      'Enterprise Concierge',
      'Contact our corporate licensing team for custom invoicing and enterprise deployment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: () => Linking.openURL('mailto:sales@payroster.com?subject=Enterprise%20Plan%20Inquiry'),
        },
      ]
    );
  };

  const currentPlanKey = (billing?.plan || 'FREE').toUpperCase();
  const currentPlanIdx = PLAN_INDEX[currentPlanKey] ?? 0;
  const currentPlanConfig = PLANS_CONFIG.find((p) => p.key === currentPlanKey) || PLANS_CONFIG[0];
  const pendingRequest = billing?.request;

  const staffUsagePercent = useMemo(() => {
    if (!billing?.staffLimit || billing.staffLimit <= 0) return 0;
    return Math.min(Math.round(((billing.activeStaff || 0) / billing.staffLimit) * 100), 100);
  }, [billing]);

  const remainingSlots = useMemo(() => {
    if (!billing?.staffLimit) return 'Unlimited';
    return Math.max(0, billing.staffLimit - (billing.activeStaff || 0));
  }, [billing]);

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Header
        title="Subscription & Billing"
        subtitle="Manage plan tier, staff slots & licensing"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {feedback.text ? (
        <View style={styles.alertWrapper}>
          <Alert type={feedback.type}>{feedback.text}</Alert>
        </View>
      ) : null}

      {loading ? (
        <Loader message="Loading subscription & licensing..." />
      ) : (
        <>
          {/* Executive Active Tier Hero Card */}
          <Card style={[styles.heroPlanCard, { borderLeftColor: currentPlanConfig.color }]} elevation="sm">
            <View style={styles.heroPlanHeader}>
              <View style={styles.heroPlanTitleWrap}>
                <View style={[styles.planIconWrap, { backgroundColor: currentPlanConfig.bgLight }]}>
                  <MaterialCommunityIcons name={currentPlanConfig.icon} size={24} color={currentPlanConfig.color} />
                </View>
                <View>
                  <Text style={styles.heroSubHeading}>Current Active Tier</Text>
                  <Text style={styles.heroPlanTitle}>{currentPlanConfig.name}</Text>
                </View>
              </View>

              <View style={styles.activeStatusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeStatusText}>Active</Text>
              </View>
            </View>

            {/* Staff Capacity Gauge */}
            <View style={styles.capacityContainer}>
              <View style={styles.capacityHeader}>
                <View style={styles.capacityLabelRow}>
                  <MaterialCommunityIcons name="account-group" size={16} color={colors.textSecondary} />
                  <Text style={styles.capacityLabel}>Staff Slots Utilization</Text>
                </View>
                <Text style={styles.capacityValues}>
                  <Text style={styles.capacityActive}>{billing?.activeStaff ?? 0}</Text>
                  <Text style={styles.capacityLimit}>
                    {' '}/ {billing?.staffLimit ? `${billing.staffLimit} max` : 'Unlimited'}
                  </Text>
                </Text>
              </View>

              {billing?.staffLimit ? (
                <>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${staffUsagePercent}%`,
                          backgroundColor:
                            staffUsagePercent >= 90
                              ? colors.danger
                              : staffUsagePercent >= 75
                              ? colors.warning
                              : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressMetaRow}>
                    <Text style={styles.progressMetaText}>
                      {staffUsagePercent}% capacity consumed
                    </Text>
                    <Text
                      style={[
                        styles.remainingSlotsText,
                        typeof remainingSlots === 'number' && remainingSlots <= 3 && styles.remainingSlotsWarning,
                      ]}
                    >
                      {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} available
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.unlimitedNotice}>
                  <MaterialCommunityIcons name="infinity" size={16} color="#059669" />
                  <Text style={styles.unlimitedNoticeText}>
                    Enterprise unlimited staff allowance active
                  </Text>
                </View>
              )}
            </View>

            {/* Key Unlocked Features Strip */}
            <View style={styles.featuresStrip}>
              <Text style={styles.featuresStripTitle}>Included Capabilities:</Text>
              <View style={styles.featureChipsRow}>
                {currentPlanConfig.unlockedKeyFeatures.map((feat) => (
                  <View key={feat} style={styles.featureChip}>
                    <MaterialCommunityIcons name="check" size={12} color="#16A34A" />
                    <Text style={styles.featureChipText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>

          {/* Pending Upgrade Request Banner */}
          {pendingRequest && (
            <Card style={styles.pendingCard} elevation="sm">
              <View style={styles.pendingHeader}>
                <View style={styles.pendingIconWrap}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.pendingBadgeRow}>
                    <Text style={styles.pendingTitle}>Upgrade In Review</Text>
                    <View style={styles.pendingStatusBadge}>
                      <Text style={styles.pendingStatusText}>Awaiting Approval</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingSubtitle}>
                    Requested Tier: <Text style={styles.boldText}>{pendingRequest.plan}</Text>
                    {pendingRequest.requestedAt ? ` on ${formatDate(pendingRequest.requestedAt)}` : ''}
                  </Text>
                  {pendingRequest.note ? (
                    <Text style={styles.pendingNote}>Note: "{pendingRequest.note}"</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.pendingActionsRow}>
                <Button
                  title="Cancel Request"
                  variant="outline"
                  size="sm"
                  onPress={handleCancelRequest}
                  loading={cancelling}
                  style={styles.cancelRequestBtn}
                />
                <TouchableOpacity
                  style={styles.contactSupportBtn}
                  onPress={handleContactSales}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="help-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.contactSupportText}>Need Assistance?</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Billing Cycle Switcher: Monthly vs Annual */}
          <View style={styles.cycleToggleContainer}>
            <View style={styles.cycleToggleWrapper}>
              <TouchableOpacity
                style={[styles.cycleBtn, billingCycle === 'monthly' && styles.cycleBtnActive]}
                onPress={() => setBillingCycle('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.cycleBtnText, billingCycle === 'monthly' && styles.cycleBtnTextActive]}>
                  Monthly Billing
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cycleBtn, billingCycle === 'annual' && styles.cycleBtnActive]}
                onPress={() => setBillingCycle('annual')}
                activeOpacity={0.8}
              >
                <Text style={[styles.cycleBtnText, billingCycle === 'annual' && styles.cycleBtnTextActive]}>
                  Annual Billing
                </Text>
                <View style={styles.savePill}>
                  <Text style={styles.savePillText}>Save 20%</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Heading */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Subscription Tiers</Text>
            <Text style={styles.sectionSubtitle}>
              Upgrade anytime for higher staff capacity and enterprise automation
            </Text>
          </View>

          {/* Plans Comparison Cards List */}
          <View style={styles.plansContainer}>
            {PLANS_CONFIG.map((plan, idx) => {
              const isCurrent = idx === currentPlanIdx;
              const isLower = idx < currentPlanIdx;
              const isPendingTarget = pendingRequest?.plan === plan.key;
              const displayPrice =
                plan.monthlyPrice === null
                  ? 'Custom Quote'
                  : billingCycle === 'annual'
                  ? plan.annualPriceLabel
                  : plan.priceLabel;

              return (
                <Card
                  key={plan.key}
                  style={[
                    styles.planCard,
                    plan.isPopular && styles.planCardPopular,
                    isCurrent && styles.planCardCurrent,
                  ]}
                  elevation={plan.isPopular ? 'md' : 'xs'}
                >
                  {/* Popular Tag */}
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" />
                      <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                    </View>
                  )}

                  {/* Header Row */}
                  <View style={styles.planCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planCardName, { color: plan.color }]}>{plan.name}</Text>
                      <Text style={styles.planCardSub}>{plan.subtitle}</Text>
                    </View>
                    <View style={[styles.planCardIconWrap, { backgroundColor: plan.bgLight }]}>
                      <MaterialCommunityIcons name={plan.icon} size={22} color={plan.color} />
                    </View>
                  </View>

                  {/* Price Row */}
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPriceNumber}>{displayPrice}</Text>
                    <Text style={styles.planPriceCycle}>{plan.cycleLabel}</Text>
                  </View>

                  {/* Capacity Pill */}
                  <View style={styles.planStaffPill}>
                    <MaterialCommunityIcons name="account-group-outline" size={14} color="#334155" />
                    <Text style={styles.planStaffText}>{plan.staffLimitLabel}</Text>
                  </View>

                  <View style={styles.planDivider} />

                  {/* Features List */}
                  <View style={styles.planFeaturesContainer}>
                    {plan.features.map((feat, fIdx) => (
                      <View key={fIdx} style={styles.planFeatureRow}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={15}
                          color={isCurrent ? '#16A34A' : plan.color}
                        />
                        <Text style={styles.planFeatureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Button */}
                  <View style={styles.planCardActionWrap}>
                    {isCurrent ? (
                      <View style={styles.currentPlanBadge}>
                        <MaterialCommunityIcons name="check" size={16} color="#059669" />
                        <Text style={styles.currentPlanBadgeText}>Current Active Tier</Text>
                      </View>
                    ) : isPendingTarget ? (
                      <Button
                        title="Upgrade In Progress"
                        variant="outline"
                        disabled
                        icon="clock-outline"
                        style={styles.planButton}
                      />
                    ) : isLower ? (
                      <Text style={styles.includedTierText}>Included in your higher plan</Text>
                    ) : plan.key === 'ENTERPRISE' ? (
                      <Button
                        title="Contact Enterprise Sales"
                        onPress={handleContactSales}
                        icon="phone-outline"
                        style={styles.planButton}
                      />
                    ) : (
                      <Button
                        title={`Upgrade to ${plan.name}`}
                        onPress={() => handleOpenUpgrade(plan)}
                        icon="arrow-up-circle-outline"
                        style={styles.planButton}
                      />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Enterprise Support Contact Card */}
          <Card style={styles.conciergeCard} elevation="xs">
            <View style={styles.conciergeTop}>
              <View style={styles.conciergeIconWrap}>
                <MaterialCommunityIcons name="shield-crown-outline" size={26} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.conciergeTitle}>Corporate Billing & Invoicing</Text>
                <Text style={styles.conciergeSub}>
                  Need GST Tax Invoicing, Purchase Orders (PO), or custom multi-company accounts?
                </Text>
              </View>
            </View>

            <View style={styles.conciergeActions}>
              <TouchableOpacity
                style={styles.conciergeActionBtn}
                onPress={() => Linking.openURL('mailto:billing@payroster.com?subject=Tax%20Invoice%20Inquiry')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="email-outline" size={16} color="#059669" />
                <Text style={styles.conciergeActionText}>Request GST Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.conciergeActionBtn, { borderColor: '#E2E8F0' }]}
                onPress={handleContactSales}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="phone-outline" size={16} color="#334155" />
                <Text style={[styles.conciergeActionText, { color: '#334155' }]}>Talk to Account Manager</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </>
      )}

      {/* Upgrade Request Modal */}
      <Modal
        visible={upgradeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Request Plan Upgrade</Text>
                <Text style={styles.modalSub}>
                  Moving to {selectedPlan?.name} ({selectedPlan?.staffLimitLabel})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setUpgradeModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Transition Preview Ribbon */}
              <View style={styles.transitionRibbon}>
                <View style={styles.transitionTier}>
                  <Text style={styles.transitionTierLabel}>Current</Text>
                  <Text style={styles.transitionTierName}>{currentPlanConfig.name}</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right-thick" size={20} color={colors.primary} />
                <View style={styles.transitionTier}>
                  <Text style={styles.transitionTierLabel}>Upgrading To</Text>
                  <Text style={[styles.transitionTierName, { color: colors.primary }]}>
                    {selectedPlan?.name}
                  </Text>
                </View>
              </View>

              {/* What Unlocks Preview */}
              {selectedPlan && (
                <View style={styles.unlocksCard}>
                  <Text style={styles.unlocksTitle}>What unlocks with this upgrade:</Text>
                  {selectedPlan.unlockedKeyFeatures.map((feat) => (
                    <View key={feat} style={styles.unlockItem}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#16A34A" />
                      <Text style={styles.unlockItemText}>{feat}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Input
                label="Optional Requirements or Message"
                placeholder="e.g. Planning to hire 20 more staff this month..."
                value={upgradeNote}
                onChangeText={setUpgradeNote}
                multiline
                numberOfLines={3}
                helper="Provide any additional invoicing or contact notes"
              />

              <View style={styles.modalButtonsRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setUpgradeModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Confirm Upgrade"
                  onPress={handleSendUpgradeRequest}
                  loading={submitting}
                  icon="arrow-up-bold-circle-outline"
                  style={{ flex: 1.4 }}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  alertWrapper: {
    marginBottom: 12,
  },

  // Active Hero Plan Card
  heroPlanCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  heroPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroPlanTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubHeading: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroPlanTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },

  // Capacity Container
  capacityContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityLabel: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  capacityValues: {
    fontSize: 13,
  },
  capacityActive: {
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  capacityLimit: {
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  remainingSlotsText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  remainingSlotsWarning: {
    color: colors.danger,
    fontWeight: typography.weights.bold,
  },
  unlimitedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  unlimitedNoticeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: typography.weights.medium,
  },

  // Features Strip
  featuresStrip: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  featuresStripTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  featureChipText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: typography.weights.medium,
  },

  // Pending Request Card
  pendingCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  pendingHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  pendingStatusBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  pendingStatusText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  pendingSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  pendingNote: {
    fontSize: 11,
    color: '#78350F',
    fontStyle: 'italic',
    marginTop: 4,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  cancelRequestBtn: {
    borderColor: '#D97706',
  },
  contactSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactSupportText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  // Billing Cycle Switcher
  cycleToggleContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  cycleToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
  },
  cycleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.xs,
  },
  cycleBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  cycleBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  savePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  savePillText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },

  // Section Header
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Plans Container
  plansContainer: {
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planCardPopular: {
    borderColor: '#7C3AED',
    borderWidth: 2,
    backgroundColor: '#FAF5FF',
  },
  planCardCurrent: {
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planCardName: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  planCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  planCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  planPriceNumber: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  planPriceCycle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  planStaffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    marginBottom: 10,
  },
  planStaffText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: '#334155',
  },
  planDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  planFeaturesContainer: {
    gap: 6,
    marginBottom: 14,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  planCardActionWrap: {
    marginTop: 4,
  },
  planButton: {
    borderRadius: borderRadius.md,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  currentPlanBadgeText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  includedTierText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  // Concierge Card
  conciergeCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  conciergeTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  conciergeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conciergeTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#065F46',
  },
  conciergeSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  conciergeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  conciergeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  conciergeActionText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: '#065F46',
  },

  // Upgrade Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    padding: 20,
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFFFFF',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transitionRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  transitionTier: {
    alignItems: 'center',
  },
  transitionTierLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  transitionTierName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  unlocksCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  unlocksTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 8,
  },
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  unlockItemText: {
    fontSize: 12,
    color: '#334155',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
});
