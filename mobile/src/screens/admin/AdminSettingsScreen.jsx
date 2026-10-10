import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getSettingsApi, updateSettingsApi } from '../../api/settingsApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

export default function AdminSettingsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    NativeAlert.alert('Sign Out', 'Are you sure you want to sign out from your Admin account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  // Location Modal State
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [locForm, setLocForm] = useState({ name: '', lat: '', lng: '', radius: '100' });
  const [capturingGps, setCapturingGps] = useState(false);

  // Form State
  const [locations, setLocations] = useState([]);
  const [settings, setSettings] = useState({
    clPerMonth: '1',
    elPerMonth: '1.25',
    workStartTime: '09:30',
    workEndTime: '18:30',
    pfEnabled: false,
    esiEnabled: false,
    leaveEnabled: true,
  });

  const loadSettings = async () => {
    try {
      const res = await getSettingsApi();
      const comp = res?.data;
      if (comp) {
        setData(comp);
        setLocations(
          (comp.locations || []).map((l) => ({
            name: l.name,
            lat: String(l.lat),
            lng: String(l.lng),
            radius: String(l.radius || 100),
          }))
        );
        setSettings({
          clPerMonth: String(comp.settings?.clPerMonth ?? 1),
          elPerMonth: String(comp.settings?.elPerMonth ?? 1.25),
          workStartTime: comp.settings?.workStartTime || '09:30',
          workEndTime: comp.settings?.workEndTime || '18:30',
          pfEnabled: Boolean(comp.settings?.pfEnabled),
          esiEnabled: Boolean(comp.settings?.esiEnabled),
          leaveEnabled: Boolean(comp.settings?.leaveEnabled),
        });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const openAddLoc = () => {
    setEditingIndex(null);
    setLocForm({ name: '', lat: '', lng: '', radius: '100' });
    setLocModalVisible(true);
  };

  const openEditLoc = (idx) => {
    setEditingIndex(idx);
    setLocForm({ ...locations[idx] });
    setLocModalVisible(true);
  };

  const handleCaptureGps = async () => {
    setCapturingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        NativeAlert.alert('Permission Error', 'Location permission is required to capture coordinates.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setLocForm((prev) => ({
        ...prev,
        lat: String(pos.coords.latitude),
        lng: String(pos.coords.longitude),
      }));
    } catch (err) {
      NativeAlert.alert('GPS Error', err.message);
    } finally {
      setCapturingGps(false);
    }
  };

  const handleSaveLoc = () => {
    if (!locForm.name.trim() || !locForm.lat || !locForm.lng) {
      NativeAlert.alert('Validation Error', 'Please specify a name and valid GPS coordinates.');
      return;
    }

    if (editingIndex !== null) {
      setLocations((prev) => {
        const next = [...prev];
        next[editingIndex] = locForm;
        return next;
      });
    } else {
      setLocations((prev) => [...prev, locForm]);
    }
    setLocModalVisible(false);
  };

  const handleDeleteLoc = (idx) => {
    NativeAlert.alert('Delete Branch', `Remove "${locations[idx].name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setLocations((prev) => prev.filter((_, i) => i !== idx));
        },
      },
    ]);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg({ type: 'success', text: '' });
    try {
      const payload = {
        locations: locations.map((l) => ({
          name: l.name.trim(),
          lat: Number(l.lat),
          lng: Number(l.lng),
          radius: Number(l.radius || 100),
        })),
        settings: {
          clPerMonth: Number(settings.clPerMonth),
          elPerMonth: Number(settings.elPerMonth),
          workStartTime: settings.workStartTime,
          workEndTime: settings.workEndTime,
          pfEnabled: settings.pfEnabled,
          esiEnabled: settings.esiEnabled,
          leaveEnabled: settings.leaveEnabled,
        },
      };

      await updateSettingsApi(payload);
      setStatusMsg({ type: 'success', text: 'Company settings saved successfully!' });
      setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 3500);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Loading settings..." />;
  }

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Company Settings"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {statusMsg.text ? <Alert type={statusMsg.type}>{statusMsg.text}</Alert> : null}

      {/* Geofence Office Locations Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Office Geofence Locations</Text>
        <TouchableOpacity
          onPress={openAddLoc}
          style={styles.addBranchBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="plus-circle" size={20} color={colors.primary} />
          <Text style={styles.addBranchText}>Add Branch</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionSubtitle}>
        Staff must be within the geofence radius to punch attendance.
      </Text>

      {locations.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="map-marker-alert" size={40} color={colors.warning} />
          <Text style={styles.emptyTitle}>No office branches configured</Text>
          <Text style={styles.emptySub}>
            Staff will not be able to punch until at least one geofence location is added.
          </Text>
          <Button title="Add Office Location" onPress={openAddLoc} style={styles.addLocBtn} />
        </Card>
      ) : (
        <View style={styles.locList}>
          {locations.map((loc, idx) => (
            <Card key={idx} style={styles.locCard} elevation="sm">
              <View style={styles.locHeader}>
                <View style={styles.locIconCircle}>
                  <MaterialCommunityIcons name="office-building" size={22} color={colors.primary} />
                </View>
                <View style={styles.locInfo}>
                  <Text style={styles.locName}>{loc.name}</Text>
                  <Text style={styles.locCoords}>
                    {Number(loc.lat).toFixed(5)}, {Number(loc.lng).toFixed(5)}
                  </Text>
                </View>
                <Badge label={`Radius: ${loc.radius}m`} variant="primary" size="sm" />
              </View>

              <View style={styles.locActionsRow}>
                <TouchableOpacity onPress={() => openEditLoc(idx)} style={styles.locActionBtn}>
                  <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
                  <Text style={styles.locActionText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteLoc(idx)}
                  style={[styles.locActionBtn, { marginLeft: 16 }]}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                  <Text style={[styles.locActionText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Work Timings & Leaves */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Working Hours & Policy</Text>
      <Card style={styles.settingsCard} elevation="sm">
        <View style={styles.timeInputsRow}>
          <Input
            label="Work Start Time"
            value={settings.workStartTime}
            onChangeText={(t) => setSettings((p) => ({ ...p, workStartTime: t }))}
            placeholder="09:30"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Work End Time"
            value={settings.workEndTime}
            onChangeText={(t) => setSettings((p) => ({ ...p, workEndTime: t }))}
            placeholder="18:30"
            containerStyle={styles.halfInput}
          />
        </View>

        <View style={styles.timeInputsRow}>
          <Input
            label="Monthly CL Credit"
            value={settings.clPerMonth}
            onChangeText={(t) => setSettings((p) => ({ ...p, clPerMonth: t }))}
            placeholder="1"
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Monthly EL Credit"
            value={settings.elPerMonth}
            onChangeText={(t) => setSettings((p) => ({ ...p, elPerMonth: t }))}
            placeholder="1.25"
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>
      </Card>

      {/* Statutory Toggles */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Statutory Deductions (Company Level)</Text>
      <Card style={styles.settingsCard} elevation="sm">
        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setSettings((p) => ({ ...p, pfEnabled: !p.pfEnabled }))}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable Provident Fund (PF)</Text>
            <Text style={styles.switchDesc}>Calculate 12% employee and employer EPF/EPS share</Text>
          </View>
          <MaterialCommunityIcons
            name={settings.pfEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={36}
            color={settings.pfEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setSettings((p) => ({ ...p, esiEnabled: !p.esiEnabled }))}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable ESI</Text>
            <Text style={styles.switchDesc}>Calculate 0.75% employee and 3.25% employer contribution</Text>
          </View>
          <MaterialCommunityIcons
            name={settings.esiEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={36}
            color={settings.esiEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </Card>

      {/* Save Button */}
      <Button
        title="Save Settings"
        onPress={handleSaveAll}
        loading={saving}
        icon="content-save-outline"
        style={styles.saveBtn}
      />

      {/* Profile & Logout Action Buttons */}
      <View style={styles.authActionsRow}>
        <TouchableOpacity
          style={styles.profileActionBtn}
          onPress={() => navigation.navigate('AdminProfile')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="account-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.profileActionText}>View Admin Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutActionBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutActionText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Location Modal */}
      <Modal
        visible={locModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Edit Branch Location' : 'Add Office Branch'}
              </Text>
              <TouchableOpacity onPress={() => setLocModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Branch Name *"
              value={locForm.name}
              onChangeText={(t) => setLocForm((p) => ({ ...p, name: t }))}
              placeholder="e.g. Headquarters / Gurgaon Branch"
              prefixIcon="office-building"
            />

            <View style={styles.coordsRow}>
              <Input
                label="Latitude *"
                value={locForm.lat}
                onChangeText={(t) => setLocForm((p) => ({ ...p, lat: t }))}
                placeholder="28.4595"
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
              <Input
                label="Longitude *"
                value={locForm.lng}
                onChangeText={(t) => setLocForm((p) => ({ ...p, lng: t }))}
                placeholder="77.0266"
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
            </View>

            {/* Quick Capture Button */}
            <Button
              title="Use Phone's Current GPS Location"
              variant="outline"
              size="sm"
              icon="crosshairs-gps"
              onPress={handleCaptureGps}
              loading={capturingGps}
              style={styles.captureGpsBtn}
            />

            <Input
              label="Geofence Radius (Meters) *"
              value={locForm.radius}
              onChangeText={(t) => setLocForm((p) => ({ ...p, radius: t }))}
              placeholder="100"
              keyboardType="numeric"
              helper="Recommended: 100m - 200m to account for GPS drift"
            />

            <Button
              title="Save Branch"
              onPress={handleSaveLoc}
              style={styles.saveBranchBtn}
            />
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  addBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBranchText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginLeft: 4,
  },
  locList: {
    gap: 10,
  },
  locCard: {
    padding: 14,
  },
  locHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locInfo: {
    flex: 1,
  },
  locName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  locCoords: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  locActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    justifyContent: 'flex-end',
  },
  locActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locActionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginLeft: 4,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  addLocBtn: {
    marginTop: 12,
  },
  settingsCard: {
    padding: 16,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  switchDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  saveBtn: {
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  captureGpsBtn: {
    marginBottom: 16,
    marginTop: -4,
  },
  saveBranchBtn: {
    marginTop: 10,
  },
  authActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 20,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  logoutActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutActionText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
});
