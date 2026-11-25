import { useEffect } from 'react';
import { Link } from 'react-router';
import logo from '../assets/logo-distrigo.png';

export default function NoEncontradoPage() {
  useEffect(() => {
    document.title = 'Página no encontrada | DistriGO';
  }, []);
  return (
    <main className="pantalla-centro">
      <div className="pantalla-centro__caja">
        <img src={logo} alt="" width="96" height="96" />
        <h1>Página no encontrada</h1>
        <p>La dirección que intentó abrir no existe en el panel.</p>
        <Link to="/" className="boton boton--primario">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
