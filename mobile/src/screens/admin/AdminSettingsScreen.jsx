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
import { formatDate, todayLocal, WEEKDAYS } from '../../utils/format.js';

export default function AdminSettingsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: 'success', text: '' });
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

  // Holiday Modal State
  const [holidayModalVisible, setHolidayModalVisible] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: todayLocal(), name: '' });

  // Form State
  const [locations, setLocations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [settings, setSettings] = useState({
    maxGpsAccuracy: '50',
    weekOffDays: [0], // 0: Sunday
    workTimeEnabled: true,
    workStartTime: '09:30',
    workEndTime: '18:30',
    lateGraceMin: '15',
    leaveEnabled: true,
    clPerMonth: '1',
    elPerMonth: '1.25',
    elCarryForwardMax: '30',
    allowPastLeave: false,
    salesEnabled: false,
    meetingCheckInGraceMin: '30',
    requireVisitPhoto: false,
    pfEnabled: false,
    pfCapAtCeiling: true,
    esiEnabled: false,
  });

  const loadSettings = async () => {
    try {
      const res = await getSettingsApi();
      const comp = res?.data?.company || res?.data;
      if (comp) {
        setData(comp);
        setLocations(
          (comp.locations || []).map((l) => ({
            _id: l._id,
            name: l.name,
            lat: String(l.lat),
            lng: String(l.lng),
            radius: String(l.radius || 100),
          }))
        );
        setHolidays(
          (comp.holidays || []).map((h) => ({
            date: h.date,
            name: h.name,
          }))
        );
        setSettings({
          maxGpsAccuracy: String(comp.settings?.maxGpsAccuracy ?? 50),
          weekOffDays: Array.isArray(comp.settings?.weekOffDays) ? comp.settings.weekOffDays : [0],
          workTimeEnabled: Boolean(comp.settings?.workTimeEnabled),
          workStartTime: comp.settings?.workStartTime || '09:30',
          workEndTime: comp.settings?.workEndTime || '18:30',
          lateGraceMin: String(comp.settings?.lateGraceMin ?? 15),
          leaveEnabled: Boolean(comp.settings?.leaveEnabled),
          clPerMonth: String(comp.settings?.clPerMonth ?? 1),
          elPerMonth: String(comp.settings?.elPerMonth ?? 1.25),
          elCarryForwardMax: String(comp.settings?.elCarryForwardMax ?? 30),
          allowPastLeave: Boolean(comp.settings?.allowPastLeave),
          salesEnabled: Boolean(comp.settings?.salesEnabled),
          meetingCheckInGraceMin: String(comp.settings?.meetingCheckInGraceMin ?? 30),
          requireVisitPhoto: Boolean(comp.settings?.requireVisitPhoto),
          pfEnabled: Boolean(comp.settings?.pfEnabled),
          pfCapAtCeiling: Boolean(comp.settings?.pfCapAtCeiling ?? true),
          esiEnabled: Boolean(comp.settings?.esiEnabled),
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

  const toggleWeekOff = (dayIdx) => {
    setSettings((prev) => {
      const current = prev.weekOffDays || [];
      const next = current.includes(dayIdx)
        ? current.filter((d) => d !== dayIdx)
        : [...current, dayIdx].sort((a, b) => a - b);
      return { ...prev, weekOffDays: next };
    });
  };

  const openAddHoliday = () => {
    setHolidayForm({ date: todayLocal(), name: '' });
    setHolidayModalVisible(true);
  };

  const handleSaveHoliday = () => {
    const cleanDate = holidayForm.date.trim();
    const cleanName = holidayForm.name.trim();
    if (!cleanDate || !cleanName) {
      NativeAlert.alert('Validation Error', 'Please specify a holiday date and name.');
      return;
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(cleanDate)) {
      NativeAlert.alert('Validation Error', 'Date must be in YYYY-MM-DD format (e.g. 2026-10-25).');
      return;
    }
    if (holidays.some((h) => h.date === cleanDate)) {
      NativeAlert.alert('Duplicate Date', 'A holiday is already recorded for this date.');
      return;
    }
    setHolidays((prev) => [...prev, { date: cleanDate, name: cleanName }].sort((a, b) => a.date.localeCompare(b.date)));
    setHolidayModalVisible(false);
  };

  const handleDeleteHoliday = (idx) => {
    NativeAlert.alert('Remove Holiday', `Remove "${holidays[idx].name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setHolidays((prev) => prev.filter((_, i) => i !== idx)),
      },
    ]);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg({ type: 'success', text: '' });
    try {
      const payload = {
        locations: locations.map((l) => ({
          ...(l._id && { _id: l._id }),
          name: l.name.trim(),
          lat: Number(l.lat),
          lng: Number(l.lng),
          radius: Number(l.radius || 100),
        })),
        holidays: holidays.map((h) => ({
          date: h.date.trim(),
          name: h.name.trim(),
        })),
        settings: {
          maxGpsAccuracy: Number(settings.maxGpsAccuracy || 50),
          weekOffDays: settings.weekOffDays,
          workTimeEnabled: Boolean(settings.workTimeEnabled),
          workStartTime: settings.workStartTime,
          workEndTime: settings.workEndTime,
          lateGraceMin: Number(settings.lateGraceMin || 15),
          leaveEnabled: Boolean(settings.leaveEnabled),
          clPerMonth: Number(settings.clPerMonth || 1),
          elPerMonth: Number(settings.elPerMonth || 1.25),
          elCarryForwardMax: Number(settings.elCarryForwardMax || 30),
          allowPastLeave: Boolean(settings.allowPastLeave),
          salesEnabled: Boolean(settings.salesEnabled),
          meetingCheckInGraceMin: Number(settings.meetingCheckInGraceMin || 30),
          requireVisitPhoto: Boolean(settings.requireVisitPhoto),
          pfEnabled: Boolean(settings.pfEnabled),
          pfCapAtCeiling: Boolean(settings.pfCapAtCeiling),
          esiEnabled: Boolean(settings.esiEnabled),
        },
      };

      await updateSettingsApi(payload);
      setStatusMsg({ type: 'success', text: 'Company settings saved successfully!' });
      setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 4000);
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

      {/* 1. Office Geofence Locations */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Office Geofence Locations</Text>
        <TouchableOpacity
          onPress={openAddLoc}
          style={styles.addHeaderBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="plus-circle" size={18} color={colors.primary} />
          <Text style={styles.addHeaderText}>Add Branch</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionSubtitle}>
        Staff must be within the geofence radius to punch attendance.
      </Text>

      {locations.length === 0 ? (
        <Card style={styles.emptyCard} elevation="xs">
          <MaterialCommunityIcons name="map-marker-alert" size={40} color={colors.warning} />
          <Text style={styles.emptyTitle}>No office branches configured</Text>
          <Text style={styles.emptySub}>
            Staff will not be able to punch attendance until at least one location is added.
          </Text>
          <Button title="Add Office Location" onPress={openAddLoc} style={styles.addEmptyBtn} />
        </Card>
      ) : (
        <View style={styles.locList}>
          {locations.map((loc, idx) => (
            <Card key={idx} style={styles.locCard} elevation="xs">
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

      {/* 2. Attendance Rules */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Attendance Rules</Text>
      <Text style={styles.sectionSubtitle}>
        Configure GPS precision threshold and weekly paid off days.
      </Text>
      <Card style={styles.settingsCard} elevation="xs">
        <Input
          label="GPS Accuracy Limit (Meters) *"
          value={settings.maxGpsAccuracy}
          onChangeText={(t) => setSettings((p) => ({ ...p, maxGpsAccuracy: t }))}
          placeholder="50"
          keyboardType="numeric"
          helper="Attendance punches with worse GPS drift than this are rejected (10m - 500m)"
          prefixIcon="crosshairs-gps"
        />

        <Text style={styles.subFieldLabel}>Week Off Days (Paid)</Text>
        <Text style={styles.subFieldHelper}>
          Selected days are marked as scheduled paid off for attendance and salary calculation.
        </Text>
        <View style={styles.weekdaysGrid}>
          {WEEKDAYS.map((dayName, dayIdx) => {
            const isSelected = settings.weekOffDays.includes(dayIdx);
            return (
              <TouchableOpacity
                key={dayName}
                style={[styles.weekdayChip, isSelected && styles.weekdayChipActive]}
                onPress={() => toggleWeekOff(dayIdx)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={isSelected ? 'check-circle' : 'circle-outline'}
                  size={16}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.weekdayText, isSelected && styles.weekdayTextActive]}>
                  {dayName.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* 3. Working Hours & Late Mark */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Working Hours & Late Tracking</Text>
      <Text style={styles.sectionSubtitle}>
        Set office timings, late arrival grace period, and auto-flagging.
      </Text>
      <Card style={styles.settingsCard} elevation="xs">
        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setSettings((p) => ({ ...p, workTimeEnabled: !p.workTimeEnabled }))}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Track Working Hours</Text>
            <Text style={styles.switchDesc}>
              Tracks early departures and late punches in daily staff attendance.
            </Text>
          </View>
          <MaterialCommunityIcons
            name={settings.workTimeEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={38}
            color={settings.workTimeEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        {settings.workTimeEnabled && (
          <View style={styles.expandSection}>
            <View style={styles.twoInputsRow}>
              <Input
                label="Work Start Time *"
                value={settings.workStartTime}
                onChangeText={(t) => setSettings((p) => ({ ...p, workStartTime: t }))}
                placeholder="09:30"
                containerStyle={styles.halfInput}
                prefixIcon="clock-outline"
                helper="24-hr format HH:MM"
              />
              <Input
                label="Work End Time *"
                value={settings.workEndTime}
                onChangeText={(t) => setSettings((p) => ({ ...p, workEndTime: t }))}
                placeholder="18:30"
                containerStyle={styles.halfInput}
                prefixIcon="clock-check-outline"
                helper="24-hr format HH:MM"
              />
            </View>

            <Input
              label="Late Grace Window (Minutes) *"
              value={settings.lateGraceMin}
              onChangeText={(t) => setSettings((p) => ({ ...p, lateGraceMin: t }))}
              placeholder="15"
              keyboardType="numeric"
              helper="Staff punching in within this many minutes are still marked on time"
              prefixIcon="timer-sand"
            />
          </View>
        )}
      </Card>

      {/* 4. Holidays (paid) */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Paid Holidays</Text>
        <TouchableOpacity
          onPress={openAddHoliday}
          style={styles.addHeaderBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="plus-circle" size={18} color={colors.primary} />
          <Text style={styles.addHeaderText}>Add Holiday</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionSubtitle}>
        National and festive declared holidays (paid days not counted as absent).
      </Text>

      {holidays.length === 0 ? (
        <Card style={styles.emptyCard} elevation="xs">
          <MaterialCommunityIcons name="calendar-star" size={38} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No paid holidays added yet</Text>
          <Text style={styles.emptySub}>
            Add public holidays so staff are not marked absent on festive occasions.
          </Text>
          <Button title="Add First Holiday" onPress={openAddHoliday} style={styles.addEmptyBtn} />
        </Card>
      ) : (
        <View style={styles.holidaysList}>
          {holidays.map((h, idx) => (
            <Card key={idx} style={styles.holidayCard} elevation="xs">
              <View style={styles.holidayLeft}>
                <View style={styles.holidayIconCircle}>
                  <MaterialCommunityIcons name="calendar-check" size={20} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.holidayName}>{h.name}</Text>
                  <Text style={styles.holidayDate}>{formatDate(h.date)} ({h.date})</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteHoliday(idx)}
                style={styles.holidayDeleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}

      {/* 5. Leave Management */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Leave Management</Text>
      <Text style={styles.sectionSubtitle}>
        Casual Leave (CL), Earned Leave (EL) policies, and year-end carry forward limits.
      </Text>
      <Card style={styles.settingsCard} elevation="xs">
        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setSettings((p) => ({ ...p, leaveEnabled: !p.leaveEnabled }))}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable Leave Management</Text>
            <Text style={styles.switchDesc}>
              Staff can apply for leaves and CL/EL is credited automatically each month.
            </Text>
          </View>
          <MaterialCommunityIcons
            name={settings.leaveEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={38}
            color={settings.leaveEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        {settings.leaveEnabled && (
          <View style={styles.expandSection}>
            <View style={styles.twoInputsRow}>
              <Input
                label="Monthly CL Credit *"
                value={settings.clPerMonth}
                onChangeText={(t) => setSettings((p) => ({ ...p, clPerMonth: t }))}
                placeholder="1"
                keyboardType="numeric"
                containerStyle={styles.halfInput}
                helper="Casual leave days/mo"
              />
              <Input
                label="Monthly EL Credit *"
                value={settings.elPerMonth}
                onChangeText={(t) => setSettings((p) => ({ ...p, elPerMonth: t }))}
                placeholder="1.25"
                keyboardType="numeric"
                containerStyle={styles.halfInput}
                helper="1.25 = 15 days/year"
              />
            </View>

            <Input
              label="EL Carry Forward Limit (Days) *"
              value={settings.elCarryForwardMax}
              onChangeText={(t) => setSettings((p) => ({ ...p, elCarryForwardMax: t }))}
              placeholder="30"
              keyboardType="numeric"
              helper="Max EL carried over at year end (CL lapses at year end)"
            />

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setSettings((p) => ({ ...p, allowPastLeave: !p.allowPastLeave }))}
            >
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Allow Leave for Past Dates</Text>
                <Text style={styles.switchDesc}>
                  Allows employees to apply retroactive leave for previous dates.
                </Text>
              </View>
              <MaterialCommunityIcons
                name={settings.allowPastLeave ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.allowPastLeave ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* 6. Sales Meetings & Field Visits */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Sales Meetings & Field Visits</Text>
      <Text style={styles.sectionSubtitle}>
        Field tracking, client visits, QR verification, and photographic proof of visit.
      </Text>
      <Card style={styles.settingsCard} elevation="xs">
        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setSettings((p) => ({ ...p, salesEnabled: !p.salesEnabled }))}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable Sales Meetings</Text>
            <Text style={styles.switchDesc}>
              Allows scheduling client visits and tracking sales managers' GPS location.
            </Text>
          </View>
          <MaterialCommunityIcons
            name={settings.salesEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={38}
            color={settings.salesEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        {settings.salesEnabled && (
          <View style={styles.expandSection}>
            <Input
              label="Meeting Check-In Window (Minutes) *"
              value={settings.meetingCheckInGraceMin}
              onChangeText={(t) => setSettings((p) => ({ ...p, meetingCheckInGraceMin: t }))}
              placeholder="30"
              keyboardType="numeric"
              helper="Sales manager can check in this many minutes before/after meeting"
              prefixIcon="clock-time-four-outline"
            />

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setSettings((p) => ({ ...p, requireVisitPhoto: !p.requireVisitPhoto }))}
            >
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Require Visit Photo Proof</Text>
                <Text style={styles.switchDesc}>
                  Sales manager must snap a live photo at client premises to finish meeting.
                </Text>
              </View>
              <MaterialCommunityIcons
                name={settings.requireVisitPhoto ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.requireVisitPhoto ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* 7. Statutory Contributions (PF & ESI) */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Statutory Deductions (PF & ESI)</Text>
      <Text style={styles.sectionSubtitle}>
        Company-level statutory payroll rules. When turned OFF, no staff deduction occurs.
      </Text>
      <Card style={styles.settingsCard} elevation="xs">
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
            size={38}
            color={settings.pfEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        {settings.pfEnabled && (
          <View style={styles.expandSubRow}>
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setSettings((p) => ({ ...p, pfCapAtCeiling: !p.pfCapAtCeiling }))}
            >
              <View style={styles.switchTextCol}>
                <Text style={styles.switchSubTitle}>Cap PF at Statutory Ceiling (₹15,000)</Text>
                <Text style={styles.switchDesc}>Limit monthly EPF deduction basis to statutory ₹15,000 ceiling</Text>
              </View>
              <MaterialCommunityIcons
                name={settings.pfCapAtCeiling ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={settings.pfCapAtCeiling ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => setSettings((p) => ({ ...p, esiEnabled: !p.esiEnabled }))}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable Employee State Insurance (ESI)</Text>
            <Text style={styles.switchDesc}>Calculate 0.75% employee and 3.25% employer share up to ₹21,000 gross</Text>
          </View>
          <MaterialCommunityIcons
            name={settings.esiEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={38}
            color={settings.esiEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </Card>

      {/* Save Settings Button */}
      <Button
        title={saving ? 'Saving All Settings...' : 'Save All Company Settings'}
        onPress={handleSaveAll}
        loading={saving}
        icon="content-save-outline"
        style={styles.saveBtn}
      />

      {/* Admin Profile & Logout Buttons */}
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

      {/* Add Holiday Modal */}
      <Modal
        visible={holidayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHolidayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Paid Holiday</Text>
              <TouchableOpacity onPress={() => setHolidayModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Holiday Name *"
              value={holidayForm.name}
              onChangeText={(t) => setHolidayForm((p) => ({ ...p, name: t }))}
              placeholder="e.g. Diwali / Republic Day"
              prefixIcon="calendar-star"
            />

            <Input
              label="Date (YYYY-MM-DD) *"
              value={holidayForm.date}
              onChangeText={(t) => setHolidayForm((p) => ({ ...p, date: t }))}
              placeholder="YYYY-MM-DD"
              prefixIcon="calendar"
              helper="e.g. 2026-10-25"
            />

            <Button
              title="Add Holiday"
              onPress={handleSaveHoliday}
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
    paddingBottom: 40,
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
    lineHeight: 18,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addHeaderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
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
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  addEmptyBtn: {
    minWidth: 180,
  },
  settingsCard: {
    padding: 16,
  },
  subFieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  subFieldHelper: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  weekdaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weekdayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  weekdayTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  switchSubTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  switchDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  expandSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandSubRow: {
    marginTop: 6,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  holidaysList: {
    gap: 8,
  },
  holidayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  holidayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  holidayDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  holidayDeleteBtn: {
    padding: 6,
  },
  saveBtn: {
    marginTop: 24,
    marginBottom: 8,
  },
  authActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
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
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutActionText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 20,
    borderRadius: borderRadius.xl,
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
    gap: 12,
  },
  captureGpsBtn: {
    marginBottom: 14,
  },
  saveBranchBtn: {
    marginTop: 10,
  },
});
