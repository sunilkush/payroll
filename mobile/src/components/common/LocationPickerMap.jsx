import React, { Component, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Badge from './Badge.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

let NativeMapView = null;
let NativeMarker = null;
let NativeCircle = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default || Maps;
    NativeMarker = Maps.Marker || Maps.default?.Marker;
    NativeCircle = Maps.Circle || Maps.default?.Circle;
  } catch (e) {
    console.warn('react-native-maps native module not available:', e.message);
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
    console.warn('Native MapView error caught by boundary, falling back to radar view:', err);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const DEFAULT_LAT = 28.6139; // New Delhi
const DEFAULT_LNG = 77.209;

export default function LocationPickerMap({
  lat,
  lng,
  radius = 100,
  onPick,
  onRadiusChange,
  onAddressResolved,
}) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const numLat = !isNaN(parsedLat) && isFinite(parsedLat) ? parsedLat : DEFAULT_LAT;
  const numLng = !isNaN(parsedLng) && isFinite(parsedLng) ? parsedLng : DEFAULT_LNG;
  const numRadius = Math.max(10, parseInt(radius, 10) || 100);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);

  const region = {
    latitude: numLat,
    longitude: numLng,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };

  useEffect(() => {
    if (mapRef.current && NativeMapView) {
      mapRef.current.animateToRegion(
        {
          latitude: numLat,
          longitude: numLng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      );
    }
  }, [numLat, numLng]);

  // Search Address / Place via Nominatim & Expo Location
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');

    try {
      let coords = null;
      let placeName = '';

      // 1. Try Expo geocodeAsync
      try {
        const geoResults = await Location.geocodeAsync(q);
        if (geoResults && geoResults.length > 0) {
          coords = {
            latitude: geoResults[0].latitude,
            longitude: geoResults[0].longitude,
          };
        }
      } catch (err) {
        // Fallback to OpenStreetMap
      }

      // 2. OpenStreetMap Nominatim fallback (global, free)
      if (!coords) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(
          q
        )}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'PayRoster-MobileApp/1.0' },
        });
        const data = await res.json();
        if (data && data.length > 0) {
          coords = {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
          placeName = data[0].display_name;
        }
      }

      if (coords) {
        if (onPick) onPick(coords.latitude.toFixed(6), coords.longitude.toFixed(6));
        if (placeName && onAddressResolved) {
          onAddressResolved(placeName);
        }
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.006,
              longitudeDelta: 0.006,
            },
            600
          );
        }
      } else {
        setSearchError('Address not found. Please try a landmark, city or tap on the map.');
      }
    } catch (err) {
      setSearchError('Search failed. Please tap directly on the map or use GPS.');
    } finally {
      setSearching(false);
    }
  };

  // Capture Current Phone GPS Location
  const handleUseGps = async () => {
    setLocating(true);
    setSearchError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        NativeAlert.alert(
          'Permission Denied',
          'Location permission is required to detect your office GPS coordinates.'
        );
        return;
      }

      let pos = null;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (e) {
        pos = await Location.getLastKnownPositionAsync();
      }

      if (pos && pos.coords) {
        const cLat = pos.coords.latitude.toFixed(6);
        const cLng = pos.coords.longitude.toFixed(6);
        if (onPick) onPick(cLat, cLng);

        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            600
          );
        }

        // Reverse geocode to suggest branch name
        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (rev && rev[0] && onAddressResolved) {
            const p = rev[0];
            const nameParts = [p.name, p.street, p.subregion, p.city].filter(Boolean);
            if (nameParts.length > 0) {
              onAddressResolved(nameParts.join(', '));
            }
          }
        } catch (e) {}
      } else {
        NativeAlert.alert(
          'GPS Signal Weak',
          'Could not lock GPS location. Please ensure location services are turned on.'
        );
      }
    } catch (err) {
      NativeAlert.alert('GPS Error', err.message || 'Unable to retrieve phone location.');
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = (e) => {
    const coordinate = e.nativeEvent?.coordinate;
    if (coordinate && onPick) {
      onPick(coordinate.latitude.toFixed(6), coordinate.longitude.toFixed(6));
    }
  };

  const handleMarkerDragEnd = (e) => {
    const coordinate = e.nativeEvent?.coordinate;
    if (coordinate && onPick) {
      onPick(coordinate.latitude.toFixed(6), coordinate.longitude.toFixed(6));
    }
  };

  const RADIUS_PRESETS = [50, 100, 200, 500];

  const renderRadarFallback = () => (
    <View style={styles.fallbackMap}>
      <View style={styles.radarCenter}>
        <View
          style={[
            styles.radarCircle,
            {
              width: Math.min(220, 80 + numRadius * 0.25),
              height: Math.min(220, 80 + numRadius * 0.25),
              borderRadius: Math.min(110, 40 + numRadius * 0.125),
            },
          ]}
        />
        <View style={styles.markerCircle}>
          <MaterialCommunityIcons name="office-building" size={20} color="#FFFFFF" />
        </View>
      </View>
      <Text style={styles.fallbackMapText}>
        Office Location Pin at {numLat.toFixed(5)}, {numLng.toFixed(5)}
      </Text>
      <Text style={styles.fallbackSubText}>
        Geofence Radius: {numRadius} meters around this coordinate
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 1. Address Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, area or landmark..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={handleSearch}
          disabled={searching}
          activeOpacity={0.8}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.searchBtnText}>Find</Text>
          )}
        </TouchableOpacity>
      </View>

      {searchError ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      ) : null}

      {/* 2. Interactive Map Container */}
      <View style={styles.mapFrame}>
        <MapErrorBoundary fallback={renderRadarFallback()}>
          {NativeMapView && NativeMarker && NativeCircle ? (
            <NativeMapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              onPress={handleMapPress}
              onMapReady={() => setMapReady(true)}
              showsUserLocation
              showsMyLocationButton={false}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {/* Office Center Marker */}
              <NativeMarker
                coordinate={{ latitude: numLat, longitude: numLng }}
                draggable
                onDragEnd={handleMarkerDragEnd}
                title="Office Geofence Center"
                description={`Radius: ${numRadius}m`}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerCircle}>
                    <MaterialCommunityIcons name="office-building" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.markerTail} />
                </View>
              </NativeMarker>

              {/* Geofence Perimeter Circle */}
              <NativeCircle
                center={{ latitude: numLat, longitude: numLng }}
                radius={numRadius}
                strokeColor="rgba(37, 99, 235, 0.85)"
                fillColor="rgba(37, 99, 235, 0.18)"
                strokeWidth={2}
              />
            </NativeMapView>
          ) : (
            renderRadarFallback()
          )}
        </MapErrorBoundary>

        {/* Floating Quick Action: GPS Location Button */}
        <TouchableOpacity
          style={styles.gpsFloatingBtn}
          onPress={handleUseGps}
          disabled={locating}
          activeOpacity={0.85}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
              <Text style={styles.gpsFloatingText}>My GPS</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Floating Hint Overlay */}
        <View style={styles.mapHintBadge}>
          <MaterialCommunityIcons name="gesture-tap" size={14} color="#FFFFFF" />
          <Text style={styles.mapHintText}>Tap map or drag pin to position office</Text>
        </View>
      </View>

      {/* 3. Radius Quick Presets */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>Geofence Radius:</Text>
        <View style={styles.presetsWrap}>
          {RADIUS_PRESETS.map((p) => {
            const isSelected = numRadius === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                onPress={() => onRadiusChange && onRadiusChange(String(p))}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {p}m
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Active Coordinates Badge */}
      <View style={styles.coordsBadge}>
        <View style={styles.coordsLeft}>
          <MaterialCommunityIcons name="map-marker-check" size={20} color={colors.success} />
          <View>
            <Text style={styles.coordsTitle}>Target Coordinates Locked</Text>
            <Text style={styles.coordsValue}>
              {numLat.toFixed(6)}, {numLng.toFixed(6)} • ±{numRadius}m
            </Text>
          </View>
        </View>
        <Badge label="Validated" variant="success" size="sm" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  mapFrame: {
    width: '100%',
    height: 250,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    ...shadows.sm,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCircle: {
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
  markerTail: {
    width: 4,
    height: 6,
    backgroundColor: colors.primary,
  },
  gpsFloatingBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.md,
  },
  gpsFloatingText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  mapHintBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
  },
  mapHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  fallbackMap: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  radarCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  radarCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  fallbackMapText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  fallbackSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  presetsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  coordsBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: borderRadius.lg,
    padding: 10,
    marginTop: 10,
  },
  coordsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  coordsTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#166534',
  },
  coordsValue: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 1,
  },
});
