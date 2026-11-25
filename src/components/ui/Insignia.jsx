/** variante: activo | inactivo | rol. El texto siempre acompaña al color. */
export default function Insignia({ variante, children }) {
  return <span className={`insignia insignia--${variante}`}>{children}</span>;
}
