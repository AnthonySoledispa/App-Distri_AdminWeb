import { test, expect } from '@playwright/test';
import { entrarComoAdmin, hayCredenciales, iniciarSesionUI } from './credenciales.js';
import { crearClienteApi, crearRutaApi, estadoClienteApi, marca, tokenAdmin } from './datosClientes.js';

test.describe.configure({ mode: 'serial' });

const fila = (page, texto) => page.getByRole('row').filter({ hasText: texto });

async function irARutas(page, request) {
  await entrarComoAdmin(page, request, '/tiendas/rutas');
  await expect(page.getByRole('button', { name: 'Nueva ruta' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Lista de rutas de reparto' }).or(page.getByText('Aún no hay rutas'))).toBeVisible();
}

test.describe('Navegación del Módulo 3', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W65: Inicio muestra "3 de 8 disponibles" y "Gestionar tiendas" lleva a /tiendas', async ({ page, request }) => {
    await entrarComoAdmin(page, request);
    await expect(page.getByText('3 de 8 disponibles')).toBeVisible();
    await page.getByRole('link', { name: 'Gestionar tiendas' }).click();
    await expect(page).toHaveURL(/\/tiendas$/);
    await expect(page.getByRole('button', { name: 'Nueva tienda' })).toBeVisible();
  });

  test('W66: /tiendas sin sesión lleva al login y, tras entrar, vuelve a /tiendas', async ({ page }) => {
    await page.goto('/tiendas');
    await expect(page).toHaveURL(/\/login$/);
    await iniciarSesionUI(page);
    await expect(page).toHaveURL(/\/tiendas$/);
    await expect(page.getByRole('button', { name: 'Nueva tienda' })).toBeVisible();
  });

  test('W67: subnavegación Tiendas · Rutas con aria-current y títulos de página', async ({ page, request }) => {
    await entrarComoAdmin(page, request, '/tiendas');
    const sub = page.getByRole('navigation', { name: 'Secciones de tiendas' });
    await expect(sub.getByRole('link')).toHaveCount(2);
    await expect(page).toHaveTitle('Tiendas | DistriGO');
    await expect(sub.locator('[aria-current="page"]')).toHaveText('Tiendas');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tiendas');

    await sub.getByRole('link', { name: 'Rutas' }).click();
    await expect(page).toHaveURL(/\/tiendas\/rutas$/);
    await expect(page).toHaveTitle('Rutas de tiendas | DistriGO');
    await expect(sub.locator('[aria-current="page"]')).toHaveText('Rutas');
    await expect(page.getByText('Agrupe las tiendas por zona de reparto.')).toBeVisible();
    // La barra lateral mantiene "Tiendas" como sección actual y "Rutas" sigue deshabilitada.
    const barra = page.getByRole('navigation', { name: 'Principal' });
    await expect(barra.getByRole('link', { name: 'Tiendas' })).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Rutas (RF-20)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W68: crear, duplicar y editar solo lo cambiado en una ruta', async ({ page, request }) => {
    await irARutas(page, request);
    const nombre = `E2E Ruta ${marca()}`;

    await page.getByRole('button', { name: 'Nueva ruta' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva ruta' });
    await dialogo.getByLabel('Nombre').fill('A');
    await dialogo.getByRole('button', { name: 'Crear ruta' }).click();
    await expect(dialogo.getByText('El nombre de la ruta debe tener entre 2 y 80 caracteres.')).toBeVisible();

    await dialogo.getByLabel('Nombre').fill(nombre);
    await dialogo.getByLabel('Descripción (opcional)').fill('Zona norte');
    await dialogo.getByRole('button', { name: 'Crear ruta' }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Ruta creada')).toBeVisible();
    const f = fila(page, nombre);
    await expect(f).toContainText('Zona norte');
    await expect(f).toContainText('0 de 0');
    await expect(f).toContainText('Activo');

    // Duplicada: el error aparece junto al campo nombre.
    await page.getByRole('button', { name: 'Nueva ruta' }).click();
    const dos = page.getByRole('dialog', { name: 'Nueva ruta' });
    await dos.getByLabel('Nombre').fill(nombre);
    await dos.getByRole('button', { name: 'Crear ruta' }).click();
    await expect(dos.getByText('Ya existe una ruta con ese nombre.')).toBeVisible();
    await expect(dos.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true');
    await dos.getByRole('button', { name: 'Cancelar' }).click();

    // Editar: sin cambios no hay PUT; con un cambio, solo ese campo.
    await fila(page, nombre).getByRole('button', { name: `Editar la ruta ${nombre}` }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar ruta' });
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(edicion.getByText('No hay cambios para guardar.')).toBeVisible();
    await edicion.getByLabel('Descripción (opcional)').fill('Zona norte y centro');
    const peticion = page.waitForRequest((r) => r.method() === 'PUT' && /\/rutas\/\d+$/.test(r.url()));
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await peticion).postDataJSON()).toEqual({ descripcion: 'Zona norte y centro' });
    await expect(page.getByText('Ruta actualizada')).toBeVisible();
    await expect(fila(page, nombre)).toContainText('Zona norte y centro');
  });

  test('W69: desactivar ruta en uso (409), sin tiendas y cancelar; el enlace lleva a las tiendas de la ruta', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const enUso = await crearRutaApi(request, token);
    const libre = await crearRutaApi(request, token);
    const tienda = await crearClienteApi(request, token, { ruta_id: enUso.id });
    await irARutas(page, request);

    await expect(fila(page, enUso.nombre)).toContainText('1 de 1');
    await fila(page, enUso.nombre).getByRole('button', { name: `Desactivar la ruta ${enUso.nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Desactivar ruta' });
    await expect(confirmar).toContainText(`¿Desactivar la ruta ${enUso.nombre}? No podrá asignarse a tiendas nuevas.`);
    await confirmar.getByRole('button', { name: 'Desactivar' }).click();
    await expect(confirmar.getByRole('alert')).toContainText(
      'No se puede desactivar: hay tiendas activas asignadas a esta ruta.',
    );
    await confirmar.getByRole('button', { name: 'Cancelar' }).click();
    await expect(fila(page, enUso.nombre)).toContainText('Activo');

    // Con la tienda desactivada, la ruta ya se puede desactivar (cuenta solo tiendas activas).
    await estadoClienteApi(request, token, tienda.id, 'inactivo');
    await page.reload();
    await expect(fila(page, enUso.nombre)).toContainText('0 de 1');
    await fila(page, enUso.nombre).getByRole('button', { name: `Desactivar la ruta ${enUso.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Desactivar ruta' }).getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText('Ruta desactivada')).toBeVisible();
    await expect(fila(page, enUso.nombre)).toContainText('Inactivo');

    // Ruta sin tiendas: Cancelar no cambia nada, Desactivar sí; luego se reactiva.
    await fila(page, libre.nombre).getByRole('button', { name: `Desactivar la ruta ${libre.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Desactivar ruta' }).getByRole('button', { name: 'Cancelar' }).click();
    await expect(fila(page, libre.nombre)).toContainText('Activo');
    await fila(page, libre.nombre).getByRole('button', { name: `Desactivar la ruta ${libre.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Desactivar ruta' }).getByRole('button', { name: 'Desactivar' }).click();
    await expect(fila(page, libre.nombre)).toContainText('Inactivo');
    await fila(page, libre.nombre).getByRole('button', { name: `Activar la ruta ${libre.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Activar ruta' }).getByRole('button', { name: 'Activar' }).click();
    await expect(page.getByText('Ruta activada')).toBeVisible();
    await expect(fila(page, libre.nombre)).toContainText('Activo');

    // El enlace de la columna Tiendas filtra la lista de tiendas por esa ruta.
    await fila(page, enUso.nombre).getByRole('link', { name: /Ver tiendas de la ruta/ }).click();
    await expect(page).toHaveURL(new RegExp(`/tiendas\\?ruta_id=${enUso.id}$`));
    await expect(page.getByLabel('Ruta', { exact: true })).toHaveValue(String(enUso.id));
    await expect(fila(page, tienda.nombre)).toBeVisible();
  });
});
