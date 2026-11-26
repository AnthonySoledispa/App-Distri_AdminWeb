// Ayudas de las pruebas del Módulo 2: crean datos por la API con nombres de marca única.
// Los datos quedan en la BD de pruebas (los productos con movimientos no pueden borrarse, RB-05).
import { randomBytes } from 'node:crypto';
import { API, admin, conAuth, loginApi } from './credenciales.js';

export const ZONA = 'America/Guayaquil';

export function marca() {
  return `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
}

/** Fecha 'YYYY-MM-DD' del negocio (hoy + n días). */
export function diaNegocio(n = 0) {
  const base = new Date(Date.now() + n * 86_400_000);
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(base);
  const g = (t) => partes.find((p) => p.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' (igual que la interfaz). */
export const enPantalla = (iso) => iso.split('-').reverse().join('/');

export async function tokenAdmin(request) {
  return (await loginApi(request, admin)).token;
}

async function enviar(request, metodo, ruta, token, datos) {
  const r = await request[metodo](`${API}${ruta}`, { ...conAuth(token), data: datos });
  const cuerpo = await r.json();
  if (!cuerpo.ok) throw new Error(`${metodo.toUpperCase()} ${ruta} falló (${r.status()} ${cuerpo.codigo}).`);
  return cuerpo.data;
}

export async function crearUnidadApi(request, token, { decimales = false, nombre, abreviatura } = {}) {
  const m = marca();
  return enviar(request, 'post', '/unidades-medida', token, {
    nombre: nombre ?? `E2E Unidad ${m}`,
    abreviatura: abreviatura ?? `u${m.slice(-6)}`,
    permite_decimales: decimales,
  });
}

export async function crearCategoriaApi(request, token, { lotes = false, nombre } = {}) {
  return enviar(request, 'post', '/categorias', token, {
    nombre: nombre ?? `E2E Categoria ${marca()}`,
    controla_lotes: lotes,
  });
}

/** Crea el producto. `stock_inicial`, `codigo_lote` y `fecha_caducidad` son opcionales. */
export async function crearProductoApi(request, token, { categoria, unidad, ...resto }) {
  return enviar(request, 'post', '/productos', token, {
    nombre: `E2E Producto ${marca()}`,
    categoria_id: categoria.id,
    unidad_id: unidad.id,
    precio_venta: 10,
    stock_minimo: 0,
    ...resto,
  });
}

export async function entradaApi(request, token, datos) {
  return enviar(request, 'post', '/inventario/entradas', token, datos);
}

export async function ajusteApi(request, token, datos) {
  return enviar(request, 'post', '/inventario/ajustes', token, datos);
}

export async function estadoProductoApi(request, token, id, estado) {
  return enviar(request, 'patch', `/productos/${id}/estado`, token, { estado });
}

export async function estadoCategoriaApi(request, token, id, estado) {
  return enviar(request, 'patch', `/categorias/${id}/estado`, token, { estado });
}

export async function estadoUnidadApi(request, token, id, estado) {
  return enviar(request, 'patch', `/unidades-medida/${id}/estado`, token, { estado });
}

export async function obtenerProductoApi(request, token, id) {
  const r = await request.get(`${API}/productos/${id}`, conAuth(token));
  return (await r.json()).data;
}

export async function alertasApi(request, token) {
  const r = await request.get(`${API}/inventario/alertas`, conAuth(token));
  return (await r.json()).data;
}

/** Unidad entera + categoría sin lotes: lo mínimo para crear productos. */
export async function datosBase(request, token, { decimales = false, lotes = false } = {}) {
  const unidad = await crearUnidadApi(request, token, { decimales });
  const categoria = await crearCategoriaApi(request, token, { lotes });
  return { unidad, categoria };
}
