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
import { borderRadius, colors, radius, shadows, spacing, typography } from '../../theme/index.js';
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

function LiveWorkingTimer({ isWorking, baseMinutes = 0, lastInTime, requiredMinutes = 510 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isWorking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isWorking]);

  const openSeconds = isWorking && lastInTime
    ? Math.max(0, Math.floor((now - new Date(lastInTime).getTime()) / 1000))
    : 0;

  const totalWorkedSeconds = baseMinutes * 60 + openSeconds;
  const requiredSeconds = requiredMinutes * 60;
  const remainingSeconds = Math.max(0, requiredSeconds - totalWorkedSeconds);

  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const formatSecs = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  };

  const reqH = pad(Math.floor(requiredMinutes / 60));
  const reqM = pad(requiredMinutes % 60);

  return (
    <View style={styles.liveTimerContainer}>
      <View style={styles.liveTimerHeader}>
        <View style={styles.liveIndicatorRow}>
          {isWorking ? (
            <View style={styles.livePulseDot} />
          ) : (
            <View style={[styles.livePulseDot, { backgroundColor: '#94a3b8' }]} />
          )}
          <Text style={styles.liveTimerTitle}>
            {isWorking ? 'NET WORKING TIME (LIVE)' : 'ACCUMULATED WORK TIME'}
          </Text>
        </View>
        <Text style={styles.liveStatusTag}>
          {isWorking ? 'IN OFFICE' : 'ON BREAK / OUT'}
        </Text>
      </View>

      <Text style={styles.liveTimerDisplay}>{formatSecs(totalWorkedSeconds)}</Text>

      <View style={styles.liveTimerStatsRow}>
        <View style={styles.liveStatBox}>
          <Text style={styles.liveStatLabel}>Required Goal</Text>
          <Text style={styles.liveStatVal}>{reqH}:{reqM}:00</Text>
        </View>
        <View style={styles.liveStatDivider} />
        <View style={styles.liveStatBox}>
          <Text style={styles.liveStatLabel}>Remaining</Text>
          <Text
            style={[
              styles.liveStatVal,
              { color: remainingSeconds === 0 ? colors.success : '#d97706' },
            ]}
          >
            {remainingSeconds === 0 ? 'Goal Met!' : formatSecs(remainingSeconds)}
          </Text>
        </View>
      </View>
    </View>
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
  const metrics = todayData?.metrics;
  const workingHoursConfig = todayData?.workingHoursConfig;
  const workTime = todayData?.workTime;

  // Multi-punch parsing
  const punches = attendance?.punches?.length
    ? attendance.punches
    : attendance?.punchIn
    ? [
        { ...attendance.punchIn, type: 'IN' },
        ...(attendance.punchOut ? [{ ...attendance.punchOut, type: 'OUT' }] : []),
      ]
    : [];

  const lastPunch = punches.length > 0 ? punches[punches.length - 1] : null;
  const isCurrentlyWorking = metrics?.isCurrentlyWorking ?? (lastPunch?.type === 'IN');
  const hasStartedDay = punches.length > 0;

  // Find last IN punch for ticker
  const lastInPunch = [...punches].reverse().find((p) => p.type === 'IN');

  const isSunday = Boolean(todayData?.isSunday);
  const isWeekOff = Boolean(todayData?.isWeekOff);
  const weekOffDayName = todayData?.weekOffDayName || (isSunday ? 'Sunday' : 'Weekly Off');
  const holidayName = todayData?.holidayName;

  // Work hours check (only applies if employee hasn't started their day yet)
  const checkWorkHours = useCallback(() => {
    const config = workingHoursConfig || workTime;
    if (!config?.workTimeEnabled && !config?.enabled) {
      return { isOutside: false, message: '' };
    }
    const startStr = config?.workStartTime || config?.start;
    const endStr = config?.workEndTime || config?.end;
    if (!startStr || !endStr) return { isOutside: false, message: '' };

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (currentMin < startMin) {
      return {
        isOutside: true,
        message: `Office starts at ${startStr}. Punch-in is allowed during (${startStr} - ${endStr}).`,
      };
    }
    if (currentMin > endMin) {
      return {
        isOutside: true,
        message: `Office working hours are over (${startStr} - ${endStr}).`,
      };
    }
    return { isOutside: false, message: '' };
  }, [workingHoursConfig, workTime]);

  const workHoursStatus = checkWorkHours();
  const isOutsideWorkHours = !hasStartedDay && workHoursStatus.isOutside;
  const isOffDay = !hasStartedDay && (isSunday || isWeekOff || Boolean(holidayName));
  const isPunchBlocked = !hasStartedDay && (isOffDay || isOutsideWorkHours);

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

      const res = await (isCurrentlyWorking ? punchOutApi(payload) : punchInApi(payload));

      setAlertMsg({
        type: 'success',
        text: isCurrentlyWorking
          ? 'Punched out successfully! Break / End recorded.'
          : 'Punched in successfully! Net work time is now tracking.',
      });

      // Refetch full today data including recalculations
      await fetchToday();
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
        <Header title="Smart Attendance & Punch" />
        <Alert type="error">{loadError}</Alert>
        <Button title="Try Again" onPress={fetchToday} />
      </ScreenWrapper>
    );
  }

  const currentDateObj = todayData?.date ? new Date(`${todayData.date}T00:00:00`) : new Date();
  const dayName = WEEKDAYS[currentDateObj.getDay()];

  // Attendance status badge label
  let statusBadgeLabel = 'Not Punched In Today';
  let statusBadgeVariant = 'warning';

  const effectiveStatus = attendance?.status || metrics?.status;

  if (isOffDay) {
    statusBadgeLabel = holidayName ? `Holiday: ${holidayName}` : `${weekOffDayName} · Weekly Off`;
    statusBadgeVariant = 'warning';
  } else if (effectiveStatus === 'LEAVE') {
    statusBadgeLabel = 'On Leave';
    statusBadgeVariant = 'info';
  } else if (effectiveStatus === 'ABSENT') {
    statusBadgeLabel = metrics?.subStatus === 'EARLY_DEPARTURE_ABSENT' ? 'Absent (Early Departure < 4:30 PM)' : 'Absent';
    statusBadgeVariant = 'danger';
  } else if (effectiveStatus === 'PRESENT' || metrics?.subStatus === 'COMPLETED') {
    statusBadgeLabel = 'Full Day Present (Goal Reached)';
    statusBadgeVariant = 'success';
  } else if (effectiveStatus === 'PENDING') {
    statusBadgeLabel = isCurrentlyWorking ? 'Pending (In Progress)' : 'Pending (Session Paused)';
    statusBadgeVariant = 'primary';
  } else if (effectiveStatus === 'HALF_DAY' || metrics?.subStatus === 'HALF_DAY_FINALIZED') {
    statusBadgeLabel = 'Half Day Recorded';
    statusBadgeVariant = 'warning';
  } else if (metrics?.subStatus === 'HALF_DAY_ELIGIBLE') {
    statusBadgeLabel = 'Half Day Eligible / Working';
    statusBadgeVariant = 'warning';
  } else if (isCurrentlyWorking) {
    statusBadgeLabel = 'Currently Punched In (Working)';
    statusBadgeVariant = 'primary';
  } else if (hasStartedDay) {
    statusBadgeLabel = 'On Break (Punched Out)';
    statusBadgeVariant = 'secondary';
  }

  const firstInTime = metrics?.firstIn || attendance?.punchIn?.time;
  const lastOutTime = metrics?.lastOut || (isCurrentlyWorking ? null : attendance?.punchOut?.time);

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Smart Attendance & Punch"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="refresh"
        onRightPress={() => {
          fetchToday();
          acquireLocation();
        }}
      />

      {/* Main Dashboard Card */}
      <Card style={styles.mainCard} elevation="md">
        <Text style={styles.dateLabel}>
          {dayName}, {formatDate(todayData?.date || new Date())}
        </Text>
        <LiveClock />

        {/* Status Badge */}
        <View style={styles.statusBadgeWrapper}>
          <Badge label={statusBadgeLabel} variant={statusBadgeVariant} size="md" />
        </View>

        {/* Live Working Hours Counter */}
        <LiveWorkingTimer
          isWorking={isCurrentlyWorking}
          baseMinutes={metrics?.completedWorkMinutes || 0}
          lastInTime={lastInPunch?.time}
          requiredMinutes={metrics?.requiredWorkMinutes || workingHoursConfig?.requiredWorkMinutes || 510}
        />

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
                Office Working Hours: {workingHoursConfig?.workStartTime || '09:30'} - {workingHoursConfig?.workEndTime || '18:30'}
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
              : isCurrentlyWorking
              ? 'Punch Out (Break / Leave)'
              : hasStartedDay
              ? 'Punch In (Resume Work)'
              : 'Punch In'
          }
          onPress={handlePunch}
          variant={isCurrentlyWorking ? 'danger' : isPunchBlocked ? 'secondary' : 'primary'}
          size="lg"
          loading={Boolean(step)}
          disabled={Boolean(step) || isPunchBlocked}
          icon={
            isOutsideWorkHours
              ? 'clock-alert-outline'
              : isOffDay
              ? 'calendar-remove'
              : isCurrentlyWorking
              ? 'logout'
              : 'login'
          }
          iconPlacement="start"
          style={[styles.bigPunchBtn, isPunchBlocked && styles.disabledOffDayBtn]}
        />

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="login" size={20} color={colors.success} />
            <Text style={styles.metricLabel}>First In</Text>
            <Text style={styles.metricVal}>
              {firstInTime ? formatTime(firstInTime) : '--:--'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
            <Text style={styles.metricLabel}>Last Out</Text>
            <Text style={styles.metricVal}>
              {lastOutTime ? formatTime(lastOutTime) : isCurrentlyWorking ? 'Working...' : '--:--'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="coffee" size={20} color={colors.warning} />
            <Text style={styles.metricLabel}>Lunch / Break</Text>
            <Text style={styles.metricVal}>
              {metrics ? `${metrics.totalBreakMinutes || 0}m` : '0m'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="history" size={20} color={colors.primary} />
            <Text style={styles.metricLabel}>Total Punches</Text>
            <Text style={styles.metricVal}>
              {punches.length} {punches.length === 1 ? 'Event' : 'Events'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={20}
              color={effectiveStatus === 'ABSENT' ? colors.error : colors.primary}
            />
            <Text style={styles.metricLabel}>Final Status</Text>
            <Text style={styles.metricVal}>
              {effectiveStatus === 'PRESENT'
                ? 'Present'
                : effectiveStatus === 'ABSENT'
                ? 'Absent'
                : effectiveStatus === 'PENDING'
                ? 'Pending'
                : effectiveStatus === 'LEAVE'
                ? 'On Leave'
                : effectiveStatus || 'Not Marked'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={20}
              color={nearest?.inside ? colors.success : colors.warning}
            />
            <Text style={styles.metricLabel}>GPS Status</Text>
            <Text style={styles.metricVal}>
              {nearest ? (nearest.inside ? 'Verified' : 'Out of Range') : 'Locating...'}
            </Text>
          </View>
        </View>

        {/* Punch History Timeline */}
        {punches.length > 0 && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <MaterialCommunityIcons name="format-list-bulleted" size={18} color={colors.text} />
              <Text style={styles.timelineTitle}>Today's Punch Events ({punches.length})</Text>
            </View>
            {punches.map((p, idx) => {
              const isPunchIn = p.type === 'IN';
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineIconBadge,
                      { backgroundColor: isPunchIn ? colors.successContainer : colors.errorContainer },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isPunchIn ? 'login' : 'logout'}
                      size={16}
                      color={isPunchIn ? colors.onSuccessContainer : colors.onErrorContainer}
                    />
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineType}>
                        Punch #{idx + 1}: {isPunchIn ? 'Punch In' : 'Punch Out'}
                      </Text>
                      <Text style={styles.timelineTime}>{formatTime(p.time)}</Text>
                    </View>
                    <Text style={styles.timelineLocation}>
                      {p.locationName || 'Office'} · {p.distance != null ? `${p.distance}m` : 'GPS Verified'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    fontSize: 38,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -1,
    marginVertical: 4,
  },
  statusBadgeWrapper: {
    marginVertical: 8,
  },
  alertSpacing: {
    width: '100%',
    marginVertical: 8,
  },
  liveTimerContainer: {
    width: '100%',
    backgroundColor: colors.text,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  liveTimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  liveTimerTitle: {
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  liveStatusTag: {
    fontSize: typography.sizes.caption,
    color: colors.info,
    fontWeight: typography.weights.semibold,
  },
  liveTimerDisplay: {
    fontSize: 34,
    fontWeight: typography.weights.bold,
    color: '#f8fafc',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  liveTimerStatsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  liveStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  liveStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  liveStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  liveStatVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#f8fafc',
    fontVariant: ['tabular-nums'],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metricVal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  timelineCard: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight || '#f1f5f9',
  },
  timelineIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineType: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  timelineTime: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  timelineLocation: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  bigPunchBtn: {
    width: '100%',
    marginVertical: 12,
  },
  disabledOffDayBtn: {
    opacity: 0.75,
    backgroundColor: colors.border,
  },
  offDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningContainer,
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    marginVertical: spacing.sm,
  },
  offDayTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  offDayTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  offDaySubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.onWarningContainer,
    marginTop: 2,
    lineHeight: 16,
  },
});
