import './mapPin.css';

// Leaflet Map credit
export default function MapCredit() {
  return (
    <span className="map-credit">
      Powered by{' '}
      <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">
        Leaflet Map
      </a>
    </span>
  );
}
