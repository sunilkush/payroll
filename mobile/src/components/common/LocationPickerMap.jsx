import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { WebView } from 'react-native-webview';
import Badge from './Badge.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

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
  const [mapLoading, setMapLoading] = useState(true);

  const webViewRef = useRef(null);

  // Sync external coordinate changes to the Leaflet Map
  useEffect(() => {
    if (webViewRef.current) {
      const script = `
        if (typeof updateMapLocation === 'function') {
          updateMapLocation(${numLat}, ${numLng}, ${numRadius});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [numLat, numLng, numRadius]);

  // OpenStreetMap Nominatim Free Search
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

      // 2. OpenStreetMap Nominatim (Global Free Search)
      if (!coords) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'PayRoster-App/1.0 (info@payroster.com)' },
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
        if (webViewRef.current) {
          const script = `
            if (typeof updateMapLocation === 'function') {
              updateMapLocation(${coords.latitude}, ${coords.longitude}, ${numRadius});
            }
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
      } else {
        setSearchError('Address not found on OpenStreetMap. Try searching a city, landmark or tap on the map.');
      }
    } catch (err) {
      setSearchError('Search failed. Please tap directly on the map or use phone GPS.');
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
          'Location Permission Denied',
          'Please allow location access in your device settings to detect office coordinates.'
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

        if (webViewRef.current) {
          const script = `
            if (typeof updateMapLocation === 'function') {
              updateMapLocation(${pos.coords.latitude}, ${pos.coords.longitude}, ${numRadius});
            }
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }

        // Reverse geocode to resolve address
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
        NativeAlert.alert('GPS Signal Weak', 'Unable to retrieve phone location coordinates.');
      }
    } catch (err) {
      NativeAlert.alert('GPS Error', err.message || 'Location retrieval failed.');
    } finally {
      setLocating(false);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'onPick') {
        if (onPick) onPick(payload.lat, payload.lng);
      }
    } catch (err) {
      // JSON parse error
    }
  };

  // 100% Free OpenStreetMap + Leaflet HTML template
  const leafletHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { -webkit-tap-highlight-color: transparent; }
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #F8FAFC;
          }
          .custom-office-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: #2563EB;
            border: 3px solid #FFFFFF;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4);
          }
          .custom-office-pin-inner {
            width: 12px;
            height: 12px;
            background: #FFFFFF;
            border-radius: 50%;
            transform: rotate(45deg);
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
            border-radius: 8px !important;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var lat = ${numLat};
          var lng = ${numLng};
          var radius = ${numRadius};

          var map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([lat, lng], 16);

          // Free OpenStreetMap Tile Layer (No API Key Required)
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var officeIcon = L.divIcon({
            className: '',
            iconSize: [38, 38],
            iconAnchor: [19, 38],
            html: '<div class="custom-office-pin"><div class="custom-office-pin-inner"></div></div>'
          });

          var marker = L.marker([lat, lng], {
            draggable: true,
            icon: officeIcon
          }).addTo(map);

          var circle = L.circle([lat, lng], {
            radius: radius,
            color: '#2563EB',
            fillColor: '#3B82F6',
            fillOpacity: 0.18,
            weight: 2
          }).addTo(map);

          function sendLocation(nLat, nLng) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'onPick',
                lat: Number(nLat).toFixed(6),
                lng: Number(nLng).toFixed(6)
              }));
            }
          }

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            circle.setLatLng(e.latlng);
            sendLocation(e.latlng.lat, e.latlng.lng);
          });

          marker.on('dragend', function() {
            var pos = marker.getLatLng();
            circle.setLatLng(pos);
            sendLocation(pos.lat, pos.lng);
          });

          window.updateMapLocation = function(newLat, newLng, newRadius) {
            var nL = parseFloat(newLat);
            var nG = parseFloat(newLng);
            var nR = parseFloat(newRadius);
            if (!isNaN(nL) && !isNaN(nG)) {
              marker.setLatLng([nL, nG]);
              circle.setLatLng([nL, nG]);
              map.panTo([nL, nG], { animate: true });
            }
            if (!isNaN(nR)) {
              circle.setRadius(nR);
            }
          };
        </script>
      </body>
      </html>
    `;
  }, []);

  const RADIUS_PRESETS = [50, 100, 200, 500];

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

      {/* 2. Interactive Free OpenStreetMap View */}
      <View style={styles.mapFrame}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          onMessage={handleWebViewMessage}
          onLoadEnd={() => setMapLoading(false)}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading Free OpenStreetMap...</Text>
            </View>
          )}
        />

        {/* Floating Quick GPS & Help Pill */}
        <TouchableOpacity
          style={styles.gpsFloatingBtn}
          onPress={handleUseGps}
          disabled={locating}
          activeOpacity={0.85}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
          )}
          <Text style={styles.gpsFloatingBtnText}>
            {locating ? 'Detecting GPS...' : 'Use Phone Location'}
          </Text>
        </TouchableOpacity>

        {/* Free Map Provider Badge */}
        <View style={styles.providerBadge}>
          <MaterialCommunityIcons name="map-check-outline" size={12} color="#059669" />
          <Text style={styles.providerBadgeText}>OpenStreetMap • 100% Free</Text>
        </View>
      </View>

      {/* 3. Coordinates & Radius Control Bar */}
      <View style={styles.metaControlBar}>
        <View style={styles.coordsDisplay}>
          <Text style={styles.coordsLabel}>Office Center Coordinates:</Text>
          <Text style={styles.coordsValue}>
            {numLat.toFixed(6)}, {numLng.toFixed(6)}
          </Text>
        </View>

        <View style={styles.radiusPresetsRow}>
          <Text style={styles.radiusPresetsLabel}>Geofence Radius:</Text>
          <View style={styles.radiusChips}>
            {RADIUS_PRESETS.map((r) => {
              const isSelected = numRadius === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusChip, isSelected && styles.radiusChipActive]}
                  onPress={() => onRadiusChange?.(String(r))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radiusChipText, isSelected && styles.radiusChipTextActive]}>
                    {r}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.mapHelpText}>
        💡 <Text style={{ fontWeight: '700' }}>Tip:</Text> Tap anywhere on the map or drag the blue pin to position the office entrance. Staff within the blue circle can punch in.
      </Text>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    marginLeft: 6,
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 8,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  mapFrame: {
    height: 250,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  gpsFloatingBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    ...shadows.sm,
  },
  gpsFloatingBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  providerBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  providerBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  metaControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    padding: 10,
    marginTop: 8,
  },
  coordsDisplay: {
    flex: 1,
  },
  coordsLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  coordsValue: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 1,
  },
  radiusPresetsRow: {
    alignItems: 'flex-end',
  },
  radiusPresetsLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  radiusChips: {
    flexDirection: 'row',
    gap: 4,
  },
  radiusChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radiusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
  },
  mapHelpText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
});
