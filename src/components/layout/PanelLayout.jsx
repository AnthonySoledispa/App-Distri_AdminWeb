import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAuth } from '../../context/useAuth.js';
import BarraLateral from './BarraLateral.jsx';
import Cabecera from './Cabecera.jsx';
import AvisoInactividad from '../sesion/AvisoInactividad.jsx';

const ID_BARRA = 'barra-lateral';

function tituloDe(ruta) {
  if (ruta.startsWith('/usuarios')) return 'Usuarios';
  return 'Inicio';
}

export default function PanelLayout() {
  const { usuario, logout, avisoInactividad } = useAuth();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const botonMenuRef = useRef(null);
  const titulo = tituloDe(pathname);

  useEffect(() => {
    document.title = `${titulo} | DistriGO`;
  }, [titulo]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    function alTeclear(e) {
      if (e.key === 'Escape') {
        setMenuAbierto(false);
        botonMenuRef.current?.focus();
      }
    }
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [menuAbierto]);

  async function cerrarSesion() {
    setCerrando(true);
    await logout();
  }

  return (
    <div className="panel">
      <a href="#contenido" className="enlace-salto">
        Saltar al contenido
      </a>
      <BarraLateral id={ID_BARRA} abierta={menuAbierto} onNavegar={() => setMenuAbierto(false)} />
      <div className="principal">
        <Cabecera
          titulo={titulo}
          usuario={usuario}
          menuAbierto={menuAbierto}
          idMenu={ID_BARRA}
          botonMenuRef={botonMenuRef}
          onAlternarMenu={() => setMenuAbierto((v) => !v)}
          onCerrarSesion={cerrarSesion}
          cerrando={cerrando}
        />
        <main id="contenido" className="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      {avisoInactividad && <AvisoInactividad />}
    </div>
  );
}
