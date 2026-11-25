import { Link } from 'react-router';
import { useAuth } from '../context/useAuth.js';

export default function InicioPage() {
  const { usuario } = useAuth();
  return (
    <>
      <div className="pagina__encabezado">
        <div>
          <h2>Bienvenido, {usuario?.nombre}</h2>
          <p>Panel de administración de DistriGO.</p>
        </div>
      </div>
      <div className="rejilla-tarjetas">
        <section className="tarjeta" aria-labelledby="tarjeta-usuarios">
          <h3 id="tarjeta-usuarios">Usuarios</h3>
          <p>Cree cuentas, edite datos, cambie roles y active o desactive el acceso.</p>
          <Link to="/usuarios" className="boton boton--primario">
            Gestionar usuarios
          </Link>
        </section>
      </div>
      <p className="nota">Las demás secciones se habilitarán en próximas versiones.</p>
    </>
  );
}
