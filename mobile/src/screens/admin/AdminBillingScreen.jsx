import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
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
    name: 'Free Plan',
    staffLimit: 'Up to 10 Staff',
    price: '₹0 / month',
    badge: 'default',
    features: ['Real-time Geofence Attendance', 'Staff Directory', 'Daily Reports', 'Mobile App Access'],
  },
  {
    key: 'STARTER',
    name: 'Starter Plan',
    staffLimit: 'Up to 50 Staff',
    price: '₹999 / month',
    badge: 'primary',
    features: ['Everything in Free', 'Paid Leave (CL/EL) Management', 'Punch Fix Corrections', 'Monthly Payroll & Slips'],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional Plan',
    staffLimit: 'Up to 250 Staff',
    price: '₹2,499 / month',
    badge: 'warning',
    features: ['Everything in Starter', 'Statutory PF & ESI Auto-calc', 'Working Hours & Late Tracking', 'Client Sales Meetings & Field Visits', 'Excel & PDF Reports'],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise Plan',
    staffLimit: 'Unlimited Staff',
    price: 'Custom / Contact Us',
    badge: 'success',
    features: ['Everything in Professional', 'Unlimited Staff Members', 'Multi-Branch Geofences', 'Priority Support & Dedicated Onboarding'],
  },
];

const PLAN_INDEX = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 };

