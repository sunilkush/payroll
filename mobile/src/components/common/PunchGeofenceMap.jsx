import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Badge from './Badge.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

let NativeMapView = null;
let NativeMarker = null;
let NativeCircle = null;
let NativePolyline = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default || Maps;
    NativeMarker = Maps.Marker || Maps.default?.Marker;
    NativeCircle = Maps.Circle || Maps.default?.Circle;
    NativePolyline = Maps.Polyline || Maps.default?.Polyline;
  } catch (e) {
    console.warn('react-native-maps module not available:', e.message);
  }
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('Native MapView error in PunchGeofenceMap:', err);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const DEFAULT_OFFICE_LAT = 28.6139;
const DEFAULT_OFFICE_LNG = 77.209;

export default function PunchGeofenceMap({
  userLocation,
  officeLocation,
  allLocations = [],
  isInside,
  distance,
  locationError,
  onRefreshLocation,
  refreshing,
  style,
}) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Parse office coordinates
  const officeLat = Number.isFinite(officeLocation?.lat)
    ? officeLocation.lat
    : DEFAULT_OFFICE_LAT;
  const officeLng = Number.isFinite(officeLocation?.lng)
    ? officeLocation.lng
    : DEFAULT_OFFICE_LNG;
  const officeRadius = Math.max(10, parseInt(officeLocation?.radius, 10) || 100);
  const officeName = officeLocation?.name || 'Office Branch';

  // Parse user coordinates
  const hasUser =
    userLocation &&
    Number.isFinite(userLocation.lat) &&
    Number.isFinite(userLocation.lng);
  const userLat = hasUser ? userLocation.lat : null;
  const userLng = hasUser ? userLocation.lng : null;
  const userAccuracy = Math.round(userLocation?.accuracy || 10);

  // Animated pulse for radar sweep
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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

  // Compute bounding region
  const region = useMemo(() => {
    if (hasUser) {
      const midLat = (userLat + officeLat) / 2;
      const midLng = (userLng + officeLng) / 2;
      const latDelta = Math.max(0.004, Math.abs(userLat - officeLat) * 1.9);
      const lngDelta = Math.max(0.004, Math.abs(userLng - officeLng) * 1.9);
      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.min(latDelta, 0.08),
        longitudeDelta: Math.min(lngDelta, 0.08),
      };
    }
    return {
      latitude: officeLat,
      longitude: officeLng,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    };
  }, [hasUser, userLat, userLng, officeLat, officeLng]);

  // Auto-fit to both user & office when coordinates change
  useEffect(() => {
    if (mapReady && mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  }, [region, mapReady]);

  const fitBoth = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 400);
    }
  };

  const centerOnUser = () => {
    if (mapRef.current && hasUser) {
      mapRef.current.animateToRegion(
        {
          latitude: userLat,
          longitude: userLng,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        },
        400
      );
    } else if (onRefreshLocation) {
      onRefreshLocation();
    }
  };

  const openGoogleMaps = () => {
    let url = '';
    if (hasUser) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${officeLat},${officeLng}&origin=${userLat},${userLng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${officeLat},${officeLng}`;
    }
    Linking.openURL(url).catch((err) => console.warn('Could not open Maps:', err));
  };

  const formattedDistance = useMemo(() => {
    if (distance == null || !Number.isFinite(distance)) return null;
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(2)}km`;
  }, [distance]);

  // Fallback interactive radar view (when native maps unavailable)
  const renderRadarFallback = () => {
    return (
      <View style={styles.fallbackCanvas}>
        {/* Animated Radial Radar Rings */}
        <View style={styles.fallbackRadarWrapper}>
          <View
            style={[
              styles.fallbackCircleOuter,
              { borderColor: isInside ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)' },
            ]}
          />
          <View
            style={[
              styles.fallbackCircleMid,
              {
                backgroundColor: isInside ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                borderColor: isInside ? '#10B981' : '#EF4444',
              },
            ]}
          />

          {/* Central Office Marker */}
          <View style={styles.fallbackOfficeNode}>
            <MaterialCommunityIcons name="office-building" size={20} color="#FFFFFF" />
          </View>

          {/* User Node on Radar */}
          {hasUser && (
            <Animated.View
              style={[
                styles.fallbackUserNode,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: isInside ? colors.success : colors.danger,
                  // Position node based on inside/outside state
                  top: isInside ? '36%' : '14%',
                  right: isInside ? '34%' : '20%',
                },
              ]}
            >
              <MaterialCommunityIcons name="account" size={14} color="#FFFFFF" />
            </Animated.View>
          )}
        </View>

        {/* Radar Info Box */}
        <View style={styles.fallbackInfoBox}>
          <View style={styles.fallbackTitleRow}>
            <MaterialCommunityIcons
              name={isInside ? 'shield-check' : locationError ? 'alert-circle' : 'crosshairs-gps'}
              size={18}
              color={isInside ? colors.success : locationError ? colors.danger : colors.primary}
            />
            <Text style={styles.fallbackTitle}>
              {locationError
                ? 'Location Error'
                : isInside
                ? 'Within Office Geofence'
                : hasUser
                ? 'Outside Geofence Perimeter'
                : 'Acquiring GPS Position...'}
            </Text>
          </View>
          <Text style={styles.fallbackSubtitle}>
            {officeName} • Allowed Radius: {officeRadius}m
          </Text>
          {formattedDistance && (
            <Text style={styles.fallbackDistText}>
              Current Distance: {formattedDistance}{' '}
              {isInside ? '(Eligible to Punch)' : `(Exceeds ${officeRadius}m limit)`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Top Floating Badge Bar */}
      <View style={styles.topOverlayBar}>
        <View style={styles.statusPillWrapper}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isInside
                  ? colors.success
                  : locationError
                  ? colors.danger
                  : colors.warning,
              },
            ]}
          />
          <Text style={styles.statusPillText} numberOfLines={1}>
            {locationError
              ? 'GPS Error'
              : isInside
              ? `In Geofence (${formattedDistance || '0m'})`
              : formattedDistance
              ? `${formattedDistance} to ${officeName}`
              : 'Locating Device...'}
          </Text>
        </View>

        <View style={styles.topActionsRow}>
          {hasUser && (
            <TouchableOpacity
              style={styles.mapIconBtn}
              onPress={fitBoth}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons name="fit-to-page-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.mapIconBtn}
            onPress={centerOnUser}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Map Box */}
      <View style={styles.mapFrame}>
        <MapErrorBoundary fallback={renderRadarFallback()}>
          {NativeMapView && NativeMarker && NativeCircle ? (
            <NativeMapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              onMapReady={() => setMapReady(true)}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {/* Other Company Branches (if any) */}
              {allLocations.map((loc, idx) => {
                if (loc.lat === officeLat && loc.lng === officeLng) return null;
                return (
                  <NativeMarker
                    key={loc._id || `branch_${idx}`}
                    coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                    title={loc.name}
                    description={`Radius: ${loc.radius}m`}
                  >
                    <View style={styles.branchMarker}>
                      <MaterialCommunityIcons name="office-building" size={14} color="#FFFFFF" />
                    </View>
                  </NativeMarker>
                );
              })}

              {/* Nearest Office Center Marker */}
              <NativeMarker
                coordinate={{ latitude: officeLat, longitude: officeLng }}
                title={officeName}
                description={`Geofence radius: ${officeRadius}m`}
              >
                <View style={styles.officeMarkerContainer}>
                  <View
                    style={[
                      styles.officeMarkerCircle,
                      { backgroundColor: isInside ? colors.success : colors.primary },
                    ]}
                  >
                    <MaterialCommunityIcons name="office-building" size={18} color="#FFFFFF" />
                  </View>
                  <View
                    style={[
                      styles.officeMarkerTail,
                      { borderTopColor: isInside ? colors.success : colors.primary },
                    ]}
                  />
                </View>
              </NativeMarker>

              {/* Geofence Perimeter Circle */}
              <NativeCircle
                center={{ latitude: officeLat, longitude: officeLng }}
                radius={officeRadius}
                strokeColor={isInside ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.85)'}
                fillColor={isInside ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.15)'}
                strokeWidth={2}
              />

              {/* Connecting Path / Distance Polyline */}
              {NativePolyline && hasUser && (
                <NativePolyline
                  coordinates={[
                    { latitude: userLat, longitude: userLng },
                    { latitude: officeLat, longitude: officeLng },
                  ]}
                  strokeColor={isInside ? 'rgba(16, 185, 129, 0.8)' : 'rgba(100, 116, 139, 0.7)'}
                  strokeWidth={2}
                  lineDashPattern={[5, 5]}
                />
              )}

              {/* User Live GPS Marker */}
              {hasUser && (
                <NativeMarker
                  coordinate={{ latitude: userLat, longitude: userLng }}
                  title="Your Location"
                  description={`Accuracy: ±${userAccuracy}m`}
                >
                  <View style={styles.userMarkerContainer}>
                    <Animated.View
                      style={[
                        styles.userMarkerPulse,
                        {
                          transform: [{ scale: pulseAnim }],
                          backgroundColor: isInside
                            ? 'rgba(16, 185, 129, 0.28)'
                            : 'rgba(59, 130, 246, 0.28)',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.userMarkerDot,
                        { backgroundColor: isInside ? colors.success : colors.primary },
                      ]}
                    >
                      <MaterialCommunityIcons name="account" size={13} color="#FFFFFF" />
                    </View>
                  </View>
                </NativeMarker>
              )}
            </NativeMapView>
          ) : (
            renderRadarFallback()
          )}
        </MapErrorBoundary>
      </View>

      {/* Bottom Footer Details */}
      <View style={styles.footerRow}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerBranchName} numberOfLines={1}>
            {officeName}
          </Text>
          <Text style={styles.footerMeta}>
            Radius: {officeRadius}m • GPS: ±{userAccuracy}m
          </Text>
        </View>

        <TouchableOpacity
          style={styles.openMapsBtn}
          onPress={openGoogleMaps}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="google-maps" size={16} color={colors.primary} />
          <Text style={styles.openMapsText}>Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    ...shadows.sm,
  },
  topOverlayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusPillWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapIconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  mapFrame: {
    width: '100%',
    height: 220,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Office Marker Callout
  officeMarkerContainer: {
    alignItems: 'center',
  },
  officeMarkerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.md,
  },
  officeMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  branchMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // User Marker Callout
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userMarkerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.sm,
  },

  // Fallback Radar Canvas
  fallbackCanvas: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackRadarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  fallbackCircleOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  fallbackCircleMid: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
  },
  fallbackOfficeNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.md,
  },
  fallbackUserNode: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  fallbackInfoBox: {
    alignItems: 'center',
  },
  fallbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#F8FAFC',
  },
  fallbackSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  fallbackDistText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: '#38BDF8',
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerInfo: {
    flex: 1,
    marginRight: 10,
  },
  footerBranchName: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  footerMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  openMapsText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
});
