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
import Card from './Card.jsx';
import Loader from './Loader.jsx';
import ScreenWrapper from './ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Payslip Available',
    description: 'Your September payslip is ready to download.',
    time: '2 hours ago',
    icon: 'file-document-outline',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    to: '/staff/salary',
  },
  {
    id: 'notif-2',
    title: 'Leave Approved',
    description: 'Your leave request has been approved.',
    time: '1 day ago',
    icon: 'check-circle-outline',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    to: '/staff/leaves',
  },
  {
    id: 'notif-3',
    title: 'Attendance Reminder',
    description: "Don't forget to check in today.",
    time: '1 day ago',
    icon: 'alarm-check',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    to: '/staff/attendance',
  },
  {
    id: 'notif-4',
    title: 'Policy Update',
    description: 'New company policy has been shared with all employees.',
    time: '2 days ago',
    icon: 'shield-outline',
    color: '#8B5CF6',
    bgColor: '#FAF5FF',
  },
  {
    id: 'notif-5',
    title: 'System Maintenance',
    description: 'System will be offline on 12 Sep from 2 AM to 4 AM.',
    time: '3 days ago',
    icon: 'alert-triangle-outline',
    color: '#D97706',
    bgColor: '#FFFBEB',
  },
];

export default function NotificationCenterModal({ visible, onClose, navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsApi();
      const apiItems = res?.data?.items || [];
      if (apiItems.length > 0) {
        setItems(
          apiItems.map((item, idx) => ({
            ...item,
            id: item.id || `notif-api-${idx}`,
            time: item.createdAt ? 'Recently' : 'Just now',
            icon: item.tone === 'danger' ? 'alert-circle-outline' : item.tone === 'warning' ? 'alert-triangle-outline' : item.tone === 'success' ? 'check-circle-outline' : 'file-document-outline',
            color: item.tone === 'danger' ? '#EF4444' : item.tone === 'warning' ? '#D97706' : item.tone === 'success' ? '#16A34A' : '#2563EB',
            bgColor: item.tone === 'danger' ? '#FEF2F2' : item.tone === 'warning' ? '#FFFBEB' : item.tone === 'success' ? '#F0FDF4' : '#EFF6FF',
          }))
        );
      } else {
        setItems(DEFAULT_NOTIFICATIONS);
      }
    } catch {
      setItems(DEFAULT_NOTIFICATIONS);
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

    if (item.to.includes('salary')) {
      navigation.navigate('StaffSalary');
    } else if (item.to.includes('leaves')) {
      navigation.navigate('StaffLeaves');
    } else if (item.to.includes('attendance') || item.to.includes('punch')) {
      navigation.navigate('StaffAttendance');
    } else if (item.to.includes('/admin/leaves')) {
      navigation.navigate('AdminLeaves');
    } else if (item.to.includes('/admin/payroll')) {
      navigation.navigate('AdminPayroll');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ScreenWrapper scrollable contentContainerStyle={styles.container}>
        {/* Header matching Screen 8: "< Notifications" */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {loading ? (
          <Loader message="Loading notifications..." />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleAction(item)}
                activeOpacity={0.8}
              >
                <Card style={styles.itemCard} elevation="xs">
                  <View style={styles.itemRow}>
                    <View style={[styles.iconBox, { backgroundColor: item.bgColor || '#EFF6FF' }]}>
                      <MaterialCommunityIcons
                        name={item.icon || 'bell-outline'}
                        size={22}
                        color={item.color || colors.primary}
                      />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      ) : null}
                      <Text style={styles.itemTime}>{item.time || '1 day ago'}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScreenWrapper>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  list: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
