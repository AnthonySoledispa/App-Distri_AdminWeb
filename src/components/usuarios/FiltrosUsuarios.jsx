import { useEffect, useRef, useState } from 'react';
import { ROLES, ESTADOS } from '../../utils/validacionesUsuario.js';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import Boton from '../ui/Boton.jsx';

const TODOS = { valor: '', etiqueta: 'Todos' };
const RETARDO_MS = 300;

/** Filtros controlados por la URL. La búsqueda se envía con debounce de 300 ms. */
export default function FiltrosUsuarios({ filtros, onCambiar, onLimpiar }) {
  const [texto, setTexto] = useState(filtros.buscar);
  const ultimoEnviado = useRef(filtros.buscar);
  const temporizador = useRef(null);

  // Si la URL cambia desde fuera (limpiar filtros, atrás/adelante), se refleja en la caja.
  useEffect(() => {
    if (filtros.buscar !== ultimoEnviado.current) {
      ultimoEnviado.current = filtros.buscar;
      setTexto(filtros.buscar);
    }
  }, [filtros.buscar]);

  useEffect(() => {
    const limpio = texto.trim();
    if (limpio === ultimoEnviado.current) return undefined;
    temporizador.current = setTimeout(() => {
      ultimoEnviado.current = limpio;
      onCambiar({ buscar: limpio });
    }, RETARDO_MS);
    return () => clearTimeout(temporizador.current);
  }, [texto, onCambiar]);

  function limpiar() {
    clearTimeout(temporizador.current);
    ultimoEnviado.current = '';
    setTexto('');
    onLimpiar();
  }

  const hayFiltros = Boolean(filtros.rol || filtros.estado || filtros.buscar || texto);

  return (
    <form className="filtros" role="search" aria-label="Filtros de usuarios" onSubmit={(e) => e.preventDefault()}>
      <CampoTexto
        className="filtros__buscar"
        etiqueta="Buscar por nombre o correo"
        type="search"
        name="buscar"
        maxLength={100}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Rol"
        name="rol"
        opciones={[TODOS, ...ROLES]}
        value={filtros.rol}
        onChange={(e) => onCambiar({ rol: e.target.value })}
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Estado"
        name="estado"
        opciones={[TODOS, ...ESTADOS]}
        value={filtros.estado}
        onChange={(e) => onCambiar({ estado: e.target.value })}
      />
      <Boton variante="secundario" onClick={limpiar} disabled={!hayFiltros}>
        Limpiar filtros
      </Boton>
    </form>
  );
}