export default function AdminBillingScreen({ navigation }) {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        text: `Upgrade request to ${selectedPlan.name} submitted. Our team will review and activate it shortly.`,
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
              setFeedback({ type: 'success', text: 'Upgrade request cancelled.' });
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

  const currentPlanKey = billing?.plan || 'FREE';
  const currentPlanIdx = PLAN_INDEX[currentPlanKey] ?? 0;
  const currentPlanConfig = PLANS_CONFIG.find((p) => p.key === currentPlanKey) || PLANS_CONFIG[0];
  const pendingRequest = billing?.request;

  const staffUsagePercent =
    billing?.staffLimit && billing.staffLimit > 0
      ? Math.min(Math.round(((billing.activeStaff || 0) / billing.staffLimit) * 100), 100)
      : 100;

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Plan & Billing"
        subtitle="Manage subscription and staff limits"
        canGoBack
        onBackPress={() => navigation.goBack()}
      />

      {feedback.text ? (
        <View style={styles.alertWrapper}>
          <Alert
            type={feedback.type}
            message={feedback.text}
            onDismiss={() => setFeedback({ type: 'success', text: '' })}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Loader message="Loading subscription details..." />
        ) : (
          <>
            {/* Current Plan Overview Card */}
            <Card style={styles.currentCard} elevation="md">
              <View style={styles.currentHeader}>
                <View>
                  <Text style={styles.currentPlanSub}>Active Subscription</Text>
                  <Text style={styles.currentPlanTitle}>{currentPlanConfig.name}</Text>
                </View>
                <Badge
                  label="CURRENT"
                  variant={currentPlanConfig.badge}
                  size="md"
                />
              </View>

              {/* Staff Usage Gauge */}
              <View style={styles.gaugeContainer}>
                <View style={styles.gaugeTextRow}>
                  <Text style={styles.gaugeLabel}>Staff Capacity</Text>
                  <Text style={styles.gaugeCount}>
                    {billing?.activeStaff ?? 0}{' '}
                    <Text style={styles.gaugeLimit}>
                      / {billing?.staffLimit ? `${billing.staffLimit} allowed` : 'Unlimited'}
                    </Text>
                  </Text>
                </View>

                {billing?.staffLimit ? (
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${staffUsagePercent}%`,
                          backgroundColor:
                            staffUsagePercent > 85 ? colors.danger : colors.primary,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>

              {/* Included Features */}
              <View style={styles.currentFeatures}>
                <Text style={styles.featuresHeading}>Features Included:</Text>
                {currentPlanConfig.features.map((feat, i) => (
                  <View key={i} style={styles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Pending Request Notice */}
            {pendingRequest && (
              <Card style={styles.pendingCard} elevation="sm">
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingIconBox}>
                    <MaterialCommunityIcons name="clock-outline" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingTitle}>Upgrade Request Pending</Text>
                    <Text style={styles.pendingSub}>
                      Requested plan: <Text style={styles.boldText}>{pendingRequest.plan}</Text>
                      {pendingRequest.requestedAt ? ` on ${formatDate(pendingRequest.requestedAt)}` : ''}
                    </Text>
                    {pendingRequest.note ? (
                      <Text style={styles.pendingNote}>Note: "{pendingRequest.note}"</Text>
                    ) : null}
                  </View>
                </View>

                <Button
                  title="Cancel Request"
                  variant="outline"
                  size="sm"
                  onPress={handleCancelRequest}
                  loading={cancelling}
                  style={styles.cancelReqBtn}
                />
              </Card>
            )}

            {/* Available Upgrade Plans */}
            <Text style={styles.sectionTitle}>Available Upgrade Plans</Text>

            <View style={styles.plansList}>
              {PLANS_CONFIG.map((plan, idx) => {
                const isCurrent = idx === currentPlanIdx;
                const isLower = idx < currentPlanIdx;
                const isPendingTarget = pendingRequest?.plan === plan.key;

                return (
                  <Card key={plan.key} style={styles.planCard} elevation="sm">
                    <View style={styles.planCardHeader}>
                      <View>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planCapacity}>{plan.staffLimit}</Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.planPrice}>{plan.price}</Text>
                      </View>
                    </View>

                    <View style={styles.planDivider} />

                    <View style={styles.planFeaturesList}>
                      {plan.features.map((f, i) => (
                        <View key={i} style={styles.featureItem}>
                          <MaterialCommunityIcons
                            name="check"
                            size={16}
                            color={isCurrent ? colors.success : colors.textSecondary}
                          />
                          <Text style={styles.featureTextSmall}>{f}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.planFooter}>
                      {isCurrent ? (
                        <Button
                          title="Current Plan"
                          variant="secondary"
                          disabled
                          style={styles.planActionBtn}
                        />
                      ) : isPendingTarget ? (
                        <Button
                          title="Request Pending Approval"
                          variant="outline"
                          disabled
                          icon="clock-outline"
                          style={styles.planActionBtn}
                        />
                      ) : isLower ? (
                        <Text style={styles.lowerPlanText}>Included in your tier</Text>
                      ) : (
                        <Button
                          title={`Upgrade to ${plan.name}`}
                          variant="primary"
                          onPress={() => handleOpenUpgrade(plan)}
                          icon="arrow-up-circle-outline"
                          style={styles.planActionBtn}
                        />
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Upgrade Request Modal */}
      <Modal
        visible={upgradeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Request Plan Upgrade</Text>
                <Text style={styles.modalSub}>
                  Switching to {selectedPlan?.name} ({selectedPlan?.price})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setUpgradeModalVisible(false)}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.modalInfoBanner}>
                <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
                <Text style={styles.modalInfoText}>
                  Upon submitting, our administration team will review your organization's request and update your account tier.
                </Text>
              </View>

              <Input
                label="Optional Note / Requirements"
                placeholder="e.g. Need higher staff limit for upcoming hiring season..."
                value={upgradeNote}
                onChangeText={setUpgradeNote}
                multiline
                numberOfLines={3}
                helperText="Any special request or billing contact detail"
              />

              <Button
                title={`Confirm Upgrade to ${selectedPlan?.name}`}
                onPress={handleSendUpgradeRequest}
                loading={submitting}
                icon="send"
                style={styles.submitUpgradeBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  alertWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  currentCard: {
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currentPlanSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentPlanTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  gaugeContainer: {
    backgroundColor: colors.bgApp,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  gaugeTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  gaugeCount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  gaugeLimit: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.normal,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  currentFeatures: {
    gap: 8,
  },
  featuresHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  featureTextSmall: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  pendingCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
  },
  pendingHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pendingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#92400e',
  },
  pendingSub: {
    fontSize: typography.sizes.xs,
    color: '#b45309',
    marginTop: 2,
  },
  pendingNote: {
    fontSize: typography.sizes.xs,
    color: '#78350f',
    fontStyle: 'italic',
    marginTop: 4,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  cancelReqBtn: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  plansList: {
    gap: 16,
  },
  planCard: {
    padding: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  planCapacity: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  planDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  planFeaturesList: {
    gap: 8,
    marginBottom: 16,
  },
  planFooter: {
    marginTop: 4,
  },
  planActionBtn: {
    width: '100%',
  },
  lowerPlanText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: 24,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgApp,
    padding: 12,
    borderRadius: borderRadius.md,
    gap: 10,
    marginBottom: 16,
  },
  modalInfoText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  submitUpgradeBtn: {
    marginTop: 12,
  },
});
