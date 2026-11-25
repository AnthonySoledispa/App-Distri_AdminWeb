import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/useAuth.js';
import Cargando from '../components/ui/Cargando.jsx';
import Boton from '../components/ui/Boton.jsx';

export default function RutaProtegida() {
  const { estado, verificar } = useAuth();
  const ubicacion = useLocation();

  if (estado === 'verificando') {
    return (
      <div className="pantalla-centro">
        <Cargando texto="Verificando sesión…" />
      </div>
    );
  }

  if (estado === 'errorConexion') {
    return (
      <div className="pantalla-centro">
        <div className="pantalla-centro__caja" role="alert">
          <h1>No se pudo conectar con el servidor</h1>
          <p>Verifique su conexión e intente de nuevo. Su sesión no se ha cerrado.</p>
          <Boton onClick={verificar}>Reintentar</Boton>
        </div>
      </div>
    );
  }

  if (estado !== 'autenticado') {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }

  return <Outlet />;
}
