import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  RefreshControl,
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
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, todayLocal, WEEKDAYS } from '../../utils/format.js';
import LocationPickerMap from '../../components/common/LocationPickerMap.jsx';

// Plan Feature Mapping (aligns with server/utils/constants.js)
const PLAN_FEATURES = {
  FREE: [],
  STARTER: ['leave', 'corrections', 'payroll'],
  PROFESSIONAL: ['leave', 'corrections', 'payroll', 'statutory', 'workTime', 'sales', 'exports'],
  ENTERPRISE: ['leave', 'corrections', 'payroll', 'statutory', 'workTime', 'sales', 'exports'],
};

const SHIFT_PRESETS = [
  { label: '09:30 - 18:30 (General 9h)', start: '09:30', end: '18:30' },
  { label: '10:00 - 19:00 (Corporate)', start: '10:00', end: '19:00' },
  { label: '09:00 - 17:00 (Standard 8h)', start: '09:00', end: '17:00' },
  { label: '10:00 - 18:00 (Day Shift)', start: '10:00', end: '18:00' },
];

const GPS_PRESETS = [
  { label: '25m Strict', value: '25' },
  { label: '50m Recommended', value: '50' },
  { label: '100m Relaxed', value: '100' },
];

const GRACE_PRESETS = ['10', '15', '30'];

