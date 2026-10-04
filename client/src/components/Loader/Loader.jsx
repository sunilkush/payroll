import './Loader.css';

export default function Loader() {
  return (
    <div className="loader" role="status" aria-label="Loading">
      <span className="loader__spinner" />
    </div>
  );
}
