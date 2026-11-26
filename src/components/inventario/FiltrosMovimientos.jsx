import { MOTIVOS_FILTRO, TIPOS_MOVIMIENTO } from '../../utils/validacionesInventario.js';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import Boton from '../ui/Boton.jsx';

const TODOS = { valor: '', etiqueta: 'Todos' };

/** Filtros de movimientos controlados por la URL. `errorRango` es el aviso de desde > hasta. */
export default function FiltrosMovimientos({ filtros, productos, errorRango, onCambiar, onLimpiar }) {
  const hayFiltros = Boolean(
    filtros.producto_id || filtros.tipo || filtros.motivo || filtros.desde || filtros.hasta,
  );
  return (
    <form className="filtros" role="search" aria-label="Filtros de movimientos" onSubmit={(e) => e.preventDefault()}>
      <CampoSelect
        className="filtros__select"
        etiqueta="Producto"
        name="producto_id"
        opciones={[
          { valor: '', etiqueta: 'Todos' },
          ...productos.map((p) => ({ valor: String(p.id), etiqueta: p.nombre })),
        ]}
        value={filtros.producto_id}
        onChange={(e) => onCambiar({ producto_id: e.target.value, pagina: '' })}
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Tipo"
        name="tipo"
        opciones={[TODOS, ...TIPOS_MOVIMIENTO]}
        value={filtros.tipo}
        onChange={(e) => onCambiar({ tipo: e.target.value, pagina: '' })}
      />
      <CampoSelect
        className="filtros__select"
        etiqueta="Motivo"
        name="motivo"
        opciones={[TODOS, ...MOTIVOS_FILTRO]}
        value={filtros.motivo}
        onChange={(e) => onCambiar({ motivo: e.target.value, pagina: '' })}
      />
      <CampoTexto
        className="filtros__select"
        etiqueta="Desde"
        name="desde"
        type="date"
        value={filtros.desde}
        onChange={(e) => onCambiar({ desde: e.target.value, pagina: '' })}
        error={errorRango}
      />
      <CampoTexto
        className="filtros__select"
        etiqueta="Hasta"
        name="hasta"
        type="date"
        value={filtros.hasta}
        onChange={(e) => onCambiar({ hasta: e.target.value, pagina: '' })}
      />
      <Boton variante="secundario" onClick={onLimpiar} disabled={!hayFiltros}>
        Limpiar filtros
      </Boton>
    </form>
  );
}
