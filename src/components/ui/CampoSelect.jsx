import { useId } from 'react';

export default function CampoSelect({ etiqueta, opciones, error, ayuda, className = '', id: idExterno, ...select }) {
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
      <select
        id={id}
        className="entrada"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descritoPor}
        {...select}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
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
