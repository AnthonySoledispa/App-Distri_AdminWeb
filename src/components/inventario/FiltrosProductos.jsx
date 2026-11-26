import { useEffect, useRef, useState } from 'react';
import { ESTADOS } from '../../utils/validacionesUsuario.js';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import CampoCasilla from '../ui/CampoCasilla.jsx';
import Boton from '../ui/Boton.jsx';

const TODOS = { valor: '', etiqueta: 'Todos' };
const RETARDO_MS = 300;

/** Filtros de productos controlados por la URL. La búsqueda se envía con debounce de 300 ms. */
export default function FiltrosProductos({ filtros, categorias, onCambiar, onLimpiar }) {
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

  const hayFiltros = Boolean(
    filtros.categoria_id || filtros.estado || filtros.buscar || filtros.stock_bajo || texto,
  );

  return (
    <form className="filtros" role="search" aria-label="Filtros de productos" onSubmit={(e) => e.preventDefault()}>
      <CampoTexto
        className="filtros__buscar"
        etiqueta="Buscar por nombre o SKU"
        type="search"
        name="buscar"
        maxLength={100}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Categoría"
        name="categoria_id"
        opciones={[{ valor: '', etiqueta: 'Todas' }, ...categorias.map((c) => ({ valor: String(c.id), etiqueta: c.nombre }))]}
        value={filtros.categoria_id}
        onChange={(e) => onCambiar({ categoria_id: e.target.value })}
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Estado"
        name="estado"
        opciones={[TODOS, ...ESTADOS]}
        value={filtros.estado}
        onChange={(e) => onCambiar({ estado: e.target.value })}
      />
      <div className="filtros__casilla">
        <CampoCasilla
          etiqueta="Solo stock bajo"
          name="stock_bajo"
          checked={filtros.stock_bajo === 'true'}
          onChange={(e) => onCambiar({ stock_bajo: e.target.checked ? 'true' : '' })}
        />
      </div>
      <Boton variante="secundario" onClick={limpiar} disabled={!hayFiltros}>
        Limpiar filtros
      </Boton>
    </form>
  );
}
