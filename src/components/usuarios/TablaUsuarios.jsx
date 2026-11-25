import { etiquetaEstado, etiquetaRol } from '../../utils/validacionesUsuario.js';
import { formatearFecha } from '../../utils/formato.js';
import Insignia from '../ui/Insignia.jsx';
import Boton from '../ui/Boton.jsx';

export default function TablaUsuarios({ usuarios, idActual, ocupado, onEditar, onCambiarEstado }) {
  return (
    <div className="tabla-caja">
      <p className="tabla-contador" aria-live="polite">
        {usuarios.length === 1 ? '1 usuario' : `${usuarios.length} usuarios`}
      </p>
      {usuarios.length === 0 ? (
        <p className="estado-vacio">No hay usuarios que coincidan con los filtros.</p>
      ) : (
        <div className="tabla-scroll" aria-busy={ocupado || undefined}>
          <table className="tabla">
            <caption className="solo-lectores">Lista de usuarios del sistema</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Último acceso</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const propio = u.id === idActual;
                const activo = u.estado === 'activo';
                return (
                  <tr key={u.id}>
                    <td>
                      {u.nombre}
                      {propio && <span className="tabla__yo"> (usted)</span>}
                    </td>
                    <td>{u.correo}</td>
                    <td>
                      <Insignia variante="rol">{etiquetaRol(u.rol)}</Insignia>
                    </td>
                    <td>
                      <Insignia variante={activo ? 'activo' : 'inactivo'}>{etiquetaEstado(u.estado)}</Insignia>
                    </td>
                    <td>{formatearFecha(u.ultimo_acceso)}</td>
                    <td>
                      <div className="tabla__acciones">
                        <Boton
                          variante="secundario"
                          pequeno
                          onClick={() => onEditar(u)}
                          aria-label={`Editar a ${u.nombre}`}
                        >
                          Editar
                        </Boton>
                        {propio && activo ? (
                          <span className="tabla__nota">No puede desactivar su propia cuenta</span>
                        ) : (
                          <Boton
                            variante={activo ? 'peligro' : 'primario'}
                            pequeno
                            onClick={() => onCambiarEstado(u)}
                            aria-label={`${activo ? 'Desactivar' : 'Activar'} a ${u.nombre}`}
                          >
                            {activo ? 'Desactivar' : 'Activar'}
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
