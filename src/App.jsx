import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import RutaProtegida from './routes/RutaProtegida.jsx';
import RutaPublica from './routes/RutaPublica.jsx';
import PanelLayout from './components/layout/PanelLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import InicioPage from './pages/InicioPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import ProductosPage from './pages/ProductosPage.jsx';
import ProductoDetallePage from './pages/ProductoDetallePage.jsx';
import MovimientosPage from './pages/MovimientosPage.jsx';
import AlertasInventarioPage from './pages/AlertasInventarioPage.jsx';
import CategoriasUnidadesPage from './pages/CategoriasUnidadesPage.jsx';
import TiendasPage from './pages/TiendasPage.jsx';
import TiendaDetallePage from './pages/TiendaDetallePage.jsx';
import RutasPage from './pages/RutasPage.jsx';
import NoEncontradoPage from './pages/NoEncontradoPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RutaPublica />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<RutaProtegida />}>
            <Route path="/" element={<PanelLayout />}>
              <Route index element={<InicioPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="productos" element={<ProductosPage />} />
              <Route path="productos/movimientos" element={<MovimientosPage />} />
              <Route path="productos/alertas" element={<AlertasInventarioPage />} />
              <Route path="productos/categorias" element={<CategoriasUnidadesPage />} />
              <Route path="productos/:id" element={<ProductoDetallePage />} />
              <Route path="tiendas" element={<TiendasPage />} />
              <Route path="tiendas/rutas" element={<RutasPage />} />
              <Route path="tiendas/:id" element={<TiendaDetallePage />} />
            </Route>
          </Route>
          <Route path="*" element={<NoEncontradoPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
