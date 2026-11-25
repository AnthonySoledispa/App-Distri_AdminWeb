import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { leerSesion } from '../../services/almacenSesion.js';
import Boton from '../ui/Boton.jsx';
import Alerta from '../ui/Alerta.jsx';

function segundosRestantes() {
  const s = leerSesion();
  if (!s) return 0;
  const limite = (s.inactividadMinutos || 30) * 60_000;
  return Math.max(0, Math.ceil((limite - (Date.now() - (s.ultimaActividad || Date.now()))) / 1000));
}

/** Aviso de cierre próximo por inactividad (60 s antes). Solo una petición renueva la sesión. */
export default function AvisoInactividad() {
  const { seguirConectado, logout, expirarPorInactividad } = useAuth();
  const ref = useRef(null);
  const [segundos, setSegundos] = useState(segundosRestantes);
  const [renovando, setRenovando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialogo = ref.current;
    const origen = document.activeElement;
    if (dialogo && !dialogo.open) {
      dialogo.showModal();
      dialogo.querySelector('[data-foco-inicial]')?.focus();
    }
    return () => {
      if (dialogo?.open) dialogo.close();
      if (origen instanceof HTMLElement && document.contains(origen)) origen.focus();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const restante = segundosRestantes();
      setSegundos(restante);
      if (restante <= 0) expirarPorInactividad();
    }, 1000);
    return () => clearInterval(id);
  }, [expirarPorInactividad]);

  async function seguir() {
    setRenovando(true);
    setError('');
    try {
      await seguirConectado();
    } catch {
      setError('No se pudo renovar la sesión. Intente de nuevo.');
      setRenovando(false);
    }
  }

  const texto = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

  return (
    <dialog
      ref={ref}
      className="modal"
      role="alertdialog"
      aria-labelledby="aviso-titulo"
      aria-describedby="aviso-desc"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="modal__caja">
        <div className="modal__cabecera">
          <h2 id="aviso-titulo">Su sesión está por expirar</h2>
        </div>
        <div className="modal__cuerpo">
          {error && <Alerta tipo="error">{error}</Alerta>}
          <p id="aviso-desc">
            Por inactividad, su sesión se cerrará en{' '}
            <strong aria-live="polite" aria-atomic="true" data-testid="cuenta-regresiva">
              {texto}
            </strong>
            . ¿Desea seguir conectado?
          </p>
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={logout} disabled={renovando}>
            Cerrar sesión
          </Boton>
          <Boton onClick={seguir} cargando={renovando} textoCargando="Renovando…" data-foco-inicial>
            Seguir conectado
          </Boton>
        </div>
      </div>
    </dialog>
  );
}
