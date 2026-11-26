/**
 * variante: activo | inactivo | rol-* | stock-bajo | stock-ok | por-vencer | vigente | vencido |
 * entrada | salida | ajuste. El texto siempre acompaña al color.
 */
export default function Insignia({ variante, children }) {
  return <span className={`insignia insignia--${variante}`}>{children}</span>;
}
