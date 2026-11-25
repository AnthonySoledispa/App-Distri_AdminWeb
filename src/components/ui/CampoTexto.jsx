import { useId } from 'react';

export default function CampoTexto({ etiqueta, error, ayuda, accion, className = '', id: idExterno, ...entrada }) {
  const generado = useId();
  const id = idExterno || `campo-${generado}`;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const descritoPor = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`campo ${className}`.trim()}>
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
      </label>
      <div className="campo__control">
        <input
          id={id}
          className="entrada"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={descritoPor}
          {...entrada}
        />
        {accion}
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
