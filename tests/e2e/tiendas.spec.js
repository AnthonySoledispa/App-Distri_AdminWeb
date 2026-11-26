import { test, expect } from '@playwright/test';
import {
  API,
  asegurarRepartidor,
  conAuth,
  entrarComoAdmin,
  hayCredenciales,
  hayRepartidor,
  loginApi,
  repartidor,
} from './credenciales.js';
import {
  crearClienteApi,
  crearRutaApi,
  estadoClienteApi,
  estadoRutaApi,
  json,
  marca,
  tiendaSimulada,
  tokenAdmin,
} from './datosClientes.js';

test.describe.configure({ mode: 'serial' });

const fila = (page, texto) => page.getByRole('row').filter({ hasText: texto });
const dinero = (n) => new RegExp(`\\$\\s?${n}`);

async function irATiendas(page, request, consulta = '') {
  await entrarComoAdmin(page, request, `/tiendas${consulta}`);
  await expect(page.getByRole('button', { name: 'Nueva tienda' })).toBeVisible();
}

async function llenarTienda(dialogo, { nombre, contacto = 'Ana Prueba', telefono = '0991234567', direccion = 'Av. Prueba 123', limite = '0' }) {
  await dialogo.getByLabel('Nombre de la tienda').fill(nombre);
  await dialogo.getByLabel('Persona de contacto').fill(contacto);
  await dialogo.getByLabel('Teléfono').fill(telefono);
  await dialogo.getByLabel('Dirección').fill(direccion);
  await dialogo.getByLabel('Límite de crédito (USD)').fill(limite);
}

