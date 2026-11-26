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

const monedaUSD = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
const numero = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 3 });

/** Dinero en dólares: 12.5 -> "$12,50". */
export function formatearMoneda(valor) {
  const n = Number(valor);
  if (valor === null || valor === undefined || Number.isNaN(n)) return '—';
  return monedaUSD.format(n);
}

/** Cantidad con coma decimal y la abreviatura de la unidad: (2.5, 'L') -> "2,5 L". */
export function formatearCantidad(valor, abreviatura = '') {
  const n = Number(valor);
  if (valor === null || valor === undefined || Number.isNaN(n)) return '—';
  const texto = numero.format(n);
  return abreviatura ? `${texto} ${abreviatura}` : texto;
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin pasar por Date (evita el desfase por zona horaria). */
export function formatearDia(iso, vacio = '—') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return vacio;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Fecha local del navegador como 'YYYY-MM-DD'. */
export function hoyLocalISO(ahora = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}