export default function AdminSettingsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: 'success', text: '' });
  const [selectedTab, setSelectedTab] = useState('ALL');

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
    workTimeEnabled: false,
    workStartTime: '09:30',
    workEndTime: '18:30',
    lateGraceMin: '15',
    leaveEnabled: false,
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

  // Determine current company plan & permissions
  const planName = useMemo(() => {
    const raw = (data?.plan || 'ENTERPRISE').toUpperCase();
    return ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(raw) ? raw : 'ENTERPRISE';
  }, [data]);

  const isFeatureAllowed = useCallback(
    (feature) => {
      const allowed = PLAN_FEATURES[planName] || PLAN_FEATURES.ENTERPRISE;
      return allowed.includes(feature);
    },
    [planName]
  );

  const checkGate = useCallback(
    (feature, minPlanLabel, onAllowed) => {
      if (!isFeatureAllowed(feature)) {
        NativeAlert.alert(
          'Plan Upgrade Required',
          `This feature is available on the ${minPlanLabel} plan and above. Upgrade your company plan to enable it.`,
          [{ text: 'Understood' }]
        );
        return false;
      }
      onAllowed();
      return true;
    },
    [isFeatureAllowed]
  );

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
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load company settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-sync whenever admin switches back to this screen
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const openAddLoc = async () => {
    setEditingIndex(null);
    let initialLat = '28.613900';
    let initialLng = '77.209000';
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const last = await Location.getLastKnownPositionAsync();
        if (last && last.coords) {
          initialLat = last.coords.latitude.toFixed(6);
          initialLng = last.coords.longitude.toFixed(6);
        }
      }
    } catch (e) {}
    setLocForm({ name: '', lat: initialLat, lng: initialLng, radius: '100' });
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
        NativeAlert.alert('Permission Error', 'Location permission is required to capture GPS coordinates.');
        return;
      }
      let pos = null;
      try {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch (e) {
        pos = await Location.getLastKnownPositionAsync();
      }
      if (pos && pos.coords) {
        setLocForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      } else {
        NativeAlert.alert('GPS Notice', 'Could not lock GPS signal. You can also search or drag the pin on the map.');
      }
    } catch (err) {
      NativeAlert.alert('GPS Error', err.message || 'Unable to retrieve location.');
    } finally {
      setCapturingGps(false);
    }
  };

  // Immediate location cloud save
  const handleSaveLoc = async () => {
    const cleanName = locForm.name.trim();
    if (!cleanName || cleanName.length < 2) {
      NativeAlert.alert('Validation Error', 'Please enter a valid branch name (at least 2 characters).');
      return;
    }

    const nLat = parseFloat(locForm.lat);
    const nLng = parseFloat(locForm.lng);
    if (isNaN(nLat) || isNaN(nLng) || nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      NativeAlert.alert('Validation Error', 'Please select valid GPS coordinates on the map.');
      return;
    }

    const nRad = parseInt(locForm.radius, 10) || 100;
    if (nRad < 10 || nRad > 5000) {
      NativeAlert.alert('Validation Error', 'Geofence radius must be between 10m and 5000m.');
      return;
    }

    const itemToSave = {
      ...(editingIndex !== null && locations[editingIndex]?._id && { _id: locations[editingIndex]._id }),
      name: cleanName,
      lat: nLat.toFixed(6),
      lng: nLng.toFixed(6),
      radius: String(nRad),
    };

    let nextLocations = [];
    if (editingIndex !== null) {
      nextLocations = [...locations];
      nextLocations[editingIndex] = itemToSave;
    } else {
      nextLocations = [...locations, itemToSave];
    }

    setSavingLoc(true);
    try {
      const payloadLocations = nextLocations.map((l) => ({
        ...(l._id && { _id: l._id }),
        name: l.name.trim(),
        lat: Number(l.lat),
        lng: Number(l.lng),
        radius: Number(l.radius || 100),
      }));

      const res = await updateSettingsApi({ locations: payloadLocations });
      const comp = res?.data?.company || res?.data;
      if (comp && Array.isArray(comp.locations)) {
        setLocations(
          comp.locations.map((l) => ({
            _id: l._id,
            name: l.name,
            lat: String(l.lat),
            lng: String(l.lng),
            radius: String(l.radius || 100),
          }))
        );
      } else {
        setLocations(nextLocations);
      }
      setLocModalVisible(false);
      setStatusMsg({ type: 'success', text: `Branch "${cleanName}" saved to cloud successfully!` });
      setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 3500);
    } catch (err) {
      const msg = err.errors?.[0]?.message || err.message || 'Failed to save branch location.';
      NativeAlert.alert('Save Failed', msg);
    } finally {
      setSavingLoc(false);
    }
  };

  const handleDeleteLoc = (idx) => {
    const locToDelete = locations[idx];
    NativeAlert.alert('Delete Branch', `Remove "${locToDelete.name}" from office geofences?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const nextLocations = locations.filter((_, i) => i !== idx);
          try {
            const payloadLocations = nextLocations.map((l) => ({
              ...(l._id && { _id: l._id }),
              name: l.name.trim(),
              lat: Number(l.lat),
              lng: Number(l.lng),
              radius: Number(l.radius || 100),
            }));

            const res = await updateSettingsApi({ locations: payloadLocations });
            const comp = res?.data?.company || res?.data;
            if (comp && Array.isArray(comp.locations)) {
              setLocations(
                comp.locations.map((l) => ({
                  _id: l._id,
                  name: l.name,
                  lat: String(l.lat),
                  lng: String(l.lng),
                  radius: String(l.radius || 100),
                }))
              );
            } else {
              setLocations(nextLocations);
            }
            setStatusMsg({ type: 'success', text: `Branch "${locToDelete.name}" deleted.` });
            setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 3500);
          } catch (err) {
            NativeAlert.alert('Delete Failed', err.message || 'Could not delete branch.');
          }
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

  // Immediate holiday cloud save
  const handleSaveHoliday = async () => {
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
    const nextHolidays = [...holidays, { date: cleanDate, name: cleanName }].sort((a, b) => a.date.localeCompare(b.date));

    setSavingHoliday(true);
    try {
      const res = await updateSettingsApi({ holidays: nextHolidays });
      const comp = res?.data?.company || res?.data;
      if (comp?.holidays) {
        setHolidays(comp.holidays.map((h) => ({ date: h.date, name: h.name })));
      } else {
        setHolidays(nextHolidays);
      }
      setHolidayModalVisible(false);
      setStatusMsg({ type: 'success', text: `Holiday "${cleanName}" saved to cloud!` });
      setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 3500);
    } catch (err) {
      NativeAlert.alert('Save Failed', err.errors?.[0]?.message || err.message || 'Could not save holiday.');
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHoliday = (idx) => {
    const holidayToDelete = holidays[idx];
    NativeAlert.alert('Remove Holiday', `Remove "${holidayToDelete.name}" (${holidayToDelete.date})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const nextHolidays = holidays.filter((_, i) => i !== idx);
          try {
            const res = await updateSettingsApi({ holidays: nextHolidays });
            const comp = res?.data?.company || res?.data;
            if (comp?.holidays) {
              setHolidays(comp.holidays.map((h) => ({ date: h.date, name: h.name })));
            } else {
              setHolidays(nextHolidays);
            }
            setStatusMsg({ type: 'success', text: `Holiday "${holidayToDelete.name}" removed.` });
            setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 3500);
          } catch (err) {
            NativeAlert.alert('Delete Failed', err.message || 'Could not delete holiday.');
          }
        },
      },
    ]);
  };

  const handleSaveAll = async () => {
    // 1. Shift validation
    if (settings.workTimeEnabled && isFeatureAllowed('workTime')) {
      if (settings.workEndTime <= settings.workStartTime) {
        NativeAlert.alert(
          'Invalid Shift Timings',
          'Work End Time must be later than Work Start Time. Please adjust the hours or select a shift preset.'
        );
        return;
      }
    }

    // 2. GPS accuracy validation
    const gpsAcc = Number(settings.maxGpsAccuracy) || 50;
    if (gpsAcc < 10 || gpsAcc > 1000) {
      NativeAlert.alert('Validation Error', 'GPS accuracy limit must be between 10m and 1000m.');
      return;
    }

    setSaving(true);
    setStatusMsg({ type: 'success', text: '' });
    try {
      // Sanitize settings according to plan permissions to prevent 403 Forbidden errors
      const payloadSettings = {
        maxGpsAccuracy: gpsAcc,
        weekOffDays: settings.weekOffDays,
        workTimeEnabled: isFeatureAllowed('workTime') ? Boolean(settings.workTimeEnabled) : false,
        workStartTime: settings.workStartTime,
        workEndTime: settings.workEndTime,
        lateGraceMin: Math.max(0, Math.min(180, Number(settings.lateGraceMin || 15))),
        leaveEnabled: isFeatureAllowed('leave') ? Boolean(settings.leaveEnabled) : false,
        clPerMonth: Number(settings.clPerMonth || 1),
        elPerMonth: Number(settings.elPerMonth || 1.25),
        elCarryForwardMax: Number(settings.elCarryForwardMax || 30),
        allowPastLeave: Boolean(settings.allowPastLeave),
        salesEnabled: isFeatureAllowed('sales') ? Boolean(settings.salesEnabled) : false,
        meetingCheckInGraceMin: Number(settings.meetingCheckInGraceMin || 30),
        requireVisitPhoto: Boolean(settings.requireVisitPhoto),
        pfEnabled: isFeatureAllowed('statutory') ? Boolean(settings.pfEnabled) : false,
        pfCapAtCeiling: Boolean(settings.pfCapAtCeiling),
        esiEnabled: isFeatureAllowed('statutory') ? Boolean(settings.esiEnabled) : false,
      };

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
        settings: payloadSettings,
      };

      await updateSettingsApi(payload);
      setStatusMsg({ type: 'success', text: 'All company rules & settings saved successfully!' });
      NativeAlert.alert('Settings Saved', 'All company geofences, shift rules, and policies are synchronized.');
      setTimeout(() => setStatusMsg({ type: 'success', text: '' }), 4000);
    } catch (err) {
      const msg = err.errors?.[0]?.message || err.message || 'Failed to save settings.';
      setStatusMsg({ type: 'error', text: msg });
      NativeAlert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const getPlanBadgeConfig = () => {
    switch (planName) {
      case 'ENTERPRISE':
        return { label: 'ENTERPRISE PLAN', bg: '#EEF2FF', text: '#4F46E5', icon: 'crown' };
      case 'PROFESSIONAL':
        return { label: 'PROFESSIONAL PLAN', bg: '#F0FDFA', text: '#0D9488', icon: 'star' };
      case 'STARTER':
        return { label: 'STARTER PLAN', bg: '#EFF6FF', text: '#2563EB', icon: 'shield-star' };
      default:
        return { label: 'FREE PLAN', bg: '#F1F5F9', text: '#64748B', icon: 'account-outline' };
    }
  };

  const planBadge = getPlanBadgeConfig();

  const CATEGORY_TABS = [
    { id: 'ALL', label: 'All Rules', icon: 'tune-variant' },
    { id: 'OFFICE', label: 'Geofences', icon: 'office-building-marker', badge: locations.length },
    { id: 'TIMINGS', label: 'Shift & Hours', icon: 'clock-time-four-outline' },
    { id: 'LEAVES', label: 'Leaves & Offs', icon: 'calendar-multiselect', badge: holidays.length },
    { id: 'RULES', label: 'Payroll & Sales', icon: 'shield-check-outline' },
  ];

  if (loading) {
    return <Loader message="Loading company settings..." />;
  }

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Header
        title="Company Settings"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="refresh"
        onRightPress={onRefresh}
      />

      {statusMsg.text ? (
        <Alert type={statusMsg.type} style={styles.topAlert}>
          {statusMsg.text}
        </Alert>
      ) : null}

      {/* ── Executive Hero Card ── */}
      <Card style={styles.heroCard} elevation="sm">
        <View style={styles.heroTopRow}>
          <View style={styles.heroAvatar}>
            <MaterialCommunityIcons name="domain" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.heroTitleCol}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroCompanyName} numberOfLines={1}>
                {data?.name || 'Company Configuration'}
              </Text>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#2563EB" />
            </View>
            <Text style={styles.heroSubText}>Admin Enterprise Control Panel</Text>
          </View>
          <View style={[styles.planBadgeContainer, { backgroundColor: planBadge.bg }]}>
            <MaterialCommunityIcons name={planBadge.icon} size={13} color={planBadge.text} />
            <Text style={[styles.planBadgeText, { color: planBadge.text }]}>{planBadge.label}</Text>
          </View>
        </View>

        {/* Live Sync Status & Metrics Strip */}
        <View style={styles.heroDivider} />
        <View style={styles.heroMetricsStrip}>
          <View style={styles.heroMetricItem}>
            <View style={styles.syncIndicator}>
              <View style={styles.syncDotLive} />
              <Text style={styles.syncText}>Live Cloud Sync</Text>
            </View>
          </View>

          <View style={styles.heroMetricPill}>
            <MaterialCommunityIcons name="office-building" size={14} color={colors.primary} />
            <Text style={styles.heroMetricPillText}>{locations.length} Branches</Text>
          </View>

          <View style={styles.heroMetricPill}>
            <MaterialCommunityIcons name="calendar-star" size={14} color="#16A34A" />
            <Text style={styles.heroMetricPillText}>{holidays.length} Holidays</Text>
          </View>

          <View style={styles.heroMetricPill}>
            <MaterialCommunityIcons name="calendar-range" size={14} color="#D97706" />
            <Text style={styles.heroMetricPillText}>{settings.weekOffDays.length} Off Days</Text>
          </View>
        </View>
      </Card>

      {/* ── Category Filter Tabs ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                onPress={() => setSelectedTab(tab.id)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                  {tab.label}
                </Text>
                {tab.badge !== undefined && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {tab.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 1. Office Geofence Locations ── */}
      {(selectedTab === 'ALL' || selectedTab === 'OFFICE') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.sectionIconPill, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Office Geofence Locations</Text>
                <Text style={styles.sectionSubtitle}>
                  Staff can punch in only within these GPS boundaries
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={openAddLoc}
              style={styles.addBranchHeaderBtn}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.addBranchHeaderBtnText}>Add Branch</Text>
            </TouchableOpacity>
          </View>

          {locations.length === 0 ? (
            <Card style={styles.emptyCard} elevation="xs">
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="map-marker-alert-outline" size={36} color={colors.warning} />
              </View>
              <Text style={styles.emptyTitle}>No office branches configured</Text>
              <Text style={styles.emptySub}>
                Staff cannot punch attendance until at least one office geofence is saved.
              </Text>
              <Button
                title="+ Add First Office Branch"
                onPress={openAddLoc}
                style={styles.addEmptyBtn}
                icon="plus-circle-outline"
              />
            </Card>
          ) : (
            <View style={styles.locList}>
              {locations.map((loc, idx) => (
                <Card key={loc._id || idx} style={styles.locCard} elevation="xs">
                  <View style={styles.locCardTop}>
                    <View style={styles.locIconCircle}>
                      <MaterialCommunityIcons name="office-building" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.locInfo}>
                      <View style={styles.locNameRow}>
                        <Text style={styles.locName}>{loc.name}</Text>
                        <View style={styles.activePill}>
                          <View style={styles.activeDot} />
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      </View>
                      <View style={styles.locCoordsRow}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={13} color={colors.textMuted} />
                        <Text style={styles.locCoords}>
                          {Number(loc.lat).toFixed(6)}, {Number(loc.lng).toFixed(6)}
                        </Text>
                      </View>
                    </View>
                    <Badge label={`${loc.radius}m Radius`} variant="primary" size="sm" />
                  </View>

                  <View style={styles.locActionsRow}>
                    <TouchableOpacity onPress={() => openEditLoc(idx)} style={styles.locActionBtn}>
                      <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.primary} />
                      <Text style={styles.locActionText}>Edit Map Pin</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteLoc(idx)}
                      style={[styles.locActionBtn, { marginLeft: 16 }]}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color={colors.danger} />
                      <Text style={[styles.locActionText, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 2. Attendance Rules & GPS Precision ── */}
      {(selectedTab === 'ALL' || selectedTab === 'TIMINGS') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleWithIcon}>
            <View style={[styles.sectionIconPill, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#D97706" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Attendance Rules & GPS Drift</Text>
              <Text style={styles.sectionSubtitle}>
                Configure punch drift tolerance and scheduled weekly paid offs
              </Text>
            </View>
          </View>

          <Card style={styles.settingsCard} elevation="xs">
            <Text style={styles.inputGroupLabel}>GPS Accuracy Threshold (Meters) *</Text>
            <Text style={styles.inputGroupHelper}>
              Attendance punches with GPS drift worse than this value are strictly rejected.
            </Text>

            {/* Quick GPS Presets */}
            <View style={styles.presetsRow}>
              {GPS_PRESETS.map((preset) => {
                const isSelected = String(settings.maxGpsAccuracy) === preset.value;
                return (
                  <TouchableOpacity
                    key={preset.value}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => setSettings((p) => ({ ...p, maxGpsAccuracy: preset.value }))}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              value={settings.maxGpsAccuracy}
              onChangeText={(t) => setSettings((p) => ({ ...p, maxGpsAccuracy: t }))}
              placeholder="50"
              keyboardType="numeric"
              prefixIcon="target"
            />

            <View style={styles.divider} />

            <Text style={styles.inputGroupLabel}>Paid Week Off Days</Text>
            <Text style={styles.inputGroupHelper}>
              Selected days count as scheduled paid rest and are not flagged absent.
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
        </View>
      )}

      {/* ── 3. Working Hours & Shift Presets ── */}
      {(selectedTab === 'ALL' || selectedTab === 'TIMINGS') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleWithIcon}>
            <View style={[styles.sectionIconPill, { backgroundColor: '#F0FDFA' }]}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#0D9488" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Working Hours & Shift Tracking</Text>
              <Text style={styles.sectionSubtitle}>
                Standard office shift times, late arrival flags, and grace window
              </Text>
            </View>
          </View>

          <Card style={styles.settingsCard} elevation="xs">
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => {
                checkGate('workTime', 'Professional', () => {
                  setSettings((p) => ({ ...p, workTimeEnabled: !p.workTimeEnabled }));
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.switchTextCol}>
                <View style={styles.switchTitleRow}>
                  <Text style={styles.switchTitle}>Track Working Hours & Shifts</Text>
                  {!isFeatureAllowed('workTime') && (
                    <View style={styles.lockBadge}>
                      <MaterialCommunityIcons name="lock" size={11} color="#6366F1" />
                      <Text style={styles.lockBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.switchDesc}>
                  Calculates total daily duty hours, late marks, and early departures.
                </Text>
              </View>
              <MaterialCommunityIcons
                name={settings.workTimeEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.workTimeEnabled ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            {settings.workTimeEnabled && isFeatureAllowed('workTime') && (
              <View style={styles.expandSection}>
                {/* Shift Presets */}
                <Text style={styles.subFieldLabel}>Quick Shift Presets</Text>
                <View style={styles.shiftPresetsGrid}>
                  {SHIFT_PRESETS.map((preset) => {
                    const isSelected =
                      settings.workStartTime === preset.start && settings.workEndTime === preset.end;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.shiftPresetChip, isSelected && styles.shiftPresetChipActive]}
                        onPress={() =>
                          setSettings((p) => ({
                            ...p,
                            workStartTime: preset.start,
                            workEndTime: preset.end,
                          }))
                        }
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? 'clock-check' : 'clock-outline'}
                          size={13}
                          color={isSelected ? '#FFFFFF' : colors.primary}
                        />
                        <Text style={[styles.shiftPresetText, isSelected && styles.shiftPresetTextActive]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.twoInputsRow}>
                  <Input
                    label="Work Start Time *"
                    value={settings.workStartTime}
                    onChangeText={(t) => setSettings((p) => ({ ...p, workStartTime: t }))}
                    placeholder="09:30"
                    containerStyle={styles.halfInput}
                    prefixIcon="clock-outline"
                    helper="24-hr format (HH:MM)"
                  />
                  <Input
                    label="Work End Time *"
                    value={settings.workEndTime}
                    onChangeText={(t) => setSettings((p) => ({ ...p, workEndTime: t }))}
                    placeholder="18:30"
                    containerStyle={styles.halfInput}
                    prefixIcon="clock-check-outline"
                    helper="Must be after start"
                  />
                </View>

                <View style={styles.divider} />

                <Text style={styles.subFieldLabel}>Late Arrival Grace Period (Minutes) *</Text>
                <View style={styles.presetsRow}>
                  {GRACE_PRESETS.map((m) => {
                    const isSelected = String(settings.lateGraceMin) === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        onPress={() => setSettings((p) => ({ ...p, lateGraceMin: m }))}
                      >
                        <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                          {m} mins
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Input
                  value={settings.lateGraceMin}
                  onChangeText={(t) => setSettings((p) => ({ ...p, lateGraceMin: t }))}
                  placeholder="15"
                  keyboardType="numeric"
                  helper="Staff punching within this window are not flagged late"
                  prefixIcon="timer-sand"
                />
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ── 4. Paid Holidays ── */}
      {(selectedTab === 'ALL' || selectedTab === 'LEAVES') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.sectionIconPill, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="calendar-star" size={18} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Paid Holidays ({holidays.length})</Text>
                <Text style={styles.sectionSubtitle}>
                  National & festival dates treated as paid workdays
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={openAddHoliday}
              style={styles.addBranchHeaderBtn}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.addBranchHeaderBtnText}>Add Holiday</Text>
            </TouchableOpacity>
          </View>

          {holidays.length === 0 ? (
            <Card style={styles.emptyCard} elevation="xs">
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="calendar-remove-outline" size={36} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No paid holidays recorded</Text>
              <Text style={styles.emptySub}>
                Add gazetted or public holidays so staff are not marked absent on festival days.
              </Text>
              <Button
                title="+ Add First Holiday"
                onPress={openAddHoliday}
                style={styles.addEmptyBtn}
                icon="calendar-plus"
              />
            </Card>
          ) : (
            <View style={styles.holidaysList}>
              {holidays.map((h, idx) => (
                <Card key={`${h.date}-${idx}`} style={styles.holidayCard} elevation="xs">
                  <View style={styles.holidayLeft}>
                    <View style={styles.holidayIconCircle}>
                      <MaterialCommunityIcons name="calendar-check" size={20} color="#16A34A" />
                    </View>
                    <View>
                      <Text style={styles.holidayName}>{h.name}</Text>
                      <Text style={styles.holidayDate}>
                        {formatDate(h.date)} • {h.date}
                      </Text>
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
        </View>
      )}

      {/* ── 5. Leave Management ── */}
      {(selectedTab === 'ALL' || selectedTab === 'LEAVES') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleWithIcon}>
            <View style={[styles.sectionIconPill, { backgroundColor: '#F3E8FF' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Leave Policy & Monthly Quota</Text>
              <Text style={styles.sectionSubtitle}>
                Casual Leave (CL), Earned Leave (EL), and annual carryover caps
              </Text>
            </View>
          </View>

          <Card style={styles.settingsCard} elevation="xs">
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => {
                checkGate('leave', 'Starter', () => {
                  setSettings((p) => ({ ...p, leaveEnabled: !p.leaveEnabled }));
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.switchTextCol}>
                <View style={styles.switchTitleRow}>
                  <Text style={styles.switchTitle}>Enable Leave Management</Text>
                  {!isFeatureAllowed('leave') && (
                    <View style={styles.lockBadge}>
                      <MaterialCommunityIcons name="lock" size={11} color="#6366F1" />
                      <Text style={styles.lockBadgeText}>STARTER</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.switchDesc}>
                  Allows staff to submit leave applications and credits CL/EL each month.
                </Text>
              </View>
              <MaterialCommunityIcons
                name={settings.leaveEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.leaveEnabled ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            {settings.leaveEnabled && isFeatureAllowed('leave') && (
              <View style={styles.expandSection}>
                <View style={styles.twoInputsRow}>
                  <Input
                    label="Monthly CL Credit *"
                    value={settings.clPerMonth}
                    onChangeText={(t) => setSettings((p) => ({ ...p, clPerMonth: t }))}
                    placeholder="1"
                    keyboardType="numeric"
                    containerStyle={styles.halfInput}
                    helper="Casual days/month"
                    prefixIcon="calendar-outline"
                  />
                  <Input
                    label="Monthly EL Credit *"
                    value={settings.elPerMonth}
                    onChangeText={(t) => setSettings((p) => ({ ...p, elPerMonth: t }))}
                    placeholder="1.25"
                    keyboardType="numeric"
                    containerStyle={styles.halfInput}
                    helper="1.25 = 15 days/yr"
                    prefixIcon="calendar-badge-plus"
                  />
                </View>

                <Input
                  label="EL Carry Forward Limit (Days) *"
                  value={settings.elCarryForwardMax}
                  onChangeText={(t) => setSettings((p) => ({ ...p, elCarryForwardMax: t }))}
                  placeholder="30"
                  keyboardType="numeric"
                  helper="Maximum EL carried forward into next year (CL lapses Dec 31)"
                  prefixIcon="arrow-decision-auto"
                />

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setSettings((p) => ({ ...p, allowPastLeave: !p.allowPastLeave }))}
                  activeOpacity={0.7}
                >
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchSubTitle}>Allow Past-Date Leave Requests</Text>
                    <Text style={styles.switchDesc}>
                      Allows staff to retroactively request leave for previously missed workdays.
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={settings.allowPastLeave ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={36}
                    color={settings.allowPastLeave ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ── 6. Sales Meetings & Field Visits ── */}
      {(selectedTab === 'ALL' || selectedTab === 'RULES') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleWithIcon}>
            <View style={[styles.sectionIconPill, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="briefcase-outline" size={18} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Sales Visits & Field Tracking</Text>
              <Text style={styles.sectionSubtitle}>
                Client meetings, geo-verified check-ins, and photographic proofs
              </Text>
            </View>
          </View>

          <Card style={styles.settingsCard} elevation="xs">
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => {
                checkGate('sales', 'Professional', () => {
                  setSettings((p) => ({ ...p, salesEnabled: !p.salesEnabled }));
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.switchTextCol}>
                <View style={styles.switchTitleRow}>
                  <Text style={styles.switchTitle}>Enable Sales Field Tracking</Text>
                  {!isFeatureAllowed('sales') && (
                    <View style={styles.lockBadge}>
                      <MaterialCommunityIcons name="lock" size={11} color="#6366F1" />
                      <Text style={styles.lockBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.switchDesc}>
                  Allows scheduling client visits and live GPS check-ins for field reps.
                </Text>
              </View>
              <MaterialCommunityIcons
                name={settings.salesEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.salesEnabled ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            {settings.salesEnabled && isFeatureAllowed('sales') && (
              <View style={styles.expandSection}>
                <Input
                  label="Meeting Check-In Window (Minutes) *"
                  value={settings.meetingCheckInGraceMin}
                  onChangeText={(t) => setSettings((p) => ({ ...p, meetingCheckInGraceMin: t }))}
                  placeholder="30"
                  keyboardType="numeric"
                  helper="Minutes before/after scheduled meeting time client QR scan is accepted"
                  prefixIcon="clock-time-four-outline"
                />

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setSettings((p) => ({ ...p, requireVisitPhoto: !p.requireVisitPhoto }))}
                  activeOpacity={0.7}
                >
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchSubTitle}>Require Photographic Proof of Visit</Text>
                    <Text style={styles.switchDesc}>
                      Sales manager must upload a camera photo at client site to complete check-out.
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={settings.requireVisitPhoto ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={36}
                    color={settings.requireVisitPhoto ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ── 7. Statutory Contributions (PF & ESI) ── */}
      {(selectedTab === 'ALL' || selectedTab === 'RULES') && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleWithIcon}>
            <View style={[styles.sectionIconPill, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#DC2626" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Statutory Payroll Deductions</Text>
              <Text style={styles.sectionSubtitle}>
                Provident Fund (EPF/EPS) and Employee State Insurance (ESI) rules
              </Text>
            </View>
          </View>

          <Card style={styles.settingsCard} elevation="xs">
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => {
                checkGate('statutory', 'Professional', () => {
                  setSettings((p) => ({ ...p, pfEnabled: !p.pfEnabled }));
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.switchTextCol}>
                <View style={styles.switchTitleRow}>
                  <Text style={styles.switchTitle}>Enable Provident Fund (PF)</Text>
                  {!isFeatureAllowed('statutory') && (
                    <View style={styles.lockBadge}>
                      <MaterialCommunityIcons name="lock" size={11} color="#6366F1" />
                      <Text style={styles.lockBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.switchDesc}>Calculates 12% employee and employer EPF/EPS deduction.</Text>
              </View>
              <MaterialCommunityIcons
                name={settings.pfEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.pfEnabled ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            {settings.pfEnabled && isFeatureAllowed('statutory') && (
              <View style={styles.expandSubRow}>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setSettings((p) => ({ ...p, pfCapAtCeiling: !p.pfCapAtCeiling }))}
                  activeOpacity={0.7}
                >
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchSubTitle}>Cap PF at Statutory Ceiling (₹15,000)</Text>
                    <Text style={styles.switchDesc}>Limit monthly EPF deduction basis to standard ₹15,000 statutory wage ceiling</Text>
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
              onPress={() => {
                checkGate('statutory', 'Professional', () => {
                  setSettings((p) => ({ ...p, esiEnabled: !p.esiEnabled }));
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.switchTextCol}>
                <View style={styles.switchTitleRow}>
                  <Text style={styles.switchTitle}>Enable State Insurance (ESI)</Text>
                  {!isFeatureAllowed('statutory') && (
                    <View style={styles.lockBadge}>
                      <MaterialCommunityIcons name="lock" size={11} color="#6366F1" />
                      <Text style={styles.lockBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.switchDesc}>Calculates 0.75% employee and 3.25% employer share up to ₹21,000 gross.</Text>
              </View>
              <MaterialCommunityIcons
                name={settings.esiEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={38}
                color={settings.esiEnabled ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {/* ── Bulk Save Button ── */}
      <View style={styles.saveSection}>
        <Button
          title={saving ? 'Saving All Settings...' : 'Save All Company Settings'}
          onPress={handleSaveAll}
          loading={saving}
          icon="content-save-check"
          style={styles.saveBtn}
        />
      </View>

      {/* ── Add / Edit Branch Modal ── */}
      <Modal
        visible={locModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCardLarge} elevation="lg">
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingIndex !== null ? 'Edit Branch Location' : 'Add Office Branch'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Search place or tap map to drop office geofence pin
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLocModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              <Input
                label="Branch Name *"
                value={locForm.name}
                onChangeText={(t) => setLocForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Headquarters / Gurgaon Branch"
                prefixIcon="office-building"
              />

              {/* Interactive Map Component */}
              <LocationPickerMap
                lat={locForm.lat}
                lng={locForm.lng}
                radius={locForm.radius}
                onPick={(lat, lng) => setLocForm((p) => ({ ...p, lat, lng }))}
                onRadiusChange={(radius) => setLocForm((p) => ({ ...p, radius }))}
                onAddressResolved={(addr) => {
                  if (!locForm.name.trim()) {
                    setLocForm((p) => ({ ...p, name: addr }));
                  }
                }}
              />

              <View style={styles.coordsRow}>
                <Input
                  label="Latitude *"
                  value={locForm.lat}
                  onChangeText={(t) => setLocForm((p) => ({ ...p, lat: t }))}
                  placeholder="28.613900"
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="Longitude *"
                  value={locForm.lng}
                  onChangeText={(t) => setLocForm((p) => ({ ...p, lng: t }))}
                  placeholder="77.209000"
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              </View>

              <Input
                label="Geofence Radius (Meters) *"
                value={locForm.radius}
                onChangeText={(t) => setLocForm((p) => ({ ...p, radius: t }))}
                placeholder="100"
                keyboardType="numeric"
                helper="Recommended: 100m - 200m to account for GPS drift"
                prefixIcon="radar"
              />

              <Button
                title={editingIndex !== null ? 'Update Branch Location' : 'Save Branch Location'}
                onPress={handleSaveLoc}
                loading={savingLoc}
                disabled={savingLoc}
                style={styles.saveBranchBtn}
                icon="cloud-upload-outline"
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* ── Add Holiday Modal ── */}
      <Modal
        visible={holidayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHolidayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Paid Holiday</Text>
                <Text style={styles.modalSubtitle}>Persists immediately to cloud</Text>
              </View>
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
              title={savingHoliday ? 'Saving...' : 'Save Holiday to Cloud'}
              onPress={handleSaveHoliday}
              loading={savingHoliday}
              disabled={savingHoliday}
              style={styles.saveBranchBtn}
              icon="calendar-check"
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
  topAlert: {
    marginBottom: 14,
  },

  /* ── Hero Card ── */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleCol: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCompanyName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  heroSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  syncDotLive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  syncText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: '#16A34A',
  },
  heroMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroMetricPillText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },

  /* ── Category Filter Tabs ── */
  tabsWrapper: {
    marginBottom: 18,
  },
  tabsScroll: {
    gap: 8,
    paddingRight: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* ── Section Block ── */
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addBranchHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    elevation: 1,
  },
  addBranchHeaderBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },

  /* ── Branch Cards ── */
  locList: {
    gap: 10,
  },
  locCard: {
    padding: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locInfo: {
    flex: 1,
  },
  locNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activePillText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },
  locCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locCoords: {
    fontSize: 11,
    color: colors.textMuted,
  },
  locActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    justifyContent: 'flex-end',
  },
  locActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locActionText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  /* ── Empty Card ── */
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  addEmptyBtn: {
    minWidth: 200,
  },

  /* ── Settings Card ── */
  settingsCard: {
    padding: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputGroupLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  inputGroupHelper: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },

  /* ── Presets ── */
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
  },

  /* ── Shift Presets ── */
  shiftPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  shiftPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shiftPresetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shiftPresetText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  shiftPresetTextActive: {
    color: '#FFFFFF',
  },

  /* ── Weekdays Grid ── */
  weekdaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
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

  /* ── Switches & Toggles ── */
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
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#4F46E5',
  },

  /* ── Form Layout Helpers ── */
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
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },

  /* ── Holidays ── */
  holidaysList: {
    gap: 8,
  },
  holidayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  holidayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayName: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  holidayDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  holidayDeleteBtn: {
    padding: 6,
  },

  /* ── Footer & Save Bar ── */
  saveSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  saveBtn: {
    borderRadius: borderRadius.pill,
  },

  /* ── Modals ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    padding: 20,
    borderRadius: borderRadius.xl,
  },
  modalCardLarge: {
    padding: 18,
    borderRadius: borderRadius.xl,
    maxHeight: '94%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBranchBtn: {
    marginTop: 14,
    marginBottom: 6,
    borderRadius: borderRadius.pill,
  },
});
