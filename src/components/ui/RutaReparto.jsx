/**
 * Ilustración de una ruta de reparto: la bodega y tres tiendas unidas por una línea.
 * Es decorativa (aria-hidden): el texto equivalente va fuera, en la página.
 */
const PARADAS = [
  { x: 40, y: 206, etiqueta: 'Bodega', bodega: true },
  { x: 214, y: 104, etiqueta: 'Tienda 1' },
  { x: 384, y: 160, etiqueta: 'Tienda 2' },
  { x: 500, y: 62, etiqueta: 'Tienda 3' },
];

const TRAZO = 'M40 206 C 128 206, 120 96, 214 104 S 318 214, 384 160 S 452 58, 500 62';

export default function RutaReparto({ className = '' }) {
  return (
    <svg
      className={`ruta ${className}`.trim()}
      viewBox="0 0 540 250"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <path className="ruta__sombra" d={TRAZO} />
      <path className="ruta__linea" d={TRAZO} pathLength="1" />
      {PARADAS.map((p, i) => (
        <g key={p.etiqueta} className="ruta__parada" style={{ '--i': i }} transform={`translate(${p.x} ${p.y})`}>
          {p.bodega ? (
            <>
              <rect x="-17" y="-17" width="34" height="34" rx="7" className="ruta__bodega" />
              <path d="M-8 6 V-2 L0 -8 L8 -2 V6 Z M-3 6 V1 H3 V6" className="ruta__icono" />
            </>
          ) : (
            <>
              <circle r="15" className="ruta__punto" />
              <text className="ruta__numero" textAnchor="middle" dy="5">
                {i}
              </text>
            </>
          )}
          <text className="ruta__etiqueta" textAnchor="middle" y={p.y < 100 ? -26 : 36}>
            {p.etiqueta}
          </text>
        </g>
      ))}
    </svg>
  );
}
