import { etiquetaEstado } from '../../utils/validacionesUsuario.js';
import Insignia from '../ui/Insignia.jsx';
import Boton from '../ui/Boton.jsx';

export default function TablaUnidades({ unidades, ocupado, onEditar, onCambiarEstado }) {
  if (unidades.length === 0) return <p className="estado-vacio">No hay unidades que coincidan con el filtro.</p>;
  return (
    <div className="tabla-scroll" aria-busy={ocupado || undefined}>
      <table className="tabla">
        <caption className="solo-lectores">Lista de unidades de medida</caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Abreviatura</th>
            <th scope="col">Decimales</th>
            <th scope="col" className="tabla__num">
              Productos
            </th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => {
            const activa = u.estado === 'activo';
            return (
              <tr key={u.id}>
                <td>
                  <strong>{u.nombre}</strong>
                </td>
                <td>{u.abreviatura}</td>
                <td>{u.permite_decimales ? 'Permite' : 'Solo enteros'}</td>
                <td className="tabla__num">{u.total_productos}</td>
                <td>
                  <Insignia variante={activa ? 'activo' : 'inactivo'}>{etiquetaEstado(u.estado)}</Insignia>
                </td>
                <td>
                  <div className="tabla__acciones">
                    <Boton variante="secundario" pequeno onClick={() => onEditar(u)} aria-label={`Editar la unidad ${u.nombre}`}>
                      Editar
                    </Boton>
                    <Boton
                      variante={activa ? 'peligro-suave' : 'secundario'}
                      pequeno
                      onClick={() => onCambiarEstado(u)}
                      aria-label={`${activa ? 'Desactivar' : 'Activar'} la unidad ${u.nombre}`}
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
