export default function Boton({
  variante = 'primario',
  pequeno = false,
  cargando = false,
  textoCargando,
  type = 'button',
  className = '',
  children,
  disabled,
  ...resto
}) {
  const clases = ['boton', `boton--${variante}`, pequeno ? 'boton--pequeno' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={clases} disabled={disabled || cargando} aria-busy={cargando || undefined} {...resto}>
      {cargando && <span className="giro" aria-hidden="true" />}
      {cargando && textoCargando ? textoCargando : children}
    </button>
  );
}
