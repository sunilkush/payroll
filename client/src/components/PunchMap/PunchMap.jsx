import { useEffect, useRef, useState } from 'react';
import { AimOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import L from 'leaflet';

import { MAP_OPTIONS, OFFICE_PIN, PIN_ZOOM, rangeCircleStyle, TILE_OPTIONS, TILE_URL, YOU_DOT } from '../MapPin/mapPin.js';
import './PunchMap.css';

// Staff ke Punch page ka map: office ka pin, punch ki range ka gola, aur staff ki apni location
// (neela bindu).
//   locations    [{ name, lat, lng, radius }]
//   position     { lat, lng, accuracy } ya null (location abhi nahi mili / permission nahi)
//   recenterKey  badalne par (jaise "Refresh location") map wapas office + staff par aa jata hai
//
// Map ko khiska (drag) aur zoom karke aas-paas dekha ja sakta hai. Jab tak staff ne khud map nahi
// hilaya, map office aur staff dono ko dikhane ke liye khud adjust hota rehta hai; hilane ke baad
// wahin rukta hai aur "Recenter" button aa jata hai.
export default function PunchMap({ locations, position, recenterKey }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const youRef = useRef(null);
  const officeBoundsRef = useRef(null);
  // Hamara apna fitBounds bhi "move" event deta hai; use staff ka hilana na samjhein
  const fittingRef = useRef(false);
  const movedRef = useRef(false);
  const [moved, setMoved] = useState(false);
  // Parent har render par nayi array de sakta hai; map sirf tab dobara bane jab offices sach mein badlein.
  const locationsKey = JSON.stringify(locations);

  // Office (aur staff ho to wo bhi) poora dikhe
  const fit = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(officeBoundsRef.current.getSouthWest(), officeBoundsRef.current.getNorthEast());
    const you = youRef.current?.getLatLng();
    if (you) bounds.extend(you);
    fittingRef.current = true;
    map.fitBounds(bounds, { maxZoom: PIN_ZOOM, padding: [24, 24] });
    fittingRef.current = false;
  };

  const recenter = () => {
    movedRef.current = false;
    setMoved(false);
    fit();
  };

  // Map + office: offices badalne par hi dobara bante hain
  useEffect(() => {
    const map = L.map(containerRef.current, {
      ...MAP_OPTIONS,
      // Page scroll karte waqt mouse ke pahiye se map zoom na ho; zoom ke liye +/- buttons ya do ungliyan
      scrollWheelZoom: false,
      // Zoom ka animation nahi: page chhodte waqt adhoora animation Leaflet mein error deta hai
      zoomAnimation: false,
      markerZoomAnimation: false,
    });
    L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
    // Layers jodne se pehle map ka koi view hona zaroori hai (warna Leaflet gole ko naap nahi pata)
    map.setView([locations[0].lat, locations[0].lng], PIN_ZOOM);

    const bounds = L.latLngBounds([]);
    for (const location of locations) {
      const center = L.latLng(location.lat, location.lng);
      const circle = L.circle(center, { radius: location.radius, ...rangeCircleStyle() }).addTo(map);
      circle.bindTooltip(`${location.radius}m allowed radius`, {
        permanent: false,
        direction: 'bottom',
        offset: [0, 10],
        className: 'punch-map__label',
      });
      L.marker(center, { icon: OFFICE_PIN, interactive: false }).addTo(map).bindTooltip(`${location.name} · ${location.radius}m range`, {
        permanent: true,
        direction: 'top',
        offset: [0, -28],
        className: 'punch-map__label',
      });
      // Gole ko gherne wala chaukor (radius ke hisaab se poora circle cover kare)
      bounds.extend(circle.getBounds());
    }
    officeBoundsRef.current = bounds;
    mapRef.current = map;
    fit();

    // Staff ne khud map khiskaya ya zoom kiya
    map.on('movestart', () => {
      if (fittingRef.current || movedRef.current) return;
      movedRef.current = true;
      setMoved(true);
    });

    // Map ka dabba screen ki oonchai ke saath chhota-bada hota hai (Punch page): Leaflet ko naya size
    // batao, aur staff ne map na hilaya ho to office + staff ko dobara fit karo.
    const resizeObserver = new ResizeObserver(() => {
      fittingRef.current = true;
      map.invalidateSize({ animate: false });
      fittingRef.current = false;
      if (!movedRef.current) fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      youRef.current = null;
    };
    // locationsKey = locations ka content; identity par nirbhar nahi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsKey]);

  // Staff ki location: bindu ko khiskao. Map tabhi adjust hota hai jab staff ne use khud na hilaya ho.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    const point = [position.lat, position.lng];

    if (!youRef.current) {
      youRef.current = L.marker(point, { icon: YOU_DOT, interactive: false, zIndexOffset: 1000 }).addTo(map);
    } else {
      youRef.current.setLatLng(point);
    }
    if (!movedRef.current) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, locationsKey]);

  // "Refresh location" jaisa koi kaam: wapas office + staff par
  useEffect(() => {
    if (recenterKey) recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  return (
    <div className="punch-map">
      <div className="punch-map__frame">
        <div ref={containerRef} className="punch-map__canvas" role="application" aria-label="Map of office location and your position" />
        {locations?.[0]?.radius && (
          <div className="punch-map__radius-pill">
            <span>🎯 Allowed Radius:</span>
            <strong>{locations[0].radius}m</strong>
          </div>
        )}
        {moved && (
          <Button size="small" className="punch-map__recenter" icon={<AimOutlined />} onClick={recenter}>
            Recenter
          </Button>
        )}
      </div>
      {/* Map par kya kya hai. Gola = jahan tak aakar punch ho sakta hai. */}
      <ul className="punch-map__legend">
        <li>
          <span className="punch-map__key punch-map__key--office" aria-hidden="true" /> Office
        </li>
        <li>
          <span className="punch-map__key punch-map__key--range" aria-hidden="true" /> Punch allowed inside the circle
        </li>
        <li>
          <span className="punch-map__key punch-map__key--you" aria-hidden="true" /> You
        </li>
      </ul>
      
    </div>
  );
}
