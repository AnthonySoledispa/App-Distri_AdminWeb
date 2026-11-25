const ICONOS = { error: '!', exito: '✓', aviso: '!', info: 'i' };

/** tipo: error | exito | aviso | info. El icono y el texto evitan depender solo del color. */
export default function Alerta({ tipo = 'error', role, className = '', children, ...resto }) {
  const rol = role ?? (tipo === 'error' ? 'alert' : 'status');
  return (
    <div className={`alerta alerta--${tipo} ${className}`.trim()} role={rol} {...resto}>
      <span className="alerta__icono" aria-hidden="true">
        {ICONOS[tipo]}
      </span>
      <div>{children}</div>
    </div>
  );
}
