import { test, expect } from '@playwright/test';
import { entrarComoAdmin, hayCredenciales } from './credenciales.js';
import { crearCategoriaApi, crearProductoApi, crearUnidadApi, datosBase, marca, tokenAdmin } from './datosInventario.js';

test.describe.configure({ mode: 'serial' });

const fila = (page, texto) => page.getByRole('row').filter({ hasText: texto });

test.describe('Categorías y unidades (RF-10, RF-16)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test.beforeEach(async ({ page, request }) => {
    await entrarComoAdmin(page, request, '/productos/categorias');
    await expect(page.getByRole('button', { name: 'Nueva categoría' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Lista de unidades de medida' })).toBeVisible();
  });

  test('W36: crear unidad con decimales; duplicada muestra el error en el campo nombre', async ({ page }) => {
    const m = marca();
    const nombre = `E2E Litro ${m}`;
    const abreviatura = `l${m.slice(-6)}`;

    await page.getByRole('button', { name: 'Nueva unidad' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva unidad' });
    await dialogo.getByLabel('Nombre').fill(nombre);
    await dialogo.getByLabel('Abreviatura').fill(abreviatura);
    await dialogo.getByLabel('Permitir cantidades con decimales').check();
    await dialogo.getByRole('button', { name: 'Crear unidad' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Unidad creada')).toBeVisible();
    const f = fila(page, nombre);
    await expect(f).toContainText(abreviatura);
    await expect(f).toContainText('Permite');

    // Duplicada: mismo nombre, otra abreviatura.
    await page.getByRole('button', { name: 'Nueva unidad' }).click();
    const dos = page.getByRole('dialog', { name: 'Nueva unidad' });
    await dos.getByLabel('Nombre').fill(nombre);
    await dos.getByLabel('Abreviatura').fill(`x${m.slice(-6)}`);
    await dos.getByRole('button', { name: 'Crear unidad' }).click();
    await expect(dos.getByText('Ya existe una unidad con ese nombre o abreviatura.')).toBeVisible();
    await expect(dos.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true');
    await expect(dos).toBeVisible();
  });

  test('W37: crear categoría con lotes, editar solo lo cambiado, desactivar con Cancelar y activar', async ({ page }) => {
    const nombre = `E2E Cat ${marca()}`;
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva categoría' });
    await dialogo.getByLabel('Nombre').fill(nombre);
    await dialogo.getByLabel('Controlar lotes y fecha de caducidad').check();
    await dialogo.getByRole('button', { name: 'Crear categoría' }).click();
    await expect(page.getByText('Categoría creada')).toBeVisible();
    const f = fila(page, nombre);
    await expect(f).toContainText('Sí');
    await expect(f).toContainText('Activo');

    // Editar: sin cambios no hay PUT; con un cambio, el PUT lleva solo ese campo.
    await f.getByRole('button', { name: `Editar la categoría ${nombre}` }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar categoría' });
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(edicion.getByText('No hay cambios para guardar.')).toBeVisible();

    await edicion.getByLabel('Descripción (opcional)').fill('Solo descripción');
    const peticion = page.waitForRequest((r) => r.method() === 'PUT' && /\/categorias\/\d+$/.test(r.url()));
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await peticion).postDataJSON()).toEqual({ descripcion: 'Solo descripción' });
    await expect(page.getByText('Categoría actualizada')).toBeVisible();
    await expect(fila(page, nombre)).toContainText('Solo descripción');

    // Desactivar: Cancelar no cambia nada; Desactivar sí.
    await fila(page, nombre).getByRole('button', { name: `Desactivar la categoría ${nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Desactivar categoría' });
    await expect(confirmar).toContainText(`¿Desactivar la categoría ${nombre}? No podrá asignarse a productos nuevos.`);
    await confirmar.getByRole('button', { name: 'Cancelar' }).click();
    await expect(confirmar).toBeHidden();
    await expect(fila(page, nombre)).toContainText('Activo');

    await fila(page, nombre).getByRole('button', { name: `Desactivar la categoría ${nombre}` }).click();
    await page.getByRole('dialog', { name: 'Desactivar categoría' }).getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText('Categoría desactivada')).toBeVisible();
    await expect(fila(page, nombre)).toContainText('Inactivo');

    await fila(page, nombre).getByRole('button', { name: `Activar la categoría ${nombre}` }).click();
    await page.getByRole('dialog', { name: 'Activar categoría' }).getByRole('button', { name: 'Activar' }).click();
    await expect(page.getByText('Categoría activada')).toBeVisible();
    await expect(fila(page, nombre)).toContainText('Activo');
  });

  test('W38: desactivar una categoría con productos activos muestra el 409 en uso', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    await crearProductoApi(request, token, { categoria, unidad });
    await page.reload();
    await expect(fila(page, categoria.nombre)).toBeVisible();

    await fila(page, categoria.nombre).getByRole('button', { name: `Desactivar la categoría ${categoria.nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Desactivar categoría' });
    await confirmar.getByRole('button', { name: 'Desactivar' }).click();
    await expect(confirmar.getByRole('alert')).toContainText('No se puede desactivar: hay productos activos que la usan.');
    await confirmar.getByRole('button', { name: 'Cancelar' }).click();
    await expect(fila(page, categoria.nombre)).toContainText('Activo');
  });

  test('unidad con productos activos tampoco se desactiva; filtro de estado en la URL', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const unidad = await crearUnidadApi(request, token);
    const categoria = await crearCategoriaApi(request, token);
    await crearProductoApi(request, token, { categoria, unidad });
    await page.reload();
    await fila(page, unidad.nombre).getByRole('button', { name: `Desactivar la unidad ${unidad.nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Desactivar unidad' });
    await confirmar.getByRole('button', { name: 'Desactivar' }).click();
    await expect(confirmar.getByRole('alert')).toContainText('No se puede desactivar: hay productos activos que la usan.');
    await confirmar.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByLabel('Estado de unidades').selectOption('inactivo');
    await expect(page).toHaveURL(/uni_estado=inactivo/);
    await expect(fila(page, unidad.nombre)).toHaveCount(0);
  });
});
