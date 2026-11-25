import { test, expect } from '@playwright/test';
import {
  API,
  admin,
  asegurarRepartidor,
  conAuth,
  entrarComoAdmin,
  hayCredenciales,
  hayRepartidor,
  intentarLoginApi,
  loginApi,
  repartidor,
  usuarioNuevo,
} from './credenciales.js';

test.describe.configure({ mode: 'serial' });

const fila = (page, correo) => page.getByRole('row').filter({ hasText: correo });

async function abrirNuevo(page) {
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Nuevo usuario' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

async function llenar(dialogo, { nombre, correo, contrasena, confirmacion = contrasena, rol }) {
  if (nombre !== undefined) await dialogo.getByLabel('Nombre').fill(nombre);
  if (correo !== undefined) await dialogo.getByLabel('Correo electrónico').fill(correo);
  if (rol) await dialogo.getByLabel('Rol').selectOption(rol);
  if (contrasena !== undefined) await dialogo.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  if (confirmacion !== undefined) await dialogo.getByLabel('Confirmar contraseña').fill(confirmacion);
}

test.describe('Gestión de usuarios (RF-04, RF-07, RF-08)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  const nuevo = usuarioNuevo();
  let contrasenaActual = nuevo.contrasena;
  let nombreActual = nuevo.nombre;

  test.beforeEach(async ({ page, request }) => {
    await entrarComoAdmin(page, request, '/usuarios');
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('W19: lista con "(usted)", filtros, URL y estado vacío', async ({ page }) => {
    await expect(page.getByText('(usted)')).toHaveCount(1);
    await expect(page.getByText(/^\d+ usuarios?$/)).toBeVisible();

    await page.getByLabel('Rol').selectOption('administrador');
    await expect(page).toHaveURL(/rol=administrador/);
    // La URL cambia antes de que llegue la lista filtrada: esperar a que la tabla se actualice.
    await expect
      .poll(async () => {
        const roles = await page.locator('tbody tr td:nth-child(3)').allTextContents();
        return roles.length > 0 && roles.every((r) => r.includes('Administrador'));
      })
      .toBe(true);

    await page.getByLabel('Estado').selectOption('inactivo');
    await expect(page).toHaveURL(/estado=inactivo/);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).not.toHaveURL(/rol=|estado=/);

    await page.getByLabel('Buscar por nombre o correo').fill('zzz-no-existe-xyz');
    await expect(page).toHaveURL(/buscar=zzz-no-existe-xyz/);
    await expect(page.getByText('No hay usuarios que coincidan con los filtros.')).toBeVisible();
  });

  test('W19b: Limpiar filtros antes del debounce vacía la búsqueda y no la aplica', async ({ page }) => {
    const caja = page.getByLabel('Buscar por nombre o correo');
    await caja.fill('zzz-pendiente');
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(caja).toHaveValue('');
    await page.waitForTimeout(600);
    await expect(caja).toHaveValue('');
    await expect(page).not.toHaveURL(/buscar=/);
  });

  test('W20: crear un repartidor', async ({ page }) => {
    const dialogo = await abrirNuevo(page);
    await llenar(dialogo, { ...nuevo, rol: 'repartidor' });
    await dialogo.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Usuario creado' })).toBeVisible();
    await expect(dialogo).toBeHidden();
    await expect(fila(page, nuevo.correo)).toBeVisible();
    await expect(fila(page, nuevo.correo)).toContainText('Repartidor');
  });

  test('W21: correo duplicado muestra el error en el campo', async ({ page }) => {
    const dialogo = await abrirNuevo(page);
    const otro = usuarioNuevo();
    await llenar(dialogo, { nombre: otro.nombre, correo: nuevo.correo, contrasena: otro.contrasena, rol: 'repartidor' });
    await dialogo.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(dialogo.getByText('Ya existe un usuario con ese correo.')).toBeVisible();
    await expect(dialogo.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
  });

  test('W22: contraseña débil o confirmación distinta no hacen petición', async ({ page }) => {
    let posts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/api\/usuarios$/.test(r.url())) posts += 1;
    });
    const dialogo = await abrirNuevo(page);
    const otro = usuarioNuevo();
    await llenar(dialogo, { nombre: otro.nombre, correo: otro.correo, contrasena: 'abcdefgh', rol: 'repartidor' });
    await dialogo.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(dialogo.getByText('La contraseña debe contener al menos una letra y un número.')).toBeVisible();

    await dialogo.getByLabel('Contraseña', { exact: true }).fill('abc12345');
    await dialogo.getByLabel('Confirmar contraseña').fill('abc12346');
    await dialogo.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(dialogo.getByText('Las contraseñas no coinciden.')).toBeVisible();
    expect(posts).toBe(0);
  });

  test('W23: errores 400 del backend se muestran en su campo', async ({ page }) => {
    await page.route(/\/api\/usuarios$/, (ruta) => {
      if (ruta.request().method() !== 'POST') return ruta.fallback();
      return ruta.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          codigo: 'VALIDACION',
          mensaje: 'Datos invalidos',
          errores: [
            { campo: 'nombre', mensaje: 'Mensaje simulado del nombre.' },
            { campo: 'cuerpo', mensaje: 'Mensaje simulado general.' },
          ],
        }),
      });
    });
    const dialogo = await abrirNuevo(page);
    const otro = usuarioNuevo();
    await llenar(dialogo, { ...otro, rol: 'repartidor' });
    await dialogo.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(dialogo.getByText('Mensaje simulado del nombre.')).toBeVisible();
    await expect(dialogo.getByRole('alert')).toContainText('Mensaje simulado general.');
  });

  test('W24: al editar, el PUT lleva solo los campos cambiados', async ({ page }) => {
    await fila(page, nuevo.correo).getByRole('button', { name: /^Editar/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar usuario' });
    nombreActual = `${nuevo.nombre} Editado`;
    await dialogo.getByLabel('Nombre').fill(nombreActual);
    const peticion = page.waitForRequest((r) => r.method() === 'PUT' && /\/api\/usuarios\/\d+$/.test(r.url()));
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    const cuerpo = (await peticion).postDataJSON();
    expect(cuerpo).toEqual({ nombre: nombreActual });
    await expect(page.getByRole('status').filter({ hasText: 'Usuario actualizado' })).toBeVisible();
    await expect(fila(page, nuevo.correo)).toContainText(nombreActual);
  });

  test('W25: sin cambios no se llama a la API', async ({ page }) => {
    let puts = 0;
    page.on('request', (r) => {
      if (r.method() === 'PUT') puts += 1;
    });
    await fila(page, nuevo.correo).getByRole('button', { name: /^Editar/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar usuario' });
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialogo.getByText('No hay cambios para guardar.')).toBeVisible();
    expect(puts).toBe(0);
  });

  test('W26: cambiar la contraseña de otro avisa y la nueva clave funciona', async ({ page, request }) => {
    await fila(page, nuevo.correo).getByRole('button', { name: /^Editar/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar usuario' });
    const nueva = `Cc3${nuevo.contrasena}`;
    await dialogo.getByLabel('Nueva contraseña').fill(nueva);
    await dialogo.getByLabel('Confirmar contraseña').fill(nueva);
    await expect(dialogo.getByText('Se cerrarán las sesiones abiertas de este usuario.')).toBeVisible();
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Usuario actualizado' })).toBeVisible();
    contrasenaActual = nueva;

    const { estado } = await intentarLoginApi(request, { correo: nuevo.correo, contrasena: contrasenaActual }, 'movil');
    expect(estado).toBe(200);
  });

  test('W27: editar el propio usuario bloquea el rol y actualiza la cabecera', async ({ page }) => {
    const propia = page.getByRole('row').filter({ hasText: '(usted)' });
    const nombreOriginal = (await propia.locator('td').first().innerText()).replace('(usted)', '').trim();
    const nombreTemporal = `${nombreOriginal} E2E`.slice(0, 100);

    await propia.getByRole('button', { name: /^Editar/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar usuario' });
    await expect(dialogo.getByLabel('Rol')).toBeDisabled();
    await expect(dialogo.getByText('No puede cambiar su propio rol')).toBeVisible();

    try {
      await dialogo.getByLabel('Nombre').fill(nombreTemporal);
      await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Usuario actualizado' })).toBeVisible();
      await expect(page.locator('.cabecera__usuario strong')).toHaveText(nombreTemporal);
    } finally {
      // Se restaura el nombre original del administrador de prueba.
      await page.getByRole('row').filter({ hasText: '(usted)' }).getByRole('button', { name: /^Editar/ }).click();
      const d2 = page.getByRole('dialog', { name: 'Editar usuario' });
      await d2.getByLabel('Nombre').fill(nombreOriginal);
      await d2.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.locator('.cabecera__usuario strong')).toHaveText(nombreOriginal);
    }
  });

  test('W28: desactivar pide confirmación, se puede cancelar y bloquea el login', async ({ page, request }) => {
    const botonDesactivar = () => fila(page, nuevo.correo).getByRole('button', { name: /^Desactivar/ });
    await botonDesactivar().click();
    const dialogo = page.getByRole('dialog', { name: 'Desactivar usuario' });
    await expect(dialogo).toContainText('No podrá iniciar sesión y se cerrarán sus sesiones abiertas.');
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();

    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toBeHidden();
    await expect(fila(page, nuevo.correo)).toContainText('Activo');

    await botonDesactivar().click();
    await dialogo.getByRole('button', { name: 'Desactivar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Usuario desactivado' })).toBeVisible();
    await expect(fila(page, nuevo.correo)).toContainText('Inactivo');

    const { estado, cuerpo } = await intentarLoginApi(request, { correo: nuevo.correo, contrasena: contrasenaActual }, 'movil');
    expect(estado).toBe(403);
    expect(cuerpo.codigo).toBe('USUARIO_INACTIVO');
  });

  test('W29: reactivar permite volver a iniciar sesión', async ({ page, request }) => {
    await fila(page, nuevo.correo).getByRole('button', { name: /^Activar/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Activar usuario' });
    await expect(dialogo).toContainText('Podrá volver a iniciar sesión.');
    await dialogo.getByRole('button', { name: 'Activar', exact: true }).click();
    await expect(fila(page, nuevo.correo)).toContainText('Activo');

    const { estado } = await intentarLoginApi(request, { correo: nuevo.correo, contrasena: contrasenaActual }, 'movil');
    expect(estado).toBe(200);
  });

  test('W30: la fila propia no tiene botón Desactivar', async ({ page }) => {
    const propia = page.getByRole('row').filter({ hasText: '(usted)' });
    await expect(propia.getByRole('button', { name: /Desactivar/ })).toHaveCount(0);
    await expect(propia.getByText('No puede desactivar su propia cuenta')).toBeVisible();
  });

  test('W31: 409 y 404 simulados al guardar', async ({ page }) => {
    const responder = (estado, codigo, mensaje) => (ruta) => {
      if (ruta.request().method() !== 'PUT') return ruta.fallback();
      return ruta.fulfill({
        status: estado,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, codigo, mensaje }),
      });
    };
    const patron = /\/api\/usuarios\/\d+$/;

    await page.route(patron, responder(409, 'OPERACION_NO_PERMITIDA', 'Operación no permitida simulada.'));
    await fila(page, nuevo.correo).getByRole('button', { name: /^Editar/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar usuario' });
    await dialogo.getByLabel('Nombre').fill(`${nombreActual} X`);
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialogo.getByRole('alert')).toContainText('Operación no permitida simulada.');

    await page.unroute(patron);
    await page.route(patron, responder(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado'));
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByRole('alert').filter({ hasText: 'El usuario ya no existe.' })).toBeVisible();
  });

  test('W32: el token de un repartidor recibe 403 en GET /api/usuarios', async ({ request }) => {
    test.skip(!hayRepartidor, 'Falta el repartidor de prueba.');
    await asegurarRepartidor(request);
    const datos = await loginApi(request, repartidor, 'movil');
    const r = await request.get(`${API}/usuarios`, conAuth(datos.token));
    expect(r.status()).toBe(403);
    expect((await r.json()).codigo).toBe('ACCESO_DENEGADO');
  });

  test('limpieza: se desactiva el usuario de prueba creado', async ({ request }) => {
    const datos = await loginApi(request, admin);
    const lista = await (await request.get(`${API}/usuarios`, conAuth(datos.token))).json();
    const creado = lista.data.find((u) => u.correo === nuevo.correo.toLowerCase());
    if (creado) {
      await request.patch(`${API}/usuarios/${creado.id}/estado`, { ...conAuth(datos.token), data: { estado: 'inactivo' } });
    }
  });
});
