const formateador = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Fecha y hora en formato es-EC; "Nunca" si no hay valor. */
export function formatearFecha(valor, vacio = 'Nunca') {
  if (!valor) return vacio;
  const f = new Date(valor);
  if (Number.isNaN(f.getTime())) return vacio;
  return formateador.format(f);
}
