import { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

export default function AdminReportsScreen({ navigation }) {
  const [selectedReport, setSelectedReport] = useState('payroll');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState('PDF'); // 'PDF' | 'Excel'

  const reports = [
    {
      id: 'payroll',
      title: 'Payroll Summary',
      subtitle: 'Monthly & Yearly',
      icon: 'file-document-outline',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      subtitle: 'Present / Absent',
      icon: 'file-table-outline',
      iconColor: '#16A34A',
      bgColor: '#F0FDF4',
    },
    {
      id: 'pf-esi',
      title: 'PF & ESI Report',
      subtitle: 'Deductions',
      icon: 'shield-account-outline',
      iconColor: '#D97706',
      bgColor: '#FFFBEB',
    },
    {
      id: 'employee',
      title: 'Employee Report',
      subtitle: 'Details & Export',
      icon: 'account-box-multiple-outline',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
    },
  ];

  const handleExport = () => {
    const reportItem = reports.find((r) => r.id === selectedReport);
    setExportModalVisible(false);
    Alert.alert(
      'Report Exported',
      `${reportItem?.title} exported successfully as ${exportFormat}! The document is saved to your downloads folder.`
    );
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      {/* Header matching Screen 5: "< Reports" */}
      <Header
        title="Reports"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Reports List Cards matching Screen 5 */}
      <View style={styles.list}>
        {reports.map((item) => {
          const isSelected = selectedReport === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedReport(item.id)}
              activeOpacity={0.8}
            >
              <Card
                style={[
                  styles.reportCard,
                  isSelected && styles.reportCardSelected,
                ]}
                elevation="xs"
              >
                <View style={styles.reportRow}>
                  <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={item.iconColor}
                    />
                  </View>

                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>{item.title}</Text>
                    <Text style={styles.reportSubtitle}>{item.subtitle}</Text>
                  </View>

                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Export Report Full-Width Royal Blue Button matching Screen 5 */}
      <TouchableOpacity
        style={styles.exportBtn}
        onPress={() => setExportModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.exportBtnText}>Export Report</Text>
      </TouchableOpacity>

      {/* Export Modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Choose Export Format</Text>
            <Text style={styles.modalDesc}>
              Select the file format to download{' '}
              {reports.find((r) => r.id === selectedReport)?.title}.
            </Text>

            <View style={styles.formatRow}>
              {['PDF', 'Excel'].map((fmt) => {
                const isActive = exportFormat === fmt;
                return (
                  <TouchableOpacity
                    key={fmt}
                    style={[
                      styles.formatBtn,
                      isActive && styles.formatBtnActive,
                    ]}
                    onPress={() => setExportFormat(fmt)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={fmt === 'PDF' ? 'file-pdf-box' : 'file-excel-box'}
                      size={26}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.formatBtnText,
                        isActive && styles.formatBtnTextActive,
                      ]}
                    >
                      {fmt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setExportModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Download"
                onPress={handleExport}
                style={{ flex: 1 }}
              />
            </View>
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
  list: {
    gap: 14,
    marginVertical: 12,
  },
  reportCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  reportSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...shadows.sm,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 22,
    borderRadius: borderRadius.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  formatBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  formatBtnText: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  formatBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
