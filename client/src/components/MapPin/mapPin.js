import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './mapPin.css';

// Maps ke common hisse (Settings ka LocationMap aur staff ka PunchMap dono use karte hain).

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_OPTIONS = { maxZoom: 19 };
export const PIN_ZOOM = 17;

// Map ke kone wali "Leaflet | (c) OpenStreetMap" patti band hai. OpenStreetMap ka credit dikhana unke
// license ki shart hai, isliye wo map ke theek neeche <MapCredit /> se dikhta hai. Use hatana ho to
// pehle tiles kisi aur (licensed) provider se leni hongi.
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
