import Boton from './Boton.jsx';

/** "Página X de Y" con botones Anterior y Siguiente. No se dibuja con una sola página. */
export default function Paginacion({ pagina, total, limite, onCambiar, ocupado = false }) {
  const paginas = Math.max(1, Math.ceil(total / limite));
  if (paginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <Boton
        variante="secundario"
        pequeno
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1 || ocupado}
        aria-label="Página anterior"
      >
        Anterior
      </Boton>
      <span aria-live="polite">
        Página {pagina} de {paginas}
      </span>
      <Boton
        variante="secundario"
        pequeno
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= paginas || ocupado}
        aria-label="Página siguiente"
      >
        Siguiente
      </Boton>
    </nav>
  );
}
