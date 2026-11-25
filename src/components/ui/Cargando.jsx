export default function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="giro" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
