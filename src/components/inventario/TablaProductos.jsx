import { Link } from 'react-router';
import { etiquetaEstado } from '../../utils/validacionesUsuario.js';
import { formatearCantidad, formatearMoneda } from '../../utils/formato.js';
import Insignia from '../ui/Insignia.jsx';
import Boton from '../ui/Boton.jsx';

export default function TablaProductos({ productos, ocupado, vacioTexto, onEntrada, onEditar, onCambiarEstado, onEliminar }) {
  return (
    <div className="tabla-caja">
      <p className="tabla-contador" aria-live="polite">
        {productos.length === 1 ? '1 producto' : `${productos.length} productos`}
      </p>
      {productos.length === 0 ? (
        <p className="estado-vacio">{vacioTexto}</p>
      ) : (
        <div className="tabla-scroll" aria-busy={ocupado || undefined}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de productos del inventario</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Unidad</th>
                <th scope="col" className="tabla__num">
                  Precio
                </th>
                <th scope="col">Stock</th>
                <th scope="col" className="tabla__num">
                  Mínimo
                </th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const activo = p.estado === 'activo';
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/productos/${p.id}`} className="tabla__enlace">
                        {p.nombre}
                      </Link>
                      {p.sku && <span className="tabla__sub">{p.sku}</span>}
                    </td>
                    <td>{p.categoria_nombre}</td>
                    <td>{p.unidad_nombre}</td>
                    <td className="tabla__num">{formatearMoneda(p.precio_venta)}</td>
                    <td>
                      <div className="tabla__stock">
                        <strong>{formatearCantidad(p.stock_vendible, p.unidad_abreviatura)}</strong>
                        {p.stock_bajo && <Insignia variante="stock-bajo">Stock bajo</Insignia>}
                        {p.stock_vencido > 0 && (
                          <Insignia variante="vencido">
                            Vencido: {formatearCantidad(p.stock_vencido, p.unidad_abreviatura)}
                          </Insignia>
                        )}
                      </div>
                    </td>
                    <td className="tabla__num">{formatearCantidad(p.stock_minimo)}</td>
                    <td>
                      <Insignia variante={activo ? 'activo' : 'inactivo'}>{etiquetaEstado(p.estado)}</Insignia>
                    </td>
                    <td>
                      <div className="tabla__acciones">
                        <Boton
                          variante="secundario"
                          pequeno
                          onClick={() => onEntrada(p)}
                          disabled={!activo}
                          title={activo ? undefined : 'Producto inactivo'}
                          aria-label={`Entrada de ${p.nombre}${activo ? '' : ' (producto inactivo)'}`}
                        >
                          Entrada
                        </Boton>
                        <Boton
                          variante="secundario"
                          pequeno
                          onClick={() => onEditar(p)}
                          aria-label={`Editar ${p.nombre}`}
                        >
                          Editar
                        </Boton>
                        <Boton
                          variante={activo ? 'peligro-suave' : 'secundario'}
                          pequeno
                          onClick={() => onCambiarEstado(p)}
                          aria-label={`${activo ? 'Desactivar' : 'Activar'} ${p.nombre}`}
                        >
                          {activo ? 'Desactivar' : 'Activar'}
                        </Boton>
                        {p.tiene_movimientos === false && (
                          <Boton
                            variante="peligro-suave"
                            pequeno
                            onClick={() => onEliminar(p)}
                            aria-label={`Eliminar ${p.nombre}`}
                          >
                            Eliminar
                          </Boton>
                        )}
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
