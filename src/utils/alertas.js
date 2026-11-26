/** Suma los tres totales de alertas; tolera nulos. */
export function totalAlertas(totales) {
  if (!totales) return 0;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return n(totales.stock_bajo) + n(totales.por_vencer) + n(totales.vencidos);
}

/** Texto accesible del contador; cadena vacía si no hay alertas. */
export function textoContador(n) {
  if (!n || n < 1) return '';
  return n === 1 ? '1 alerta de inventario' : `${n} alertas de inventario`;
}
