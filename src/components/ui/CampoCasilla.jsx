import { useId } from 'react';

/** Casilla con etiqueta, ayuda y error asociados (mismo patrón accesible que CampoTexto). */
export default function CampoCasilla({ etiqueta, error, ayuda, className = '', id: idExterno, ...entrada }) {
  const generado = useId();
  const id = idExterno || `campo-${generado}`;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const descritoPor = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`campo casilla ${className}`.trim()}>
      <div className="casilla__fila">
        <input
          id={id}
          type="checkbox"
          className="casilla__entrada"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={descritoPor}
          {...entrada}
        />
        <label htmlFor={id} className="campo__etiqueta">
          {etiqueta}
        </label>
      </div>
      {ayuda && (
        <span id={idAyuda} className="campo__ayuda">
          {ayuda}
        </span>
      )}
      {error && (
        <span id={idError} className="campo__error">
          {error}
        </span>
      )}
    </div>
  );
}
