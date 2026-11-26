import { formatearCantidad, formatearDia } from '../../utils/formato.js';
import Insignia from '../ui/Insignia.jsx';

const ESTADOS = {
  vigente: { variante: 'vigente', texto: 'Vigente' },
  por_vencer: { variante: 'por-vencer', texto: 'Por vencer' },
  vencido: { variante: 'vencido', texto: 'Vencido' },
};

export function textoDias(dias) {
  const n = Number(dias);
  if (Number.isNaN(n)) return '—';
  if (n < 0) return `Venció hace ${Math.abs(n)} ${Math.abs(n) === 1 ? 'día' : 'días'}`;
  if (n === 0) return 'Vence hoy';
  return String(n);
}

export function InsigniaCaducidad({ estado }) {
  const e = ESTADOS[estado] ?? ESTADOS.vigente;
  return <Insignia variante={e.variante}>{e.texto}</Insignia>;
}

/** Lotes de un producto (solo si su categoría controla lotes). */
export default function TablaLotes({ lotes, abreviatura, ocupado }) {
  if (lotes.length === 0) return <p className="estado-vacio">Este producto no tiene lotes para mostrar.</p>;
  return (
    <div className="tabla-scroll" aria-busy={ocupado || undefined}>
      <table className="tabla">
        <caption className="solo-lectores">Lotes del producto</caption>
        <thead>
          <tr>
            <th scope="col">Lote</th>
            <th scope="col">Caducidad</th>
            <th scope="col" className="tabla__num">
              Días restantes
            </th>
            <th scope="col" className="tabla__num">
              Disponible
            </th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((l) => (
            <tr key={l.id}>
              <td>
                <strong>{l.codigo_lote}</strong>
              </td>
              <td>{formatearDia(l.fecha_caducidad)}</td>
              <td className="tabla__num">{textoDias(l.dias_para_vencer)}</td>
              <td className="tabla__num">{formatearCantidad(l.cantidad_disponible, abreviatura)}</td>
              <td>
                <InsigniaCaducidad estado={l.estado_caducidad} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
