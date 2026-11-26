import { Link } from 'react-router';
import { etiquetaEstado } from '../../utils/validacionesUsuario.js';
import { formatearMoneda, formatearTelefono } from '../../utils/formato.js';
import Insignia from '../ui/Insignia.jsx';
import Boton from '../ui/Boton.jsx';

/** Texto de la ruta de una tienda: nombre, "(inactiva)" o "Sin ruta". */
export function textoRuta(t) {
  if (!t.ruta_id) return 'Sin ruta';
  return t.ruta_estado === 'activo' ? t.ruta_nombre : `${t.ruta_nombre} (inactiva)`;
}

export default function TablaTiendas({ tiendas, ocupado, vacioTexto, onEditar, onCambiarEstado }) {
  return (
    <div className="tabla-caja">
      <p className="tabla-contador" aria-live="polite">
        {tiendas.length === 1 ? '1 tienda' : `${tiendas.length} tiendas`}
      </p>
      {tiendas.length === 0 ? (
        <p className="estado-vacio">{vacioTexto}</p>
      ) : (
        <div className="tabla-scroll" aria-busy={ocupado || undefined}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de tiendas</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Contacto</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Ruta</th>
                <th scope="col" className="tabla__num">
                  Límite
                </th>
                <th scope="col" className="tabla__num">
                  Saldo pendiente
                </th>
                <th scope="col" className="tabla__num">
                  Crédito disponible
                </th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiendas.map((t) => {
                const activo = t.estado === 'activo';
                return (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tiendas/${t.id}`} className="tabla__enlace">
                        {t.nombre}
                      </Link>
                    </td>
                    <td>{t.contacto}</td>
                    <td className="tabla__telefono">{formatearTelefono(t.telefono)}</td>
                    <td>{textoRuta(t)}</td>
                    <td className="tabla__num">{formatearMoneda(t.limite_credito)}</td>
                    <td className="tabla__num">{formatearMoneda(t.saldo_pendiente)}</td>
                    <td className="tabla__num">
                      {formatearMoneda(t.credito_disponible)}
                      {t.credito_excedido ? (
                        <span className="tabla__sub">
                          <Insignia variante="credito-excedido">Crédito excedido</Insignia>
                        </span>
                      ) : (
                        Number(t.limite_credito) === 0 && <span className="tabla__sub">Solo contado</span>
                      )}
                    </td>
                    <td>
                      <Insignia variante={activo ? 'activo' : 'inactivo'}>{etiquetaEstado(t.estado)}</Insignia>
                    </td>
                    <td>
                      <div className="tabla__acciones">
                        <Boton
                          variante="secundario"
                          pequeno
                          onClick={() => onEditar(t)}
                          aria-label={`Editar la tienda ${t.nombre}`}
                        >
                          Editar
                        </Boton>
                        <Boton
                          variante={activo ? 'peligro-suave' : 'secundario'}
                          pequeno
                          onClick={() => onCambiarEstado(t)}
                          aria-label={`${activo ? 'Desactivar' : 'Activar'} la tienda ${t.nombre}`}
                        >
                          {activo ? 'Desactivar' : 'Activar'}
                        </Boton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
