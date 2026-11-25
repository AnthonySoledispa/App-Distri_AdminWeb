// Credenciales y ayudas comunes de las pruebas e2e.
// Las credenciales se leen de variables E2E_* del entorno y, si faltan, del .env del backend
// (TEST_ADMIN_* y TEST_REPARTIDOR_*). Nunca se imprimen ni se escriben en archivos versionados.
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// Entorno aislado de pruebas: backend en :3100 (lo levanta playwright.config.js).
export const API = (process.env.E2E_API_URL || 'http://localhost:3100/api').replace(/\/+$/, '');

function leerEnvBackend() {
  const ruta = resolve(process.cwd(), '../App_DistriGo_Backen/.env');
  if (!existsSync(ruta)) return {};
  return parseEnv(readFileSync(ruta, 'utf8'));
}

const envBackend = leerEnvBackend();
const leer = (e2e, backend) => process.env[e2e] || envBackend[backend] || '';

export const admin = {
  nombre: leer('E2E_ADMIN_NOMBRE', 'TEST_ADMIN_NOMBRE'),
  correo: leer('E2E_ADMIN_CORREO', 'TEST_ADMIN_CORREO'),
  contrasena: leer('E2E_ADMIN_CONTRASENA', 'TEST_ADMIN_CONTRASENA'),
};

export const repartidor = {
  nombre: leer('E2E_REPARTIDOR_NOMBRE', 'TEST_REPARTIDOR_NOMBRE'),
  correo: leer('E2E_REPARTIDOR_CORREO', 'TEST_REPARTIDOR_CORREO'),
  contrasena: leer('E2E_REPARTIDOR_CONTRASENA', 'TEST_REPARTIDOR_CONTRASENA'),
};

export const hayCredenciales = Boolean(admin.correo && admin.contrasena);
export const hayRepartidor = Boolean(repartidor.correo && repartidor.contrasena);

/** Datos únicos para un usuario de prueba (quedan en la BD). */
export function usuarioNuevo(prefijo = 'e2e') {
  const marca = `${Date.now()}${randomBytes(2).toString('hex')}`;
  return {
    nombre: `E2E Prueba ${marca.slice(-6)}`,
    correo: `${prefijo}.${marca}@prueba.local`,
    contrasena: `Aa1${randomBytes(6).toString('hex')}`,
  };
}

/** Inicio de sesión por la API. Lanza un error genérico (sin datos sensibles) si falla. */
export async function loginApi(request, cred, cliente = 'web') {
  const r = await request.post(`${API}/auth/login`, {
    data: { correo: cred.correo, contrasena: cred.contrasena, cliente },
  });
  const cuerpo = await r.json();
  if (!cuerpo.ok) throw new Error(`Login por API rechazado (${r.status()} ${cuerpo.codigo}).`);
  return cuerpo.data;
}

/** Intento de login por la API que devuelve el cuerpo completo (para comprobar códigos). */
export async function intentarLoginApi(request, cred, cliente = 'web') {
  const r = await request.post(`${API}/auth/login`, {
    data: { correo: cred.correo, contrasena: cred.contrasena, cliente },
  });
  return { estado: r.status(), cuerpo: await r.json() };
}

export function conAuth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Deja la página con sesión iniciada sin pasar por el formulario (ahorra intentos de login). */
export async function entrarComoAdmin(page, request, destino = '/', cred = admin) {
  const datos = await loginApi(request, cred);
  await page.goto('/login');
  await page.evaluate((s) => sessionStorage.setItem('distrigo.sesion', JSON.stringify(s)), {
    token: datos.token,
    usuario: datos.usuario,
    inactividadMinutos: datos.inactividad_minutos,
    ultimaActividad: Date.now(),
  });
  await page.goto(destino);
  return datos;
}

/** Inicio de sesión por el formulario real. */
export async function iniciarSesionUI(page, cred = admin) {
  await page.getByLabel('Correo electrónico').fill(cred.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cred.contrasena);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

/** Crea (o reactiva) el repartidor de prueba si no existe, usando el administrador de prueba. */
export async function asegurarRepartidor(request) {
  const datos = await loginApi(request, admin);
  const lista = await (await request.get(`${API}/usuarios`, conAuth(datos.token))).json();
  const existente = lista.data.find((u) => u.correo === repartidor.correo.toLowerCase());
  if (!existente) {
    await request.post(`${API}/usuarios`, {
      ...conAuth(datos.token),
      data: { nombre: repartidor.nombre || 'Repartidor de prueba', correo: repartidor.correo, contrasena: repartidor.contrasena, rol: 'repartidor' },
    });
  } else if (existente.estado !== 'activo') {
    await request.patch(`${API}/usuarios/${existente.id}/estado`, { ...conAuth(datos.token), data: { estado: 'activo' } });
  }
}

export const TEXTO = {
  genericoLogin: 'Correo o contraseña incorrectos.',
  inactividad: 'Su sesión expiró por inactividad.',
  sesionCerrada: 'Su sesión fue cerrada. Inicie sesión nuevamente.',
  logout: 'Sesión cerrada correctamente.',
};
