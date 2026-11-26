import { Link } from 'react-router';
import { formatearCantidad, formatearDia, formatearFecha } from '../../utils/formato.js';
import { etiquetaMotivo, etiquetaTipoMovimiento } from '../../utils/validacionesInventario.js';
import Insignia from '../ui/Insignia.jsx';

/** Historial de movimientos. Se reutiliza en la ficha del producto y en la pantalla Movimientos. */
export default function TablaMovimientos({ movimientos, mostrarProducto = false, ocupado, vacioTexto }) {
  if (movimientos.length === 0) return <p className="estado-vacio">{vacioTexto}</p>;
  return (
    <div className="tabla-scroll" aria-busy={ocupado || undefined}>
      <table className="tabla">
        <caption className="solo-lectores">Historial de movimientos de inventario</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Registrado</th>
            {mostrarProducto && <th scope="col">Producto</th>}
            <th scope="col">Tipo</th>
            <th scope="col" className="tabla__num">
              Cantidad
            </th>
            <th scope="col" className="tabla__num">
              Saldo resultante
            </th>
            <th scope="col">Lote</th>
            <th scope="col">Motivo</th>
            <th scope="col">Usuario</th>
            <th scope="col">Observación</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => {
            const n = Number(m.cantidad);
            const signo = n > 0 ? '+' : '';
            return (
              <tr key={m.id}>
                <td>{formatearDia(m.fecha_movimiento)}</td>
                <td>{formatearFecha(m.creado_en, '—')}</td>
                {mostrarProducto && (
                  <td>
                    <Link to={`/productos/${m.producto_id}`} className="tabla__enlace">
                      {m.producto_nombre}
                    </Link>
                  </td>
                )}
                <td>
                  <Insignia variante={m.tipo}>{etiquetaTipoMovimiento(m.tipo)}</Insignia>
                </td>
                <td className={`tabla__num ${n > 0 ? 'cantidad--positiva' : 'cantidad--negativa'}`}>
                  {signo}
                  {formatearCantidad(n, m.unidad_abreviatura)}
                </td>
                <td className="tabla__num">{formatearCantidad(m.stock_resultante, m.unidad_abreviatura)}</td>
                <td>{m.codigo_lote || '—'}</td>
                <td>{etiquetaMotivo(m.motivo)}</td>
                <td>{m.usuario_nombre || '—'}</td>
                <td className="tabla__observacion">{m.observacion || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
