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
import { WebView } from 'react-native-webview';
import { borderRadius, colors, radius, shadows, spacing, typography } from '../../theme/index.js';

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('WebView error in PunchGeofenceMap:', err);
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
  const webViewRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  // Animated pulse for radar sweep fallback
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

  // Sync coordinates & states dynamically to Leaflet WebView
  useEffect(() => {
    if (webViewRef.current && mapLoaded) {
      const script = `
        if (typeof updateLivePositions === 'function') {
          updateLivePositions(
            ${userLat !== null ? userLat : 'null'},
            ${userLng !== null ? userLng : 'null'},
            ${Boolean(isInside)},
            ${officeLat},
            ${officeLng},
            ${officeRadius}
          );
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [userLat, userLng, isInside, officeLat, officeLng, officeRadius, mapLoaded]);

  const fitBoth = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript('if(typeof fitBoth==="function"){fitBoth();}true;');
    }
  };

  const centerOnUser = () => {
    if (webViewRef.current && hasUser) {
      webViewRef.current.injectJavaScript('if(typeof centerOnUser==="function"){centerOnUser();}true;');
    }
    if (onRefreshLocation) {
      onRefreshLocation();
    }
  };

  const openExternalMaps = () => {
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

  // Serialized extra branches for the map
  const sanitizedBranchesJson = useMemo(() => {
    const list = (allLocations || [])
      .filter((loc) => loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng))
      .filter((loc) => Math.abs(loc.lat - officeLat) > 0.0001 || Math.abs(loc.lng - officeLng) > 0.0001)
      .map((loc) => ({
        name: loc.name || 'Branch',
        lat: loc.lat,
        lng: loc.lng,
        radius: loc.radius || 100,
      }));
    return JSON.stringify(list);
  }, [allLocations, officeLat, officeLng]);

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
          * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
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
            width: 36px;
            height: 36px;
            background: ${isInside ? '#10B981' : '#2563EB'};
            border: 3px solid #FFFFFF;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
            transition: background 0.3s ease;
          }
          .custom-office-pin-inner {
            width: 12px;
            height: 12px;
            background: #FFFFFF;
            border-radius: 50%;
            transform: rotate(45deg);
          }
          .custom-user-marker {
            position: relative;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: ${isInside ? '#10B981' : '#3B82F6'};
            border: 3px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .custom-user-pulse {
            position: absolute;
            top: -7px;
            left: -7px;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: ${isInside ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)'};
            animation: pulse-ring 2s infinite ease-out;
            pointer-events: none;
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.7); opacity: 0.9; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .branch-node {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #64748B;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
            border-radius: 8px !important;
            overflow: hidden;
          }
          .office-pin-tooltip {
            background: #0F172A !important;
            color: #FFFFFF !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            border-radius: 6px !important;
            padding: 3px 8px !important;
            border: 1px solid rgba(255, 255, 255, 0.25) !important;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3) !important;
            white-space: nowrap !important;
            text-align: center !important;
          }
          .office-pin-tooltip::before {
            border-top-color: #0F172A !important;
          }
          .geofence-tooltip {
            background: #2563EB !important;
            color: #FFFFFF !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            border-radius: 6px !important;
            padding: 3px 8px !important;
            border: none !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
            white-space: nowrap !important;
          }
          .geofence-tooltip::before {
            border-bottom-color: #2563EB !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var officeLat = ${officeLat};
          var officeLng = ${officeLng};
          var officeRadius = ${officeRadius};
          var officeName = ${JSON.stringify(officeName)};
          var userLat = ${userLat !== null ? userLat : 'null'};
          var userLng = ${userLng !== null ? userLng : 'null'};
          var isInside = ${Boolean(isInside)};
          var extraBranches = ${sanitizedBranchesJson};

          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([officeLat, officeLng], 16);

        // Leaflet Map Tiles
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_4hvk_1_66bbc4fc51414267309c9089', {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; Leaflet Map'
          }).addTo(map);

          function getOfficeIcon(inside) {
            return L.divIcon({
              className: '',
              iconSize: [36, 36],
              iconAnchor: [18, 36],
              popupAnchor: [0, -36],
              html: '<div class="custom-office-pin" style="background:' + (inside ? '#10B981' : '#2563EB') + '"><div class="custom-office-pin-inner"></div></div>'
            });
          }

          function getUserIcon(inside) {
            return L.divIcon({
              className: '',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
              popupAnchor: [0, -15],
              html: '<div class="custom-user-marker" style="background:' + (inside ? '#10B981' : '#3B82F6') + '"><div class="custom-user-pulse" style="background:' + (inside ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)') + '"></div></div>'
            });
          }

          // Office Pin with Admin Set Radius Tooltip
          var officeMarker = L.marker([officeLat, officeLng], {
            icon: getOfficeIcon(isInside)
          }).addTo(map);

          officeMarker.bindTooltip('<b>' + officeName + '</b><br><span>Radius: ' + officeRadius + 'm</span>', {
            permanent: true,
            direction: 'top',
            offset: [0, -36],
            className: 'office-pin-tooltip'
          });

          // Office Geofence Circle with Radius Tooltip
          var circle = L.circle([officeLat, officeLng], {
            radius: officeRadius,
            color: isInside ? '#10B981' : '#2563EB',
            fillColor: isInside ? '#10B981' : '#3B82F6',
            fillOpacity: isInside ? 0.22 : 0.18,
            weight: 2,
            dashArray: '6, 6'
          }).addTo(map);

          circle.bindTooltip('🎯 Geofence Area: ' + officeRadius + 'm', {
            permanent: true,
            direction: 'bottom',
            offset: [0, 16],
            className: 'geofence-tooltip'
          });

          // Extra Branches
          if (Array.isArray(extraBranches)) {
            extraBranches.forEach(function(b) {
              var branchIcon = L.divIcon({
                className: '',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                html: '<div class="branch-node"></div>'
              });
              L.marker([b.lat, b.lng], { icon: branchIcon })
                .addTo(map)
                .bindPopup('<b>' + b.name + '</b><br>Geofence: ' + b.radius + 'm');
              L.circle([b.lat, b.lng], {
                radius: b.radius,
                color: '#64748B',
                fillColor: '#64748B',
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '4, 4'
              }).addTo(map);
            });
          }

          // User Marker & Polyline
          var userMarker = null;
          var distanceLine = null;

          function fitAll() {
            try {
              if (circle && typeof circle.getBounds === 'function') {
                var bounds = circle.getBounds();
                if (userMarker) {
                  bounds.extend(userMarker.getLatLng());
                }
                map.fitBounds(bounds.pad(0.18), { maxZoom: 18, animate: true });
              }
            } catch (err) {}
          }

          if (userLat !== null && userLng !== null) {
            userMarker = L.marker([userLat, userLng], {
              icon: getUserIcon(isInside)
            }).addTo(map).bindPopup('<b>Your Live Location</b>');

            distanceLine = L.polyline([[userLat, userLng], [officeLat, officeLng]], {
              color: isInside ? '#10B981' : '#64748B',
              weight: 2,
              dashArray: '5, 5'
            }).addTo(map);
          }

          setTimeout(function() {
            try {
              map.invalidateSize();
              fitAll();
            } catch (err) {}
          }, 200);

          window.fitBoth = function() {
            fitAll();
          };

          window.centerOnUser = function() {
            if (userMarker) {
              map.setView(userMarker.getLatLng(), 17, { animate: true });
            } else if (circle) {
              map.fitBounds(circle.getBounds().pad(0.2), { animate: true });
            } else {
              map.setView([officeLat, officeLng], 16, { animate: true });
            }
          };

          window.updateLivePositions = function(nUserLat, nUserLng, nInside, nOfficeLat, nOfficeLng, nRadius) {
            officeLat = parseFloat(nOfficeLat) || officeLat;
            officeLng = parseFloat(nOfficeLng) || officeLng;
            officeRadius = parseFloat(nRadius) || officeRadius;
            isInside = Boolean(nInside);

            officeMarker.setLatLng([officeLat, officeLng]);
            officeMarker.setIcon(getOfficeIcon(isInside));
            if (officeMarker.setTooltipContent) {
              officeMarker.setTooltipContent('<b>' + officeName + '</b><br><span>Radius: ' + officeRadius + 'm</span>');
            }

            circle.setLatLng([officeLat, officeLng]);
            circle.setRadius(officeRadius);
            if (circle.setTooltipContent) {
              circle.setTooltipContent('🎯 Geofence Area: ' + officeRadius + 'm');
            }
            circle.setStyle({
              color: isInside ? '#10B981' : '#2563EB',
              fillColor: isInside ? '#10B981' : '#3B82F6',
              fillOpacity: isInside ? 0.22 : 0.18
            });

            var parsedULat = parseFloat(nUserLat);
            var parsedULng = parseFloat(nUserLng);

            if (!isNaN(parsedULat) && !isNaN(parsedULng)) {
              if (!userMarker) {
                userMarker = L.marker([parsedULat, parsedULng], {
                  icon: getUserIcon(isInside)
                }).addTo(map).bindPopup('<b>Your Live Location</b>');
              } else {
                userMarker.setLatLng([parsedULat, parsedULng]);
                userMarker.setIcon(getUserIcon(isInside));
              }

              if (!distanceLine) {
                distanceLine = L.polyline([[parsedULat, parsedULng], [officeLat, officeLng]], {
                  color: isInside ? '#10B981' : '#64748B',
                  weight: 2,
                  dashArray: '5, 5'
                }).addTo(map);
              } else {
                distanceLine.setLatLngs([[parsedULat, parsedULng], [officeLat, officeLng]]);
                distanceLine.setStyle({
                  color: isInside ? '#10B981' : '#64748B'
                });
              }
            }

            fitAll();
          };
        </script>
      </body>
      </html>
    `;
  }, [officeLat, officeLng, officeRadius, officeName, sanitizedBranchesJson]);

  // Fallback interactive radar view (when webview fails)
  const renderRadarFallback = () => {
    return (
      <View style={styles.fallbackCanvas}>
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

          <View style={styles.fallbackOfficeNode}>
            <MaterialCommunityIcons name="office-building" size={20} color="#FFFFFF" />
          </View>

          {hasUser && (
            <Animated.View
              style={[
                styles.fallbackUserNode,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: isInside ? colors.success : colors.danger,
                  top: isInside ? '36%' : '14%',
                  right: isInside ? '34%' : '20%',
                },
              ]}
            >
              <MaterialCommunityIcons name="account" size={14} color="#FFFFFF" />
            </Animated.View>
          )}
        </View>

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
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            onLoadEnd={() => {
              setMapLoaded(true);
              if (webViewRef.current) {
                const script = `
                  if (typeof updateLivePositions === 'function') {
                    updateLivePositions(
                      ${userLat !== null ? userLat : 'null'},
                      ${userLng !== null ? userLng : 'null'},
                      ${Boolean(isInside)},
                      ${officeLat},
                      ${officeLng},
                      ${officeRadius}
                    );
                  }
                  true;
                `;
                webViewRef.current.injectJavaScript(script);
              }
            }}
            onError={(e) => {
              console.warn('WebView error:', e.nativeEvent);
              setMapLoaded(true);
            }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading Leaflet Map...</Text>
              </View>
            )}
          />

          {/* Floating Admin-Set Radius Badge right on top-left of the Map */}
          <View style={styles.radiusFloatPill}>
            <MaterialCommunityIcons name="radar" size={14} color="#2563EB" />
            <Text style={styles.radiusFloatLabel}>Admin Set Radius:</Text>
            <View style={styles.radiusFloatBadge}>
              <Text style={styles.radiusFloatBadgeText}>{officeRadius}m</Text>
            </View>
          </View>

          {/* Leaflet Map Provider Badge */}
          <View style={styles.providerBadge}>
            <MaterialCommunityIcons name="leaf" size={12} color="#16a34a" />
            <Text style={styles.providerBadgeText}>Leaflet Map</Text>
          </View>
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
          onPress={openExternalMaps}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
          <Text style={styles.openMapsText}>Directions</Text>
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
    height: 230,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
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
  radiusFloatPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...shadows.sm,
    zIndex: 10,
  },
  radiusFloatLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#1E293B',
  },
  radiusFloatBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  radiusFloatBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  providerBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#059669',
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
