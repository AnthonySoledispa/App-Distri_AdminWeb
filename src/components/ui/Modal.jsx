import { useEffect, useId, useRef } from 'react';

/**
 * Modal sobre <dialog> nativo. Se monta solo cuando está abierto (el padre lo renderiza
 * condicionalmente). Esc lo cierra salvo que `bloqueado` sea true, y el foco vuelve
 * al elemento que lo abrió. Dentro, un elemento con `data-foco-inicial` recibe el foco.
 */
export default function Modal({ titulo, onCerrar, bloqueado = false, role = 'dialog', children }) {
  const ref = useRef(null);
  const idTitulo = useId();
  const cerrarRef = useRef(onCerrar);
  const bloqueadoRef = useRef(bloqueado);
  cerrarRef.current = onCerrar;
  bloqueadoRef.current = bloqueado;

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

  function alCancelar(e) {
    e.preventDefault(); // el cierre lo decide React
    if (!bloqueadoRef.current) cerrarRef.current?.();
  }

  return (
    <dialog ref={ref} className="modal" role={role} aria-labelledby={idTitulo} onCancel={alCancelar}>
      <div className="modal__caja">
        <div className="modal__cabecera">
          <h2 id={idTitulo}>{titulo}</h2>
          <button
            type="button"
            className="modal__cerrar"
            aria-label="Cerrar"
            onClick={() => !bloqueado && onCerrar?.()}
            disabled={bloqueado}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
