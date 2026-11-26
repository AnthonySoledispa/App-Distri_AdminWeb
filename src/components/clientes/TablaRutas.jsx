import { Link } from 'react-router';
import { etiquetaEstado } from '../../utils/validacionesUsuario.js';
import Insignia from '../ui/Insignia.jsx';
import Boton from '../ui/Boton.jsx';

export default function TablaRutas({ rutas, ocupado, vacioTexto, onEditar, onCambiarEstado }) {
  if (rutas.length === 0) return <p className="estado-vacio">{vacioTexto}</p>;
  return (
    <div className="tabla-scroll" aria-busy={ocupado || undefined}>
      <table className="tabla">
        <caption className="solo-lectores">Lista de rutas de reparto</caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Descripción</th>
            <th scope="col">Tiendas</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rutas.map((r) => {
            const activo = r.estado === 'activo';
            return (
              <tr key={r.id}>
                <td>
                  <strong>{r.nombre}</strong>
                </td>
                <td className="tabla__observacion">{r.descripcion || '—'}</td>
                <td>
                  <Link
                    to={`/tiendas?ruta_id=${r.id}`}
                    className="tabla__enlace"
                    aria-label={`Ver tiendas de la ruta ${r.nombre}: ${r.clientes_activos} activas de ${r.total_clientes}`}
                  >
                    {r.clientes_activos} de {r.total_clientes}
                  </Link>
                </td>
                <td>
                  <Insignia variante={activo ? 'activo' : 'inactivo'}>{etiquetaEstado(r.estado)}</Insignia>
                </td>
                <td>
                  <div className="tabla__acciones">
                    <Boton
                      variante="secundario"
                      pequeno
                      onClick={() => onEditar(r)}
                      aria-label={`Editar la ruta ${r.nombre}`}
                    >
                      Editar
                    </Boton>
                    <Boton
                      variante={activo ? 'peligro-suave' : 'secundario'}
                      pequeno
                      onClick={() => onCambiarEstado(r)}
                      aria-label={`${activo ? 'Desactivar' : 'Activar'} la ruta ${r.nombre}`}
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
  );
}