test.describe('Tiendas (RF-20 a RF-23)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W70: crear una tienda completa con ruta muestra crédito disponible', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const ruta = await crearRutaApi(request, token);
    await irATiendas(page, request);
    const nombre = `E2E Tienda ${marca()}`;

    await page.getByRole('button', { name: 'Nueva tienda' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva tienda' });
    await llenarTienda(dialogo, { nombre, contacto: 'Luis Mera', telefono: '099 123 4567', limite: '250,50' });
    await dialogo.getByLabel('Ruta').selectOption({ label: ruta.nombre });
    const peticion = page.waitForRequest((r) => r.method() === 'POST' && /\/clientes$/.test(r.url()));
    await dialogo.getByRole('button', { name: 'Crear tienda' }).click();
    expect((await peticion).postDataJSON()).toEqual({
      nombre,
      contacto: 'Luis Mera',
      telefono: '0991234567',
      direccion: 'Av. Prueba 123',
      limite_credito: 250.5,
      ruta_id: ruta.id,
    });
    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Tienda creada')).toBeVisible();
    const f = fila(page, nombre);
    await expect(f).toContainText('Luis Mera');
    await expect(f).toContainText('099 123 4567');
    await expect(f).toContainText(ruta.nombre);
    await expect(f).toContainText('Activo');
    await expect(f.getByRole('cell').nth(4)).toContainText(dinero('250,50')); // límite
    await expect(f.getByRole('cell').nth(5)).toContainText(dinero('0,00')); // saldo
    await expect(f.getByRole('cell').nth(6)).toContainText(dinero('250,50')); // disponible
  });

  test('W71: tienda sin ruta y con teléfono +593 se guarda normalizada', async ({ page, request }) => {
    await irATiendas(page, request);
    const nombre = `E2E Tienda ${marca()}`;
    await page.getByRole('button', { name: 'Nueva tienda' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva tienda' });
    await llenarTienda(dialogo, { nombre, telefono: '+593 2 234 5678', limite: '0' });
    await expect(dialogo.getByLabel('Ruta')).toHaveValue('');
    const peticion = page.waitForRequest((r) => r.method() === 'POST' && /\/clientes$/.test(r.url()));
    await dialogo.getByRole('button', { name: 'Crear tienda' }).click();
    const cuerpo = (await peticion).postDataJSON();
    expect(cuerpo.telefono).toBe('022345678');
    expect(cuerpo).not.toHaveProperty('ruta_id');
    await expect(page.getByText('Tienda creada')).toBeVisible();
    const f = fila(page, nombre);
    await expect(f).toContainText('02 234 5678');
    await expect(f).toContainText('Sin ruta');
    await expect(f).toContainText('Solo contado');
  });

  test('W72: la validación local impide enviar y no hace POST', async ({ page, request }) => {
    await irATiendas(page, request);
    let posts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/clientes$/.test(r.url())) posts += 1;
    });
    await page.getByRole('button', { name: 'Nueva tienda' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva tienda' });
    await dialogo.getByLabel('Límite de crédito (USD)').fill('');
    await dialogo.getByRole('button', { name: 'Crear tienda' }).click();
    await expect(dialogo.getByText('El nombre de la tienda debe tener entre 2 y 120 caracteres.')).toBeVisible();
    await expect(dialogo.getByText('El contacto debe tener entre 2 y 100 caracteres.')).toBeVisible();
    await expect(dialogo.getByText('El teléfono es obligatorio.')).toBeVisible();
    await expect(dialogo.getByText('La dirección debe tener entre 5 y 255 caracteres.')).toBeVisible();
    await expect(dialogo.getByText('Este campo es obligatorio.')).toBeVisible();
    await expect(dialogo.getByLabel('Nombre de la tienda')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialogo.getByLabel('Nombre de la tienda')).toBeFocused();

    await llenarTienda(dialogo, { nombre: 'E2E Validación', telefono: '12345', limite: '-5' });
    await dialogo.getByRole('button', { name: 'Crear tienda' }).click();
    await expect(dialogo.getByText(/Ingrese un celular/)).toBeVisible();
    await expect(dialogo.getByText('El límite de crédito debe ser un número válido.')).toBeVisible();
    await dialogo.getByLabel('Límite de crédito (USD)').fill('10,555');
    await dialogo.getByRole('button', { name: 'Crear tienda' }).click();
    await expect(dialogo.getByText('El límite de crédito admite como máximo 2 decimales.')).toBeVisible();
    expect(posts).toBe(0);
  });

  test('W73: un nombre duplicado muestra el error en el campo nombre', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const existente = await crearClienteApi(request, token);
    await irATiendas(page, request);
    await page.getByRole('button', { name: 'Nueva tienda' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva tienda' });
    await llenarTienda(dialogo, { nombre: existente.nombre });
    await dialogo.getByRole('button', { name: 'Crear tienda' }).click();
    await expect(dialogo.getByText('Ya existe una tienda con ese nombre.')).toBeVisible();
    await expect(dialogo.getByLabel('Nombre de la tienda')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialogo).toBeVisible();
  });

  test('W74: el select ofrece solo rutas activas y una ruta inactiva actual se conserva', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const activa = await crearRutaApi(request, token);
    const inactiva = await crearRutaApi(request, token);
    const otraInactiva = await crearRutaApi(request, token);
    await estadoRutaApi(request, token, otraInactiva.id, 'inactivo');
    const tienda = await crearClienteApi(request, token, { ruta_id: inactiva.id });
    // Una ruta con tienda activa no se desactiva: se desactiva la tienda, luego la ruta, y se reactiva la tienda.
    await estadoClienteApi(request, token, tienda.id, 'inactivo');
    await estadoRutaApi(request, token, inactiva.id, 'inactivo');
    await estadoClienteApi(request, token, tienda.id, 'activo');

    await irATiendas(page, request, `?buscar=${encodeURIComponent(tienda.nombre)}`);
    await expect(fila(page, tienda.nombre)).toContainText(`${inactiva.nombre} (inactiva)`);

    // Nueva tienda: solo rutas activas.
    await page.getByRole('button', { name: 'Nueva tienda' }).click();
    const nueva = page.getByRole('dialog', { name: 'Nueva tienda' });
    const opciones = await nueva.getByLabel('Ruta').locator('option').allTextContents();
    expect(opciones).toContain('Sin ruta');
    expect(opciones).toContain(activa.nombre);
    expect(opciones).not.toContain(inactiva.nombre);
    expect(opciones.join('|')).not.toContain(otraInactiva.nombre);
    await nueva.getByRole('button', { name: 'Cancelar' }).click();

    // Editar: la ruta inactiva actual aparece y se conserva (el PUT no la incluye).
    await fila(page, tienda.nombre).getByRole('button', { name: `Editar la tienda ${tienda.nombre}` }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar tienda' });
    const opcionesEdicion = await edicion.getByLabel('Ruta').locator('option').allTextContents();
    expect(opcionesEdicion).toContain(`${inactiva.nombre} (inactiva)`);
    expect(opcionesEdicion.join('|')).not.toContain(otraInactiva.nombre);
    await expect(edicion.getByLabel('Ruta')).toHaveValue(String(inactiva.id));
    await edicion.getByLabel('Persona de contacto').fill('Contacto Nuevo');
    const peticion = page.waitForRequest((r) => r.method() === 'PUT' && /\/clientes\/\d+$/.test(r.url()));
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await peticion).postDataJSON()).toEqual({ contacto: 'Contacto Nuevo' });
    await expect(page.getByText('Tienda actualizada')).toBeVisible();
    await expect(fila(page, tienda.nombre)).toContainText(`${inactiva.nombre} (inactiva)`);
  });

  test('W75: el PUT lleva solo lo cambiado y "Sin ruta" envía ruta_id null', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const ruta = await crearRutaApi(request, token);
    const tienda = await crearClienteApi(request, token, { ruta_id: ruta.id, limite_credito: 80 });
    await irATiendas(page, request, `?buscar=${encodeURIComponent(tienda.nombre)}`);
    const abrir = () => fila(page, tienda.nombre).getByRole('button', { name: `Editar la tienda ${tienda.nombre}` }).click();

    await abrir();
    const edicion = page.getByRole('dialog', { name: 'Editar tienda' });
    // Mismo teléfono escrito con otro formato y mismo límite con coma: no hay cambios.
    await edicion.getByLabel('Teléfono').fill('099 123 4567');
    await edicion.getByLabel('Límite de crédito (USD)').fill('80,00');
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(edicion.getByText('No hay cambios para guardar.')).toBeVisible();

    await edicion.getByLabel('Teléfono').fill('+593 98 765 4321');
    await edicion.getByLabel('Límite de crédito (USD)').fill('120');
    let peticion = page.waitForRequest((r) => r.method() === 'PUT' && /\/clientes\/\d+$/.test(r.url()));
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await peticion).postDataJSON()).toEqual({ telefono: '0987654321', limite_credito: 120 });
    await expect(page.getByText('Tienda actualizada')).toBeVisible();
    await expect(fila(page, tienda.nombre)).toContainText('098 765 4321');
    await expect(fila(page, tienda.nombre).getByRole('cell').nth(4)).toContainText(dinero('120,00'));

    await abrir();
    const dos = page.getByRole('dialog', { name: 'Editar tienda' });
    await dos.getByLabel('Ruta').selectOption({ label: 'Sin ruta' });
    peticion = page.waitForRequest((r) => r.method() === 'PUT' && /\/clientes\/\d+$/.test(r.url()));
    await dos.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await peticion).postDataJSON()).toEqual({ ruta_id: null });
    await expect(fila(page, tienda.nombre)).toContainText('Sin ruta');
  });

  test('W76: desactivar con Cancelar, reactivar y sin botón "Eliminar"', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const tienda = await crearClienteApi(request, token);
    await irATiendas(page, request, `?buscar=${encodeURIComponent(tienda.nombre)}`);
    await expect(fila(page, tienda.nombre)).toBeVisible();
    await expect(page.getByRole('button', { name: /Eliminar/ })).toHaveCount(0);

    await fila(page, tienda.nombre).getByRole('button', { name: `Desactivar la tienda ${tienda.nombre}` }).click();
    const confirmar = page.getByRole('dialog', { name: 'Desactivar tienda' });
    await expect(confirmar).toContainText(`¿Desactivar la tienda ${tienda.nombre}? No podrá recibir pedidos nuevos.`);
    await expect(confirmar).not.toContainText('saldo pendiente');
    await confirmar.getByRole('button', { name: 'Cancelar' }).click();
    await expect(fila(page, tienda.nombre)).toContainText('Activo');

    await fila(page, tienda.nombre).getByRole('button', { name: `Desactivar la tienda ${tienda.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Desactivar tienda' }).getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText('Tienda desactivada')).toBeVisible();
    await expect(fila(page, tienda.nombre)).toContainText('Inactivo');

    await fila(page, tienda.nombre).getByRole('button', { name: `Activar la tienda ${tienda.nombre}` }).click();
    await page.getByRole('dialog', { name: 'Activar tienda' }).getByRole('button', { name: 'Activar' }).click();
    await expect(page.getByText('Tienda activada')).toBeVisible();
    await expect(fila(page, tienda.nombre)).toContainText('Activo');
    await expect(page.getByRole('button', { name: /Eliminar/ })).toHaveCount(0);
  });

  test('W77: búsqueda y filtros viven en la URL (nombre, contacto, ruta, sin ruta, estado)', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const m = marca();
    const ruta = await crearRutaApi(request, token, { nombre: `E2E Ruta Zona${m}` });
    const conRuta = await crearClienteApi(request, token, { nombre: `E2E Tienda A${m}`, contacto: `Contacto${m}`, ruta_id: ruta.id });
    const sinRuta = await crearClienteApi(request, token, { nombre: `E2E Tienda B${m}` });
    await estadoClienteApi(request, token, sinRuta.id, 'inactivo');
    await irATiendas(page, request);

    const buscar = page.getByLabel('Buscar por nombre, contacto, teléfono o ruta');
    await buscar.fill(`Tienda `);
    await buscar.fill(`E2E Tienda`);
    await buscar.fill(`${m}`); // coincide con las dos tiendas por nombre
    await expect(page).toHaveURL(new RegExp(`buscar=${m}`));
    await expect(fila(page, conRuta.nombre)).toBeVisible();
    await expect(fila(page, sinRuta.nombre)).toBeVisible();

    await page.getByLabel('Ruta', { exact: true }).selectOption({ label: ruta.nombre });
    await expect(page).toHaveURL(new RegExp(`ruta_id=${ruta.id}`));
    await expect(fila(page, conRuta.nombre)).toBeVisible();
    await expect(fila(page, sinRuta.nombre)).toHaveCount(0);

    await page.getByLabel('Ruta', { exact: true }).selectOption({ label: 'Sin ruta' });
    await expect(page).toHaveURL(/sin_ruta=true/);
    await expect(page).not.toHaveURL(/ruta_id=/);
    await expect(fila(page, sinRuta.nombre)).toBeVisible();
    await expect(fila(page, conRuta.nombre)).toHaveCount(0);

    await page.getByLabel('Ruta', { exact: true }).selectOption({ label: 'Todas' });
    await page.getByLabel('Estado', { exact: true }).selectOption('inactivo');
    await expect(page).toHaveURL(/estado=inactivo/);
    await expect(fila(page, sinRuta.nombre)).toBeVisible();
    await expect(fila(page, conRuta.nombre)).toHaveCount(0);

    // Búsqueda por contacto y por nombre de ruta.
    await page.getByLabel('Estado', { exact: true }).selectOption({ label: 'Todos' });
    await buscar.fill(`Contacto${m}`);
    await expect(fila(page, conRuta.nombre)).toBeVisible();
    await expect(fila(page, sinRuta.nombre)).toHaveCount(0);
    await buscar.fill(`Zona${m}`);
    await expect(fila(page, conRuta.nombre)).toBeVisible();
    await expect(page.getByText('1 tienda', { exact: true })).toBeVisible();

    await buscar.fill(`sin-coincidencias-${m}`);
    await expect(page.getByText('No hay tiendas que coincidan con los filtros.')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/\/tiendas$/);
    await expect(buscar).toHaveValue('');

    // Un enlace directo con filtros los muestra seleccionados.
    await page.goto(`/tiendas?sin_ruta=true&buscar=${m}`);
    await expect(page.getByLabel('Ruta', { exact: true })).toHaveValue('sin');
    await expect(buscar).toHaveValue(m);
    await expect(fila(page, sinRuta.nombre)).toBeVisible();
  });

  test('W78: la ficha muestra datos, crédito e historial vacío; una tienda inexistente avisa', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const ruta = await crearRutaApi(request, token);
    const tienda = await crearClienteApi(request, token, { ruta_id: ruta.id, limite_credito: 100, contacto: 'Marta Vera' });
    const contado = await crearClienteApi(request, token, { limite_credito: 0 });
    await irATiendas(page, request, `?buscar=${encodeURIComponent(tienda.nombre)}`);

    await page.getByRole('link', { name: tienda.nombre }).click();
    await expect(page).toHaveURL(new RegExp(`/tiendas/${tienda.id}$`));
    await expect(page).toHaveTitle('Tienda | DistriGO');
    await expect(page.getByRole('heading', { name: tienda.nombre, level: 2 })).toBeVisible();
    const datos = page.getByRole('region', { name: 'Datos de la tienda' });
    await expect(datos).toContainText('Marta Vera');
    await expect(datos).toContainText('099 123 4567');
    await expect(datos).toContainText('Calle Falsa 123');
    await expect(datos).toContainText(ruta.nombre);
    const credito = page.getByRole('region', { name: 'Crédito' });
    await expect(credito.getByText('Límite de crédito').locator('..')).toContainText(dinero('100,00'));
    await expect(credito.getByText('Saldo pendiente').locator('..')).toContainText(dinero('0,00'));
    await expect(credito.getByText('Crédito disponible').locator('..')).toContainText(dinero('100,00'));
    await expect(page.getByText('Crédito excedido')).toHaveCount(0);
    await expect(page.getByText('Esta tienda aún no tiene compras registradas.')).toBeVisible();

    // Editar desde la ficha.
    await page.getByRole('button', { name: 'Editar' }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar tienda' });
    await edicion.getByLabel('Persona de contacto').fill('Marta Vera Mora');
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Tienda actualizada')).toBeVisible();
    await expect(datos).toContainText('Marta Vera Mora');

    await page.goto(`/tiendas/${contado.id}`);
    await expect(page.getByText('Tienda solo de contado')).toBeVisible();

    for (const id of ['99999999', 'abc']) {
      await page.goto(`/tiendas/${id}`);
      await expect(page.getByText('La tienda no existe.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Volver a tiendas' })).toBeVisible();
    }
  });

  test('W79: (simulado) crédito excedido, confirmación al bajar el límite y saldo en la desactivación', async ({ page, request }) => {
    const excedida = tiendaSimulada({ saldo_pendiente: 150, credito_disponible: 0, credito_excedido: true });
    await entrarComoAdmin(page, request, '/usuarios');
    await page.route(/\/api\/clientes(\?.*)?$/, (r) => r.fulfill(json({ ok: true, data: [excedida] })));
    let puts = [];
    await page.route(/\/api\/clientes\/987654$/, (r) => {
      if (r.request().method() === 'PUT') {
        puts.push(r.request().postDataJSON());
        return r.fulfill(json({ ok: true, data: { ...excedida, ...r.request().postDataJSON() } }));
      }
      return r.fulfill(json({ ok: true, data: excedida }));
    });
    await page.goto('/tiendas');

    const f = fila(page, excedida.nombre);
    await expect(f.getByText('Crédito excedido')).toBeVisible();
    await expect(f.getByRole('cell').nth(5)).toContainText(dinero('150,00'));

    // Desactivar menciona el saldo pendiente.
    await f.getByRole('button', { name: `Desactivar la tienda ${excedida.nombre}` }).click();
    const desactivar = page.getByRole('dialog', { name: 'Desactivar tienda' });
    await expect(desactivar).toContainText('Tiene un saldo pendiente de');
    await expect(desactivar).toContainText(dinero('150,00'));
    await desactivar.getByRole('button', { name: 'Cancelar' }).click();

    // Bajar el límite por debajo del saldo pide confirmación; Cancelar no envía nada.
    await f.getByRole('button', { name: `Editar la tienda ${excedida.nombre}` }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar tienda' });
    await edicion.getByLabel('Límite de crédito (USD)').fill('120');
    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    const aviso = page.getByRole('dialog', { name: 'Reducir límite de crédito' });
    await expect(aviso).toContainText('es menor que el saldo pendiente');
    await expect(aviso).toContainText(dinero('120,00'));
    await expect(aviso).toContainText(dinero('150,00'));
    await aviso.getByRole('button', { name: 'Cancelar' }).click();
    expect(puts).toHaveLength(0);
    await expect(edicion).toBeVisible();

    await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.getByRole('dialog', { name: 'Reducir límite de crédito' }).getByRole('button', { name: 'Guardar de todos modos' }).click();
    await expect(page.getByText('Tienda actualizada')).toBeVisible();
    expect(puts).toEqual([{ limite_credito: 120 }]);

    // Subir el límite por encima del saldo no pide confirmación.
    puts = [];
    await f.getByRole('button', { name: `Editar la tienda ${excedida.nombre}` }).click();
    const dos = page.getByRole('dialog', { name: 'Editar tienda' });
    await dos.getByLabel('Límite de crédito (USD)').fill('200');
    await dos.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Tienda actualizada')).toBeVisible();
    expect(puts).toEqual([{ limite_credito: 200 }]);

    // La ficha también avisa.
    await page.goto(`/tiendas/${excedida.id}`);
    await expect(page.getByRole('alert').or(page.getByRole('status')).filter({ hasText: 'Crédito excedido: el saldo pendiente supera el límite autorizado.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: excedida.nombre, level: 2 })).toBeVisible();
  });

  test('W80: (simulado) historial paginado de 20 en 20 y filtros Desde y Hasta', async ({ page, request }) => {
    const tienda = tiendaSimulada();
    const peticiones = [];
    await entrarComoAdmin(page, request, '/usuarios');
    await page.route(/\/api\/clientes\/987654$/, (r) => r.fulfill(json({ ok: true, data: tienda })));
    await page.route(/\/api\/clientes\/987654\/compras(\?.*)?$/, (r) => {
      const q = new URL(r.request().url()).searchParams;
      peticiones.push(Object.fromEntries(q));
      if (q.get('hasta') === '2026-01-01') return r.fulfill(json({ ok: true, data: { items: [], total: 0, pagina: 1, limite: 20 } }));
      const pagina = Number(q.get('pagina') || 1);
      const total = 45;
      const desde = (pagina - 1) * 20;
      const items = Array.from({ length: Math.min(20, total - desde) }, (_, i) => ({
        pedido_id: 1000 + desde + i,
        numero: `PED-${String(desde + i + 1).padStart(4, '0')}`,
        fecha: '2026-11-20T15:00:00.000Z',
        estado: 'entregado',
        tipo_pago: i % 2 ? 'credito' : 'contado',
        total: 12.5,
        saldo: i % 2 ? 5 : 0,
      }));
      return r.fulfill(json({ ok: true, data: { items, total, pagina, limite: 20 } }));
    });
    await page.goto('/tiendas/987654');

    const tabla = page.getByRole('table', { name: 'Historial de compras de la tienda' });
    await expect(tabla.getByRole('row')).toHaveCount(21); // encabezado + 20
    await expect(tabla).toContainText('PED-0001');
    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    expect(peticiones[0]).toMatchObject({ pagina: '1', limite: '20' });

    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.getByText('Página 2 de 3')).toBeVisible();
    await expect(tabla).toContainText('PED-0021');
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.getByText('Página 3 de 3')).toBeVisible();
    await expect(tabla.getByRole('row')).toHaveCount(6); // encabezado + 5
    await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();

    // Cambiar un filtro vuelve a la página 1 y envía el rango.
    await page.getByLabel('Desde').fill('2026-11-01');
    await expect(page).toHaveURL(/desde=2026-11-01/);
    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    expect(peticiones.at(-1)).toMatchObject({ desde: '2026-11-01', pagina: '1' });

    // Rango invertido: aviso local y ninguna petición nueva.
    const antes = peticiones.length;
    await page.getByLabel('Hasta').fill('2026-10-01');
    await expect(page.getByText('La fecha "Desde" no puede ser posterior a "Hasta".')).toBeVisible();
    expect(peticiones.length).toBe(antes);

    // Período sin compras.
    await page.getByLabel('Desde').fill('2025-12-01');
    await page.getByLabel('Hasta').fill('2026-01-01');
    await expect(page.getByText('No hay compras en ese período.')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/\/tiendas\/987654$/);
    await expect(tabla).toContainText('PED-0001');
  });
});

test.describe('Permisos y errores del Módulo 3', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W81: un token de repartidor recibe 403 en clientes y rutas (CA-02, TP-02)', async ({ request }) => {
    test.skip(!hayRepartidor, 'Falta el repartidor de prueba.');
    await asegurarRepartidor(request);
    const { token } = await loginApi(request, repartidor, 'movil');
    for (const ruta of ['/clientes', '/rutas', '/clientes/1', '/clientes/1/compras']) {
      const r = await request.get(`${API}${ruta}`, conAuth(token));
      expect(r.status(), ruta).toBe(403);
    }
    const crear = await request.post(`${API}/clientes`, {
      ...conAuth(token),
      data: { nombre: 'E2E Tienda Prohibida', contacto: 'X Y', telefono: '0991234567', direccion: 'Calle 123', limite_credito: 0 },
    });
    expect(crear.status()).toBe(403);
    expect((await crear.json()).ok).toBe(false);
    const ruta = await request.post(`${API}/rutas`, { ...conAuth(token), data: { nombre: 'E2E Ruta Prohibida' } });
    expect(ruta.status()).toBe(403);
    const sinToken = await request.get(`${API}/clientes`);
    expect(sinToken.status()).toBe(401);
  });

  test('W82: un 503 en tiendas, rutas y ficha muestra "Reintentar"', async ({ page, request }) => {
    await entrarComoAdmin(page, request, '/usuarios');
    const cuerpo503 = { ok: false, codigo: 'BD_NO_DISPONIBLE', mensaje: 'x' };
    const servicio = 'El servicio no está disponible en este momento. Intente más tarde.';

    await page.route(/\/api\/clientes(\?.*)?$/, (r) => r.fulfill(json(cuerpo503, 503)));
    await page.goto('/tiendas');
    await expect(page.getByText(servicio)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await page.unroute(/\/api\/clientes(\?.*)?$/);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Lista de tiendas' }).or(page.getByText('Aún no hay tiendas'))).toBeVisible();

    await page.route(/\/api\/rutas(\?.*)?$/, (r) => r.fulfill(json(cuerpo503, 503)));
    await page.goto('/tiendas/rutas');
    await expect(page.getByText(servicio)).toBeVisible();
    await page.unroute(/\/api\/rutas(\?.*)?$/);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);

    await page.route(/\/api\/clientes\/\d+$/, (r) => r.fulfill(json(cuerpo503, 503)));
    await page.goto('/tiendas/1');
    await expect(page.getByText(servicio)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
