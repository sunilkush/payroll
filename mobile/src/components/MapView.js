import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../theme';

// Leaflet ka map, WebView ke andar (web app jaisa hi map; native map SDK / API key nahi chahiye).
//   center      { lat, lng }: map yahan khulta hai
//   zoom        default 16
//   markers     [{ lat, lng, label? }]: office / client ke pin
//   circles     [{ lat, lng, radius (meter), tone?, dashed? }]: geofence ka gola. tone: success | danger | info
//   lines       [{ from: { lat, lng }, to: { lat, lng }, tone?, dashed?, label? }]: jaise user se office tak, doori ke saath
//   user        { lat, lng, tone? }: "aap yahan ho" wala dot (default neela; danger = laal)
//   pin         { lat, lng }: kheench kar hilane wala pin (location chunne ke liye); map dabane par bhi wahin aata hai
//   onPinChange ({ lat, lng }) => void
//   fit         true ho to saari cheezein dikhne layak zoom (center / zoom ki jagah)
//   viewKey     view (center / zoom / fit) ek hi baar lagta hai, taaki user ka zoom na bigde; ye badlo to dobara lagta hai
// Leaflet CDN se aata hai, isliye map ke liye internet zaroori hai.

// Web app wale hi tiles (client/src/components/MapPin/mapPin.js). Badalna ho to EXPO_PUBLIC_MAP_TILE_URL.
const TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ||
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_4hvk_1_66bbc4fc51414267309c9089';

const TONES = { success: colors.success, danger: colors.danger, info: colors.info };

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: ${colors.divider}; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.25); }
  .dot-marker { background: ${colors.ink}; }
  .dot-user { background: ${colors.info}; }
  .dot-user-danger { background: ${colors.danger}; }
  .dot-pin { width: 20px; height: 20px; background: ${colors.danger}; }
  .line-label { background: #fff; border: 1px solid ${colors.line}; border-radius: 999px; padding: 2px 8px;
    font: 600 12px monospace; color: ${colors.danger}; box-shadow: none; }
  .line-label::before { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true });
  L.tileLayer(${JSON.stringify(TILE_URL)}, { maxZoom: 20, subdomains: 'abcd', attribution: '&copy; OpenStreetMap, CARTO' }).addTo(map);
  var layers = L.layerGroup().addTo(map);
  var pin = null;
  var viewKey = null;
  var canMovePin = false;
  var dot = function (name, size) {
    return L.divIcon({ className: '', html: '<div class="dot ' + name + '"></div>', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  };
  var send = function (message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); };

  // React Native yahan naya data bhejta hai (props badalne par).
  window.render = function (data) {
    layers.clearLayers();
    var points = [];
    (data.circles || []).forEach(function (circle) {
      L.circle([circle.lat, circle.lng], {
        radius: circle.radius, color: circle.color, weight: 2, fillOpacity: 0.12, dashArray: circle.dashed ? '6 6' : null,
      }).addTo(layers);
      points.push([circle.lat, circle.lng]);
    });
    (data.lines || []).forEach(function (line) {
      var ends = [[line.from.lat, line.from.lng], [line.to.lat, line.to.lng]];
      var layer = L.polyline(ends, { color: line.color, weight: 2, dashArray: line.dashed ? '6 6' : null }).addTo(layers);
      if (line.label) {
        layer.bindTooltip(String(line.label), { permanent: true, direction: 'center', className: 'line-label' });
      }
      points.push(ends[0], ends[1]);
    });
    (data.markers || []).forEach(function (marker) {
      var layer = L.marker([marker.lat, marker.lng], { icon: dot('dot-marker', 20), keyboard: false }).addTo(layers);
      if (marker.label) layer.bindTooltip(String(marker.label), { direction: 'top', offset: [0, -8] });
      points.push([marker.lat, marker.lng]);
    });
    if (data.user) {
      var userDot = data.user.tone === 'danger' ? 'dot-user-danger' : 'dot-user';
      L.marker([data.user.lat, data.user.lng], { icon: dot(userDot, 20), interactive: false }).addTo(layers);
      points.push([data.user.lat, data.user.lng]);
    }

    canMovePin = Boolean(data.pinMovable);
    if (data.pin) {
      if (!pin) {
        pin = L.marker([data.pin.lat, data.pin.lng], { icon: dot('dot-pin', 26), draggable: canMovePin }).addTo(map);
        pin.on('dragend', function () {
          var at = pin.getLatLng();
          send({ type: 'pin', lat: at.lat, lng: at.lng });
        });
      } else {
        pin.setLatLng([data.pin.lat, data.pin.lng]);
      }
      points.push([data.pin.lat, data.pin.lng]);
    } else if (pin) {
      map.removeLayer(pin);
      pin = null;
    }

    // View ek hi baar set hota hai (viewKey badalne par dobara), taaki user ka zoom / khiskana har update par wapas na ho.
    if (viewKey === data.viewKey) return;
    if (data.fit && points.length > 1) {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 17 });
    } else {
      var center = data.center || (points.length ? { lat: points[0][0], lng: points[0][1] } : { lat: 20.5937, lng: 78.9629 });
      map.setView([center.lat, center.lng], data.center || points.length ? data.zoom : 4);
    }
    viewKey = data.viewKey;
  };

  map.on('click', function (event) {
    if (!canMovePin) return;
    send({ type: 'pin', lat: event.latlng.lat, lng: event.latlng.lng });
  });
  send({ type: 'ready' });
</script>
</body>
</html>`;

export default function MapView({
  center,
  zoom = 16,
  markers,
  circles,
  lines,
  user,
  pin,
  onPinChange,
  fit = false,
  viewKey = 'initial',
  height = 220,
  rounded = true,
  style,
}) {
  const webView = useRef(null);
  const ready = useRef(false);

  const data = useMemo(
    () => ({
      center,
      zoom,
      fit,
      markers,
      viewKey,
      circles: circles?.map((circle) => ({ ...circle, color: TONES[circle.tone] ?? colors.ink })),
      lines: lines?.map((line) => ({ ...line, color: TONES[line.tone] ?? colors.ink })),
      user,
      pin,
      pinMovable: Boolean(onPinChange),
    }),
    [center, zoom, fit, viewKey, markers, circles, lines, user, pin, onPinChange]
  );

  // JSON.stringify ka nateeja JS mein seedha chal jata hai; data mein sirf numbers aur labels hain.
  const push = useCallback(() => {
    if (ready.current) webView.current?.injectJavaScript(`window.render(${JSON.stringify(data)}); true;`);
  }, [data]);

  useEffect(push, [push]);

  const onMessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'ready') {
      ready.current = true;
      push();
    } else if (message.type === 'pin') {
      onPinChange?.({ lat: message.lat, lng: message.lng });
    }
  };

  return (
    <View style={[styles.frame, rounded && styles.rounded, { height }, style]}>
      <WebView
        ref={webView}
        source={{ html: HTML }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
        accessibilityLabel="Map"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.divider },
  rounded: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.line },
  web: { flex: 1, backgroundColor: 'transparent' },
});
