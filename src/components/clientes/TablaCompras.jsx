import { formatearFecha, formatearMoneda } from '../../utils/formato.js';
import Insignia from '../ui/Insignia.jsx';

const ESTADOS_PEDIDO = {
  pendiente: 'Pendiente',
  despachado: 'Despachado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
const TIPOS_PAGO = { contado: 'Contado', credito: 'Crédito' };

/** Historial de compras de una tienda (RF-24). Cada item: { pedido_id, numero, fecha, estado, tipo_pago, total, saldo }. */
export default function TablaCompras({ compras, ocupado, vacioTexto }) {
  if (compras.length === 0) return <p className="estado-vacio">{vacioTexto}</p>;
  return (
    <div className="tabla-scroll" aria-busy={ocupado || undefined}>
      <table className="tabla">
        <caption className="solo-lectores">Historial de compras de la tienda</caption>
        <thead>
          <tr>
            <th scope="col">Pedido</th>
            <th scope="col">Fecha</th>
            <th scope="col">Estado</th>
            <th scope="col">Pago</th>
            <th scope="col" className="tabla__num">
              Total
            </th>
            <th scope="col" className="tabla__num">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody>
          {compras.map((c) => (
            <tr key={c.pedido_id}>
              <td>{c.numero}</td>
              <td>{formatearFecha(c.fecha, '—')}</td>
              <td>
                <Insignia variante={`pedido-${c.estado}`}>{ESTADOS_PEDIDO[c.estado] ?? c.estado}</Insignia>
              </td>
              <td>{TIPOS_PAGO[c.tipo_pago] ?? c.tipo_pago}</td>
              <td className="tabla__num">{formatearMoneda(c.total)}</td>
              <td className="tabla__num">{formatearMoneda(c.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
