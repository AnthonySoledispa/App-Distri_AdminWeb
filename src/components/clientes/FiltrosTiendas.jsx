import { useEffect, useRef, useState } from 'react';
import { ESTADOS } from '../../utils/validacionesUsuario.js';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import Boton from '../ui/Boton.jsx';

const TODOS = { valor: '', etiqueta: 'Todos' };
const RETARDO_MS = 300;

/** Valor del select de ruta a partir de los parámetros de la URL. */
export const valorRuta = (filtros) => (filtros.sin_ruta === 'true' ? 'sin' : filtros.ruta_id);

/** Filtros de tiendas controlados por la URL (buscar con debounce de 300 ms; ruta_id o sin_ruta). */
export default function FiltrosTiendas({ filtros, rutas, onCambiar, onLimpiar }) {
  const [texto, setTexto] = useState(filtros.buscar);
  const ultimoEnviado = useRef(filtros.buscar);
  const temporizador = useRef(null);

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

  function cambiarRuta(valor) {
    if (valor === 'sin') onCambiar({ ruta_id: '', sin_ruta: 'true' });
    else onCambiar({ ruta_id: valor, sin_ruta: '' });
  }

  const hayFiltros = Boolean(filtros.ruta_id || filtros.sin_ruta || filtros.estado || filtros.buscar || texto);

  return (
    <form className="filtros" role="search" aria-label="Filtros de tiendas" onSubmit={(e) => e.preventDefault()}>
      <CampoTexto
        className="filtros__buscar"
        etiqueta="Buscar por nombre, contacto, teléfono o ruta"
        type="search"
        name="buscar"
        maxLength={100}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Ruta"
        name="ruta"
        opciones={[
          { valor: '', etiqueta: 'Todas' },
          { valor: 'sin', etiqueta: 'Sin ruta' },
          ...rutas.map((r) => ({ valor: String(r.id), etiqueta: r.estado === 'activo' ? r.nombre : `${r.nombre} (inactiva)` })),
        ]}
        value={valorRuta(filtros)}
        onChange={(e) => cambiarRuta(e.target.value)}
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
