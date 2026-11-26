// Ayudas de las pruebas del Módulo 3: crean rutas y tiendas por la API con nombres "E2E ..." de marca única.
// El globalTeardown las borra (el script del backend elimina clientes y rutas cuyo nombre empieza por "E2E ").
import { API, conAuth } from './credenciales.js';
import { marca } from './datosInventario.js';

export { marca, tokenAdmin } from './datosInventario.js';

async function enviar(request, metodo, ruta, token, datos) {
  const r = await request[metodo](`${API}${ruta}`, { ...conAuth(token), data: datos });
  const cuerpo = await r.json();
  if (!cuerpo.ok) throw new Error(`${metodo.toUpperCase()} ${ruta} falló (${r.status()} ${cuerpo.codigo}).`);
  return cuerpo.data;
}

export const crearRutaApi = (request, token, { nombre, descripcion } = {}) =>
  enviar(request, 'post', '/rutas', token, { nombre: nombre ?? `E2E Ruta ${marca()}`, ...(descripcion ? { descripcion } : {}) });

export const crearClienteApi = (request, token, datos = {}) =>
  enviar(request, 'post', '/clientes', token, {
    nombre: `E2E Tienda ${marca()}`,
    contacto: 'Contacto Prueba',
    telefono: '0991234567',
    direccion: 'Calle Falsa 123',
    limite_credito: 100,
    ...datos,
  });

export const estadoRutaApi = (request, token, id, estado) => enviar(request, 'patch', `/rutas/${id}/estado`, token, { estado });
export const estadoClienteApi = (request, token, id, estado) =>
  enviar(request, 'patch', `/clientes/${id}/estado`, token, { estado });

export async function obtenerClienteApi(request, token, id) {
  const r = await request.get(`${API}/clientes/${id}`, conAuth(token));
  return (await r.json()).data;
}

export const json = (cuerpo, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(cuerpo),
});

/** Tienda con la forma de la API (para respuestas simuladas). */
export function tiendaSimulada(extra = {}) {
  return {
    id: 987654,
    nombre: 'E2E Tienda Simulada',
    contacto: 'Contacto Simulado',
    telefono: '0991234567',
    direccion: 'Calle Simulada 123',
    ruta_id: null,
    ruta_nombre: null,
    ruta_estado: null,
    limite_credito: 100,
    saldo_pendiente: 0,
    credito_disponible: 100,
    credito_excedido: false,
    estado: 'activo',
    creado_por: 1,
    creado_en: '2026-11-26T10:00:00.000Z',
    actualizado_en: '2026-11-26T10:00:00.000Z',
    ...extra,
  };
}
