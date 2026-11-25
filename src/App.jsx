import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import RutaProtegida from './routes/RutaProtegida.jsx';
import RutaPublica from './routes/RutaPublica.jsx';
import PanelLayout from './components/layout/PanelLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import InicioPage from './pages/InicioPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
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
            </Route>
          </Route>
          <Route path="*" element={<NoEncontradoPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
