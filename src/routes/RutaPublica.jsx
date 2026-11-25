import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/useAuth.js';
import Cargando from '../components/ui/Cargando.jsx';

export default function RutaPublica() {
  const { estado } = useAuth();
  const ubicacion = useLocation();

  if (estado === 'verificando') {
    return (
      <div className="pantalla-centro">
        <Cargando texto="Verificando sesión…" />
      </div>
    );
  }
  if (estado === 'autenticado') return <Navigate to={ubicacion.state?.desde || '/'} replace />;
  return <Outlet />;
}
