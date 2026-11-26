import { etiquetaEstado } from '../../utils/validacionesUsuario.js';
import Insignia from '../ui/Insignia.jsx';
import Boton from '../ui/Boton.jsx';

export default function TablaCategorias({ categorias, ocupado, onEditar, onCambiarEstado }) {
  if (categorias.length === 0) return <p className="estado-vacio">No hay categorías que coincidan con el filtro.</p>;
  return (
    <div className="tabla-scroll" aria-busy={ocupado || undefined}>
      <table className="tabla">
        <caption className="solo-lectores">Lista de categorías de productos</caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Descripción</th>
            <th scope="col">Lotes y caducidad</th>
            <th scope="col" className="tabla__num">
              Productos
            </th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((c) => {
            const activa = c.estado === 'activo';
            return (
              <tr key={c.id}>
                <td>
                  <strong>{c.nombre}</strong>
                </td>
                <td className="tabla__correo">{c.descripcion || '—'}</td>
                <td>{c.controla_lotes ? 'Sí' : 'No'}</td>
                <td className="tabla__num">{c.total_productos}</td>
                <td>
                  <Insignia variante={activa ? 'activo' : 'inactivo'}>{etiquetaEstado(c.estado)}</Insignia>
                </td>
                <td>
                  <div className="tabla__acciones">
                    <Boton variante="secundario" pequeno onClick={() => onEditar(c)} aria-label={`Editar la categoría ${c.nombre}`}>
                      Editar
                    </Boton>
                    <Boton
                      variante={activa ? 'peligro-suave' : 'secundario'}
                      pequeno
                      onClick={() => onCambiarEstado(c)}
                      aria-label={`${activa ? 'Desactivar' : 'Activar'} la categoría ${c.nombre}`}
                    >
                      {activa ? 'Desactivar' : 'Activar'}
                    </Boton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
