import './mapPin.css';

// OpenStreetMap ka credit (license ki shart). Map ke upar ki patti ki jagah map ke neeche chhoti line.
export default function MapCredit() {
  return (
    <span className="map-credit">
      Map data ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap
      </a>{' '}
      contributors
    </span>
  );
}
