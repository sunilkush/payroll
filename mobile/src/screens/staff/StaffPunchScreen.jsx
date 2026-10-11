import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTodayApi, punchInApi, punchOutApi } from '../../api/attendanceApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Loader from '../../components/common/Loader.jsx';
import PunchGeofenceMap from '../../components/common/PunchGeofenceMap.jsx';
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

  useFocusEffect(
    useCallback(() => {
      fetchToday();
      acquireLocation();
    }, [])
  );

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

      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (err) {
        // Fallback to last known position if indoor GPS fix times out
        pos = await Location.getLastKnownPositionAsync();
        if (!pos) throw err;
      }

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
      return location;
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
  const isSunday = Boolean(todayData?.isSunday);
  const isWeekOff = Boolean(todayData?.isWeekOff);
  const weekOffDayName = todayData?.weekOffDayName || (isSunday ? 'Sunday' : 'Weekly Off');
  const holidayName = todayData?.holidayName;
  const workTime = todayData?.workTime;

  // Real-time work hours evaluation (start se pehle ya end ke baad punch-in block)
  const checkWorkHours = useCallback(() => {
    if (!workTime?.enabled || !workTime?.start || !workTime?.end) {
      return { isOutside: false, message: '' };
    }
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = workTime.start.split(':').map(Number);
    const [eH, eM] = workTime.end.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (currentMin < startMin) {
      return {
        isOutside: true,
        message: `Office starts at ${workTime.start}. Punch-in is only allowed during working hours (${workTime.start} - ${workTime.end}).`,
      };
    }
    if (currentMin > endMin) {
      return {
        isOutside: true,
        message: `Office working hours are over (${workTime.start} - ${workTime.end}). Punch-in is closed for today.`,
      };
    }
    return { isOutside: false, message: '' };
  }, [workTime]);

  const workHoursStatus = checkWorkHours();
  const isOutsideWorkHours = !isPunchedIn && workHoursStatus.isOutside;
  const isOffDay = !isPunchedIn && (isSunday || isWeekOff || Boolean(holidayName));
  const isPunchBlocked = !isPunchedIn && (isOffDay || isOutsideWorkHours);

  const offDayReason = holidayName
    ? `Today is a Paid Holiday (${holidayName}). Punch-in is closed.`
    : isSunday
    ? 'Today is Sunday (Weekly Off). Staff cannot punch in today.'
    : isWeekOff
    ? `Today is ${weekOffDayName} (Weekly Off). Staff cannot punch in today.`
    : '';

  const handlePunch = async () => {
    if (isPunchBlocked) {
      setAlertMsg({
        type: 'warning',
        text: offDayReason || workHoursStatus.message || 'Punch-in is not allowed at this time.',
      });
      return;
    }

    setAlertMsg({ type: 'info', text: '' });
    try {
      setStep('locating');

      // Ensure fresh location
      let currentPos = location;
      const isFresh = location && Date.now() - location.at < 30000;
      if (!isFresh) {
        const freshPos = await acquireLocation();
        if (freshPos) currentPos = freshPos;
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
          ) : isOffDay ? (
            <Badge
              label={holidayName ? `Holiday: ${holidayName}` : `${weekOffDayName} · Weekly Off`}
              variant="warning"
              size="md"
            />
          ) : isOutsideWorkHours ? (
            <Badge
              label={`Outside Hours (${workTime.start} - ${workTime.end})`}
              variant="warning"
              size="md"
            />
          ) : (
            <Badge label="Not Punched In Today" variant="warning" size="md" />
          )}
        </View>

        {/* Off Day Banner (Sunday / Weekly Off / Holiday) */}
        {isOffDay ? (
          <View style={styles.offDayBox}>
            <MaterialCommunityIcons
              name={isSunday ? 'calendar-heart' : 'calendar-remove'}
              size={26}
              color="#b45309"
            />
            <View style={styles.offDayTextContainer}>
              <Text style={styles.offDayTitle}>
                {holidayName ? `Holiday: ${holidayName}` : `${weekOffDayName} - Weekly Off`}
              </Text>
              <Text style={styles.offDaySubtitle}>{offDayReason}</Text>
            </View>
          </View>
        ) : isOutsideWorkHours ? (
          <View style={styles.offDayBox}>
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={26}
              color="#b45309"
            />
            <View style={styles.offDayTextContainer}>
              <Text style={styles.offDayTitle}>
                Office Hours: {workTime.start} - {workTime.end}
              </Text>
              <Text style={styles.offDaySubtitle}>{workHoursStatus.message}</Text>
            </View>
          </View>
        ) : null}

        {alertMsg.text ? (
          <Alert type={alertMsg.type} style={styles.alertSpacing}>
            {alertMsg.text}
          </Alert>
        ) : null}

        {/* Interactive Geofence Map */}
        <PunchGeofenceMap
          userLocation={location}
          officeLocation={nearest?.location || mappableLocations[0]}
          allLocations={mappableLocations}
          isInside={nearest?.inside}
          distance={nearest?.distance}
          locationError={locationError}
          onRefreshLocation={acquireLocation}
          refreshing={refreshingLocation}
        />

        {/* Big Action Punch Button */}
        {!isPunchedOut ? (
          <Button
            title={
              isPunchBlocked
                ? holidayName
                  ? 'Punch Disabled (Holiday)'
                  : isOffDay
                  ? `Punch Disabled (${weekOffDayName})`
                  : 'Punch Disabled (Outside Work Hours)'
                : step === 'locating'
                ? 'Acquiring GPS...'
                : step === 'saving'
                ? 'Saving Attendance...'
                : isPunchedIn
                ? 'Punch Out'
                : 'Punch In'
            }
            onPress={handlePunch}
            variant={isPunchedIn ? 'danger' : isPunchBlocked ? 'secondary' : 'primary'}
            size="lg"
            loading={Boolean(step)}
            disabled={Boolean(step) || isPunchBlocked}
            icon={
              isOutsideWorkHours
                ? 'clock-alert-outline'
                : isOffDay
                ? 'calendar-remove'
                : isPunchedIn
                ? 'logout'
                : 'login'
            }
            iconPlacement="start"
            style={[styles.bigPunchBtn, isPunchBlocked && styles.disabledOffDayBtn]}
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
  disabledOffDayBtn: {
    opacity: 0.75,
    backgroundColor: '#e2e8f0',
  },
  offDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    marginVertical: 10,
  },
  offDayTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  offDayTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#b45309',
  },
  offDaySubtitle: {
    fontSize: typography.sizes.xs,
    color: '#92400e',
    marginTop: 2,
    lineHeight: 16,
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
    fontSize: 12,
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
