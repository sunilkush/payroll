import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTodayApi, punchInApi, punchOutApi } from '../../api/attendanceApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, formatTime, WEEKDAYS } from '../../utils/format.js';
import { distanceInMeters, nearestOffice } from '../../utils/geo.js';

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text style={styles.clockText}>
      {formatTime(time)}
    </Text>
  );
}

export default function StaffPunchScreen({ navigation }) {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [alertMsg, setAlertMsg] = useState({ type: 'info', text: '' });

  // Location state
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [step, setStep] = useState(null); // null | 'locating' | 'saving'

  // Pulse animation for radar
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Load today's attendance & company branches
  const fetchToday = async () => {
    try {
      const res = await getTodayApi();
      setTodayData(res?.data || null);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Failed to load today attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  // Request GPS position via expo-location
  const acquireLocation = async () => {
    try {
      setRefreshingLocation(true);
      setLocationError('');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable GPS permissions in settings.');
        setRefreshingLocation(false);
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const current = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        at: Date.now(),
      };

      setLocation(current);
      return current;
    } catch (err) {
      setLocationError(err.message || 'Unable to retrieve GPS coordinates.');
      return null;
    } finally {
      setRefreshingLocation(false);
    }
  };

  useEffect(() => {
    acquireLocation();
  }, []);

  // Filter mappable office locations
  const mappableLocations = useMemo(() => {
    return (todayData?.locations ?? []).filter(
      (loc) => Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
    );
  }, [todayData?.locations]);

  // Calculate nearest office
  const nearest = useMemo(() => {
    if (!location || !mappableLocations.length) return null;
    return nearestOffice(mappableLocations, location);
  }, [location, mappableLocations]);

  const attendance = todayData?.attendance;
  const isPunchedIn = Boolean(attendance?.punchIn?.time);
  const isPunchedOut = Boolean(attendance?.punchOut?.time);

  const handlePunch = async () => {
    setAlertMsg({ type: 'info', text: '' });
    try {
      setStep('locating');

      // Ensure fresh location
      let currentPos = location;
      const isFresh = location && Date.now() - location.at < 15000;
      if (!isFresh) {
        currentPos = await acquireLocation();
      }

      if (!currentPos) {
        setAlertMsg({
          type: 'error',
          text: 'Location is required to verify geofence. Please turn on GPS.',
        });
        setStep(null);
        return;
      }

      setStep('saving');

      const payload = {
        lat: currentPos.lat,
        lng: currentPos.lng,
        accuracy: currentPos.accuracy,
      };

      const res = await (isPunchedIn ? punchOutApi(payload) : punchInApi(payload));

      setTodayData((prev) => ({
        ...prev,
        attendance: res?.data?.attendance,
      }));

      setAlertMsg({
        type: 'success',
        text: isPunchedIn ? 'Punched out successfully!' : 'Punched in successfully! Have a great workday.',
      });
    } catch (err) {
      setAlertMsg({
        type: 'error',
        text: err.errors?.[0]?.message || err.message || 'Punch operation failed.',
      });
    } finally {
      setStep(null);
    }
  };

  if (loading) {
    return <Loader message="Fetching attendance status..." />;
  }

  if (loadError) {
    return (
      <ScreenWrapper>
        <Header title="Geofence Punch" />
        <Alert type="error">{loadError}</Alert>
        <Button title="Try Again" onPress={fetchToday} />
      </ScreenWrapper>
    );
  }

  const currentDateObj = todayData?.date ? new Date(`${todayData.date}T00:00:00`) : new Date();
  const dayName = WEEKDAYS[currentDateObj.getDay()];

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Geofence Punch"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="refresh"
        onRightPress={() => {
          fetchToday();
          acquireLocation();
        }}
      />

      {/* Main Punch Card */}
      <Card style={styles.mainCard} elevation="md">
        <Text style={styles.dateLabel}>
          {dayName}, {formatDate(todayData?.date || new Date())}
        </Text>
        <LiveClock />

        {/* Status Badge */}
        <View style={styles.statusBadgeWrapper}>
          {isPunchedOut ? (
            <Badge label="Attendance Complete Today" variant="success" size="md" />
          ) : isPunchedIn ? (
            <Badge label="Active Punched In" variant="primary" size="md" />
          ) : (
            <Badge label="Not Punched In Today" variant="warning" size="md" />
          )}
        </View>

        {alertMsg.text ? (
          <Alert type={alertMsg.type} style={styles.alertSpacing}>
            {alertMsg.text}
          </Alert>
        ) : null}

        {/* Geofence Radar / Location Card */}
        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View style={styles.radarTitleRow}>
              <Animated.View
                style={[
                  styles.radarPulseCircle,
                  {
                    backgroundColor: nearest?.inside
                      ? colors.successBg
                      : locationError
                      ? colors.dangerBg
                      : colors.primaryBg,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={nearest?.inside ? 'map-marker-check' : 'map-marker-radius'}
                  size={26}
                  color={nearest?.inside ? colors.success : locationError ? colors.danger : colors.primary}
                />
              </Animated.View>
              <View style={styles.radarTextInfo}>
                <Text style={styles.radarStatusTitle}>
                  {locationError
                    ? 'GPS Error'
                    : nearest?.inside
                    ? 'Within Office Geofence'
                    : nearest
                    ? 'Outside Office Range'
                    : 'Locating Device...'}
                </Text>
                <Text style={styles.radarStatusSub}>
                  {nearest
                    ? `${nearest.distance}m from ${nearest.location.name} (Allowed: ${nearest.location.radius}m)`
                    : locationError || 'Calculating distance to nearest office branch...'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={acquireLocation}
              disabled={refreshingLocation}
              style={styles.refreshLocBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {refreshingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {location && !locationError && (
            <View style={styles.gpsMetaRow}>
              <Text style={styles.gpsMetaText}>
                GPS Accuracy: ±{Math.round(location.accuracy || 10)}m
              </Text>
              <Badge
                label={nearest?.inside ? 'ELIGIBLE TO PUNCH' : 'OUT OF RANGE'}
                variant={nearest?.inside ? 'success' : 'danger'}
                size="sm"
              />
            </View>
          )}
        </View>

        {/* Big Action Punch Button */}
        {!isPunchedOut ? (
          <Button
            title={
              step === 'locating'
                ? 'Acquiring GPS...'
                : step === 'saving'
                ? 'Saving Attendance...'
                : isPunchedIn
                ? 'Punch Out'
                : 'Punch In'
            }
            onPress={handlePunch}
            variant={isPunchedIn ? 'danger' : 'primary'}
            size="lg"
            loading={Boolean(step)}
            disabled={Boolean(step)}
            icon={isPunchedIn ? 'logout' : 'login'}
            iconPlacement="start"
            style={styles.bigPunchBtn}
          />
        ) : (
          <View style={styles.dayCompleteBox}>
            <MaterialCommunityIcons name="check-decagram" size={28} color={colors.success} />
            <Text style={styles.dayCompleteText}>Both punches recorded for today.</Text>
          </View>
        )}

        {/* Timestamps Row */}
        <View style={styles.timesContainer}>
          <View style={styles.timeCard}>
            <View style={[styles.timeDot, { backgroundColor: colors.success }]} />
            <Text style={styles.timeTitle}>Punch In</Text>
            <Text style={styles.timeValue}>
              {attendance?.punchIn?.time ? formatTime(attendance.punchIn.time) : '--:--'}
            </Text>
            {attendance?.punchIn?.distance != null && (
              <Text style={styles.timeLoc}>
                {attendance.punchIn.locationName || 'Office'} ({attendance.punchIn.distance}m)
              </Text>
            )}
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeCard}>
            <View style={[styles.timeDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.timeTitle}>Punch Out</Text>
            <Text style={styles.timeValue}>
              {attendance?.punchOut?.time ? formatTime(attendance.punchOut.time) : '--:--'}
            </Text>
            {attendance?.punchOut?.distance != null && (
              <Text style={styles.timeLoc}>
                {attendance.punchOut.locationName || 'Office'} ({attendance.punchOut.distance}m)
              </Text>
            )}
          </View>
        </View>
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  mainCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginBottom: 4,
  },
  clockText: {
    fontSize: 42,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -1,
    marginVertical: 4,
  },
  statusBadgeWrapper: {
    marginVertical: 12,
  },
  alertSpacing: {
    width: '100%',
    marginVertical: 8,
  },
  radarCard: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginVertical: 16,
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radarPulseCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radarTextInfo: {
    flex: 1,
  },
  radarStatusTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  radarStatusSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshLocBtn: {
    padding: 8,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 8,
  },
  gpsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gpsMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  bigPunchBtn: {
    width: '100%',
    marginVertical: 8,
  },
  dayCompleteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    width: '100%',
    justifyContent: 'center',
    marginVertical: 8,
  },
  dayCompleteText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.success,
    marginLeft: 10,
  },
  timesContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeCard: {
    flex: 1,
    alignItems: 'center',
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  timeTitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  timeValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginVertical: 2,
  },
  timeLoc: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  timeDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
});
