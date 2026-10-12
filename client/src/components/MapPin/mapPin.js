import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './mapPin.css';

// Maps ke common hisse (Settings ka LocationMap aur staff ka PunchMap dono use karte hain).

export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_4hvk_1_66bbc4fc51414267309c9089';
export const TILE_OPTIONS = {
  maxZoom: 20,
  subdomains: 'abcd',
  attribution: '&copy; Leaflet Map',
};
export const PIN_ZOOM = 17;

export const MAP_OPTIONS = { attributionControl: false };

// Office ka laal pin. CSS se bana hai (mapPin.css), taaki Leaflet ki marker images bundle na karni padein.
export const OFFICE_PIN = L.divIcon({ className: 'map-pin', iconSize: [28, 28], iconAnchor: [14, 28] });

// "Aap yahan hain" ka neela bindu
export const YOU_DOT = L.divIcon({ className: 'map-you', iconSize: [18, 18], iconAnchor: [9, 9] });

// Punch ki range ka gola: kati hui (dashed) rekha aur halka bharaav, taaki seema saaf dikhe
export const rangeCircleStyle = () => ({
  color: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
  weight: 2,
  dashArray: '6 6',
  fillOpacity: 0.16,
});
