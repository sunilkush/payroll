import { useEffect, useRef, useState } from 'react';
import { Input } from 'antd';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMap.css';

// Map (Leaflet + OpenStreetMap) jisse admin office ki location pin kar sakta hai.
//   - Map par click karo ya pin ko kheencho -> onPick(lat, lng)
//   - Upar ke search box se jagah / address dhoondho -> pin wahan chala jata hai
//   - Neela gola punch ki range (radius) dikhata hai
// lat / lng / radius form se string ya number, dono chalte hain. Khali ho to poora India dikhta hai.

const INDIA_CENTER = [22.5, 79];
const INDIA_ZOOM = 4;
const PIN_ZOOM = 17;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

// Pin CSS se bana hai (LocationMap.css), taaki Leaflet ki marker images bundle na karni padein.
const PIN_ICON = L.divIcon({ className: 'location-map__pin', iconSize: [28, 28], iconAnchor: [14, 28] });

function toPosition(lat, lng) {
  if (lat === '' || lng === '' || lat === undefined || lng === undefined) return null;
  const position = [Number(lat), Number(lng)];
  const valid = position.every(Number.isFinite) && Math.abs(position[0]) <= 90 && Math.abs(position[1]) <= 180;
  return valid ? position : null;
}

export default function LocationMap({ lat, lng, radius, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  // Map ke event handlers ek hi baar lagte hain; unhe hamesha sabse naya onPick mile.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Map ek baar banta hai
  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      // Page scroll karte waqt map zoom na hone lage; zoom ke liye +/- buttons hain
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    map.on('click', (event) => onPickRef.current(event.latlng.lat, event.latlng.lng));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Form ki lat / lng / radius badle to pin aur gola unke saath chalein
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const position = toPosition(lat, lng);
    const meters = Number(radius) > 0 ? Number(radius) : 0;

    if (!position) {
      markerRef.current?.remove();
      circleRef.current?.remove();
      markerRef.current = null;
      circleRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const color = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
      const marker = L.marker(position, { draggable: true, icon: PIN_ICON }).addTo(map);
      marker.on('dragend', () => {
        const point = marker.getLatLng();
        onPickRef.current(point.lat, point.lng);
      });
      markerRef.current = marker;
      circleRef.current = L.circle(position, { radius: meters, color, weight: 2, fillOpacity: 0.15 }).addTo(map);
      // Pehli baar: itna zoom ki poora gola dikhe
      if (meters) map.fitBounds(circleRef.current.getBounds(), { maxZoom: PIN_ZOOM, padding: [24, 24] });
      else map.setView(position, PIN_ZOOM);
      return;
    }

    markerRef.current.setLatLng(position);
    circleRef.current.setLatLng(position);
    circleRef.current.setRadius(meters);
    if (!map.getBounds().contains(position)) map.setView(position, Math.max(map.getZoom(), PIN_ZOOM));
  }, [lat, lng, radius]);

  const handleSearch = async (text) => {
    const query = text.trim();
    if (!query) return;
    setSearching(true);
    setSearchError('');
    try {
      const url = `${SEARCH_URL}?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
      const [place] = await fetch(url).then((response) => response.json());
      if (!place) {
        setSearchError('Place not found. Try a more specific address, or click the map to drop the pin.');
        return;
      }
      onPickRef.current(Number(place.lat), Number(place.lon));
      mapRef.current?.setView([Number(place.lat), Number(place.lon)], PIN_ZOOM);
    } catch {
      setSearchError('Search is not available right now. Click the map to drop the pin.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="location-map">
      <Input.Search
        className="location-map__search"
        placeholder="Search a place or address"
        aria-label="Search a place or address"
        enterButton="Find"
        loading={searching}
        onSearch={handleSearch}
        // Form ke andar hai: Enter dabane par poora Settings form submit na ho
        onPressEnter={(event) => event.preventDefault()}
      />
      {searchError && <p className="location-map__error">{searchError}</p>}
      <div ref={containerRef} className="location-map__canvas" role="application" aria-label="Office location map" />
      <p className="location-map__hint">
        Click the map or drag the pin to set the office location. The circle shows the punch range.
      </p>
    </div>
  );
}
