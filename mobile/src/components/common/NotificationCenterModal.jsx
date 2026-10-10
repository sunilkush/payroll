import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getNotificationsApi } from '../../api/dashboardApi.js';
import Badge from './Badge.jsx';
import Button from './Button.jsx';
import Card from './Card.jsx';
import Loader from './Loader.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

export default function NotificationCenterModal({ visible, onClose, navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsApi();
      setItems(res?.data?.items || []);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchNotifications();
    }
  }, [fetchNotifications, visible]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleAction = (item) => {
    onClose();
    if (!item?.to || !navigation) return;

    // Route mapper based on backend web routes
    if (item.to.includes('/admin/leaves')) {
      navigation.navigate('AdminLeaves');
    } else if (item.to.includes('/admin/corrections') || item.id === 'pending-corrections') {
      navigation.navigate('AdminCorrections');
    } else if (item.to.includes('/admin/payroll') || item.id === 'unfinalized-payroll') {
      navigation.navigate('AdminPayroll');
    } else if (item.to.includes('/admin/billing') || item.id === 'plan-request') {
      navigation.navigate('AdminBilling');
    } else if (item.to.includes('/admin/settings') || item.id === 'no-location') {
      navigation.navigate('AdminSettings');
    } else if (item.to.includes('/superadmin/companies')) {
      navigation.navigate('SuperAdminCompanies');
    } else if (item.to.includes('/superadmin/settings')) {
      navigation.navigate('SuperAdminSettings');
    } else if (item.to.includes('/staff/leaves')) {
      navigation.navigate('StaffLeaves');
    } else if (item.to.includes('/staff/attendance')) {
      navigation.navigate('StaffAttendance');
    } else if (item.to.includes('/staff/punch')) {
      navigation.navigate('StaffPunch');
    }
  };

  const getToneVisuals = (tone) => {
    switch (tone) {
      case 'danger':
        return {
          icon: 'alert-circle',
          color: colors.danger,
          bg: colors.dangerBg,
          badge: 'danger',
        };
      case 'warning':
        return {
          icon: 'alert',
          color: colors.warning,
          bg: colors.warningBg,
          badge: 'warning',
        };
      case 'success':
        return {
          icon: 'check-circle',
          color: colors.success,
          bg: colors.successBg,
          badge: 'success',
        };
      case 'info':
      default:
        return {
          icon: 'information',
          color: colors.info,
          bg: colors.infoBg,
          badge: 'primary',
        };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="bell-ring" size={22} color={colors.primary} />
              <Text style={styles.modalTitle}>Notifications & Action Items</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {loading ? (
              <Loader message="Checking pending action items..." />
            ) : items.length === 0 ? (
              <Card style={styles.emptyCard}>
                <MaterialCommunityIcons name="bell-check-outline" size={48} color={colors.success} />
                <Text style={styles.emptyTitle}>You're all caught up!</Text>
                <Text style={styles.emptySub}>
                  No pending approvals, alerts, or urgent action items at this moment.
                </Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {items.map((item, index) => {
                  const visuals = getToneVisuals(item.tone);
                  return (
                    <Card key={item.id || index} style={styles.itemCard} elevation="sm">
                      <View style={styles.itemTopRow}>
                        <View style={[styles.iconCircle, { backgroundColor: visuals.bg }]}>
                          <MaterialCommunityIcons
                            name={visuals.icon}
                            size={20}
                            color={visuals.color}
                          />
                        </View>
                        <View style={styles.itemTextContainer}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          {item.description ? (
                            <Text style={styles.itemDesc}>{item.description}</Text>
                          ) : null}
                        </View>
                      </View>

                      {item.to ? (
                        <View style={styles.actionRow}>
                          <Button
                            title="Take Action"
                            size="sm"
                            variant="outline"
                            icon="arrow-right"
                            onPress={() => handleAction(item)}
                            style={styles.actionBtn}
                          />
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    minHeight: '40%',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  list: {
    gap: 12,
  },
  itemCard: {
    padding: 14,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  itemDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  actionBtn: {
    minWidth: 120,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
