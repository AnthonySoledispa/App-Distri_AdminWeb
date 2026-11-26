import { useId } from 'react';

/** Área de texto con contador de caracteres cuando se indica maxLength. */
export default function CampoArea({ etiqueta, error, ayuda, className = '', id: idExterno, value = '', maxLength, ...area }) {
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
      <textarea
        id={id}
        className="entrada area"
        rows={3}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descritoPor}
        {...area}
      />
      {maxLength && (
        <span className="area__contador" aria-hidden="true">
          {String(value).length}/{maxLength}
        </span>
      )}
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
