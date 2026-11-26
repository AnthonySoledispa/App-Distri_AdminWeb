import { test, expect } from '@playwright/test';
import { textoContador } from '../../src/utils/alertas.js';
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
  ajusteApi,
  alertasApi,
  crearProductoApi,
  datosBase,
  diaNegocio,
  enPantalla,
  entradaApi,
  marca,
  tokenAdmin,
} from './datosInventario.js';

test.describe.configure({ mode: 'serial' });

const fila = (page, texto) => page.getByRole('row').filter({ hasText: texto });
const json = (cuerpo, estado = 200) => ({
  status: estado,
  contentType: 'application/json',
  body: JSON.stringify(cuerpo),
});

async function irA(page, request, ruta, listo) {
  const datos = await entrarComoAdmin(page, request, ruta);
  await expect(listo(page)).toBeVisible();
  return datos;
}
const enProductos = (page, request, consulta = '') =>
  irA(page, request, `/productos${consulta}`, (p) => p.getByRole('button', { name: 'Nuevo producto' }));
const enFicha = (page, request, id) =>
  irA(page, request, `/productos/${id}`, (p) => p.getByRole('button', { name: 'Registrar ajuste' }));

test.describe('Entradas, ajustes y consultas de inventario (RF-12 a RF-19)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W46: registrar entrada desde la fila sube el stock la cantidad exacta y avisa', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const p = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 3 });
    await enProductos(page, request, `?buscar=${encodeURIComponent(p.nombre)}`);
    await expect(fila(page, p.nombre)).toContainText(`3 ${unidad.abreviatura}`);

    await fila(page, p.nombre).getByRole('button', { name: `Entrada de ${p.nombre}` }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar entrada' });
    await expect(dialogo).toContainText(p.nombre);
    await dialogo.getByLabel('Cantidad').fill('7');
    await expect(dialogo.getByText(`Nuevo stock: 10 ${unidad.abreviatura}`)).toBeVisible();
    await dialogo.getByRole('button', { name: 'Registrar entrada' }).click();

    await expect(page.getByText(`Entrada registrada. Stock: 10 ${unidad.abreviatura}.`)).toBeVisible();
    await expect(fila(page, p.nombre)).toContainText(`10 ${unidad.abreviatura}`);
  });

  test('W47: 1,5 en unidad entera falla en local sin petición; en unidad decimal se registra', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const entera = await datosBase(request, token);
    const decimal = await datosBase(request, token, { decimales: true });
    const pEntero = await crearProductoApi(request, token, { categoria: entera.categoria, unidad: entera.unidad });
    const pDecimal = await crearProductoApi(request, token, { categoria: decimal.categoria, unidad: decimal.unidad });
    await enProductos(page, request);
    const posts = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/inventario/entradas')) posts.push(r);
    });

    await fila(page, pEntero.nombre).getByRole('button', { name: `Entrada de ${pEntero.nombre}` }).click();
    const uno = page.getByRole('dialog', { name: 'Registrar entrada' });
    await uno.getByLabel('Cantidad').fill('1,5');
    await uno.getByRole('button', { name: 'Registrar entrada' }).click();
    await expect(uno.getByText('La cantidad debe ser un número entero para esta unidad.')).toBeVisible();
    expect(posts).toHaveLength(0);
    await uno.getByRole('button', { name: 'Cancelar' }).click();

    await fila(page, pDecimal.nombre).getByRole('button', { name: `Entrada de ${pDecimal.nombre}` }).click();
    const dos = page.getByRole('dialog', { name: 'Registrar entrada' });
    await dos.getByLabel('Cantidad').fill('1,5');
    await dos.getByRole('button', { name: 'Registrar entrada' }).click();
    await expect(page.getByText(`Entrada registrada. Stock: 1,5 ${decimal.unidad.abreviatura}.`)).toBeVisible();
    expect(posts).toHaveLength(1);
    expect(posts[0].postDataJSON().cantidad).toBe(1.5);
  });

  test('W48: mismo lote con otra caducidad muestra LOTE_CADUCIDAD_DISTINTA', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token, { lotes: true });
    const p = await crearProductoApi(request, token, {
      categoria,
      unidad,
      stock_inicial: 5,
      codigo_lote: 'L-A',
      fecha_caducidad: diaNegocio(30),
    });
    await enProductos(page, request, `?buscar=${encodeURIComponent(p.nombre)}`);

    await fila(page, p.nombre).getByRole('button', { name: `Entrada de ${p.nombre}` }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar entrada' });
    await expect(dialogo).toContainText('Si el lote ya existe con la misma fecha, se suma.');
    await dialogo.getByLabel('Cantidad').fill('2');
    await dialogo.getByLabel('Código de lote').fill('L-A');
    await dialogo.getByLabel('Fecha de caducidad').fill(diaNegocio(31));
    await dialogo.getByRole('button', { name: 'Registrar entrada' }).click();
    await expect(dialogo.getByText('Ese lote ya existe con otra fecha de caducidad.')).toBeVisible();

    // Con la misma fecha, el lote existente se suma.
    await dialogo.getByLabel('Fecha de caducidad').fill(diaNegocio(30));
    await dialogo.getByRole('button', { name: 'Registrar entrada' }).click();
    await expect(page.getByText(`Entrada registrada. Stock: 7 ${unidad.abreviatura}.`)).toBeVisible();
  });

  test('W49: ajuste con motivo obligatorio y observación; la merma reduce el stock y queda en el historial', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const p = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 10 });
    const sesion = await enFicha(page, request, p.id);

    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar ajuste' });
    await dialogo.getByLabel('Cantidad').fill('3');
    await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(dialogo.getByText('Seleccione un motivo.')).toBeVisible();

    await dialogo.getByLabel('Motivo').selectOption('otro');
    await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(dialogo.getByText('La observación es obligatoria para este motivo.')).toBeVisible();

    await dialogo.getByLabel('Motivo').selectOption('merma');
    await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(page.getByText(`Ajuste registrado. Stock: 7 ${unidad.abreviatura}.`)).toBeVisible();

    const historial = page.getByRole('table', { name: 'Historial de movimientos de inventario' });
    const f = fila(historial, 'Merma');
    await expect(f).toContainText('Ajuste');
    await expect(f).toContainText(`-3 ${unidad.abreviatura}`);
    await expect(f).toContainText(sesion.usuario.nombre);
  });

  test('W50: ajuste mayor al stock falla en local; si el stock cambia antes de enviar, el 409 muestra el disponible', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const p = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 5 });
    await enFicha(page, request, p.id);

    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar ajuste' });
    await dialogo.getByLabel('Motivo').selectOption('perdida');
    await dialogo.getByLabel('Cantidad').fill('6');
    await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(dialogo.getByText('La cantidad no puede ser mayor al stock disponible (5).')).toBeVisible();

    // Carrera real: con el modal abierto, otro usuario reduce el stock a 2.
    await ajusteApi(request, token, { producto_id: p.id, tipo_ajuste: 'disminucion', cantidad: 3, motivo: 'merma' });
    await dialogo.getByLabel('Cantidad').fill('4');
    await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(dialogo.getByText(`Stock insuficiente. Disponible: 2 ${unidad.abreviatura}.`)).toBeVisible();
    await expect(dialogo).toContainText(`Stock actual: 2 ${unidad.abreviatura}`);
  });

  test('W51: la ficha muestra datos, stock, lotes con insignias e historial con saldo', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token, { lotes: true });
    const p = await crearProductoApi(request, token, {
      categoria,
      unidad,
      sku: `FICHA-${marca()}`,
      descripcion: 'Descripción de prueba',
      precio_venta: 7.5,
      stock_minimo: 2,
      stock_inicial: 4,
      codigo_lote: 'L-LEJOS',
      fecha_caducidad: diaNegocio(60),
    });
    await entradaApi(request, token, {
      producto_id: p.id,
      cantidad: 6,
      codigo_lote: 'L-PRONTO',
      fecha_caducidad: diaNegocio(3),
    });
    await enFicha(page, request, p.id);

    await expect(page.getByRole('heading', { name: p.nombre })).toBeVisible();
    const datos = page.getByRole('region', { name: 'Datos del producto' });
    await expect(datos).toContainText(p.sku);
    await expect(datos).toContainText('Descripción de prueba');
    await expect(datos).toContainText('$7,50');
    await expect(datos).toContainText(categoria.nombre);
    await expect(datos).toContainText('Control de lotes');
    await expect(datos).toContainText('Sí');
    await expect(datos).toContainText('Stock vendible');
    await expect(datos).toContainText(`10 ${unidad.abreviatura}`);

    const lotes = page.getByRole('table', { name: 'Lotes del producto' });
    await expect(fila(lotes, 'L-LEJOS')).toContainText('Vigente');
    await expect(fila(lotes, 'L-PRONTO')).toContainText('Por vencer');
    await expect(fila(lotes, 'L-PRONTO')).toContainText('3');

    const historial = page.getByRole('table', { name: 'Historial de movimientos de inventario' });
    await expect(fila(historial, 'L-PRONTO')).toContainText(`10 ${unidad.abreviatura}`);
    await expect(fila(historial, 'L-LEJOS')).toContainText(`4 ${unidad.abreviatura}`);
  });

  test('W52: movimientos con filtros y página en la URL; desde > hasta; paginación simulada', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const p = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 8 });
    await ajusteApi(request, token, { producto_id: p.id, tipo_ajuste: 'disminucion', cantidad: 2, motivo: 'danio' });
    await irA(page, request, `/productos/movimientos?producto_id=${p.id}`, (pg) =>
      pg.getByRole('table', { name: 'Historial de movimientos de inventario' }),
    );
    const tabla = page.getByRole('table', { name: 'Historial de movimientos de inventario' });
    await expect(tabla.locator('tbody tr')).toHaveCount(2);

    await page.getByLabel('Tipo', { exact: true }).selectOption('ajuste');
    await expect(page).toHaveURL(/tipo=ajuste/);
    await expect(tabla.locator('tbody tr')).toHaveCount(1);
    await expect(tabla).toContainText('Daño');

    const hoy = diaNegocio(0);
    await page.getByLabel('Desde').fill(hoy);
    await page.getByLabel('Hasta').fill(diaNegocio(-3));
    await expect(page.getByText('La fecha "Desde" no puede ser posterior a "Hasta".')).toBeVisible();
    await page.getByLabel('Hasta').fill(hoy);
    await expect(page).toHaveURL(new RegExp(`desde=${hoy}`));
    await expect(tabla.locator('tbody tr')).toHaveCount(1);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).not.toHaveURL(/tipo=|desde=|hasta=|producto_id=/);

    // Paginación con más de 50 filas, simulada.
    await page.route(/\/api\/inventario\/movimientos(\?.*)?$/, (ruta) => {
      const url = new URL(ruta.request().url());
      const pagina = Number(url.searchParams.get('pagina') || 1);
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: pagina * 1000 + i,
        producto_id: p.id,
        producto_nombre: `Simulado ${pagina}-${i}`,
        unidad_abreviatura: 'u',
        tipo: 'entrada',
        cantidad: 1,
        stock_anterior: i,
        stock_resultante: i + 1,
        lote_id: null,
        codigo_lote: null,
        motivo: null,
        observacion: null,
        fecha_movimiento: '2026-11-20',
        usuario_nombre: 'Prueba',
        creado_en: '2026-11-20T15:00:00.000Z',
      }));
      return ruta.fulfill(json({ ok: true, data: { items, total: 120, pagina, limite: 50 } }));
    });
    await page.reload();
    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    await expect(page.getByText('120 movimientos')).toBeVisible();
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(page.getByText('Página 2 de 3')).toBeVisible();
    await expect(page.getByText('Simulado 2-0')).toBeVisible();
  });

  test('W53: alertas de stock bajo y de caducidad con días en la URL; entrada desde la alerta', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token, { lotes: true });
    const lote = `L-AL-${marca()}`;
    const p = await crearProductoApi(request, token, {
      categoria,
      unidad,
      stock_minimo: 5,
      stock_inicial: 5,
      codigo_lote: lote,
      fecha_caducidad: diaNegocio(3),
    });
    await irA(page, request, '/productos/alertas', (pg) => pg.getByRole('heading', { name: 'Stock bajo' }));

    const bajo = page.getByRole('table', { name: 'Productos con stock bajo' });
    await expect(fila(bajo, p.nombre)).toBeVisible();
    await expect(page.getByText('Por vencer en 15 días')).toBeVisible();
    const vencer = page.getByRole('table', { name: 'Lotes próximos a vencer' });
    await expect(fila(vencer, lote)).toContainText('3');

    await page.getByLabel('Días').fill('2');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page).toHaveURL(/dias=2/);
    await expect(page.getByText('Por vencer en 2 días')).toBeVisible();
    await expect(page.getByText(lote)).toHaveCount(0);

    await page.getByLabel('Días').fill('7');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page).toHaveURL(/dias=7/);
    await expect(fila(page.getByRole('table', { name: 'Lotes próximos a vencer' }), lote)).toBeVisible();

    await page.getByLabel('Días').fill('0');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('Indique un número de días entre 1 y 365.')).toBeVisible();

    await fila(bajo, p.nombre).getByRole('button', { name: `Registrar entrada de ${p.nombre}` }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar entrada' });
    await expect(dialogo).toContainText(p.nombre);
    await expect(dialogo.getByLabel('Producto')).toHaveCount(0); // producto fijo
  });

  test('W58: un token de repartidor recibe 403 en productos y entradas (CA-02, TP-02)', async ({ request }) => {
    test.skip(!hayRepartidor, 'Falta el repartidor de prueba.');
    await asegurarRepartidor(request);
    const { token } = await loginApi(request, repartidor, 'movil');
    const lista = await request.get(`${API}/productos`, conAuth(token));
    expect(lista.status()).toBe(403);
    const entrada = await request.post(`${API}/inventario/entradas`, {
      ...conAuth(token),
      data: { producto_id: 1, cantidad: 1 },
    });
    expect(entrada.status()).toBe(403);
    expect((await entrada.json()).ok).toBe(false);
  });

  test('W59: las fechas de caducidad y de movimiento se ven con el día guardado', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token, { lotes: true });
    const caducidad = diaNegocio(25);
    const fechaMov = diaNegocio(-2);
    const p = await crearProductoApi(request, token, { categoria, unidad });
    await entradaApi(request, token, {
      producto_id: p.id,
      cantidad: 3,
      codigo_lote: 'L-FECHA',
      fecha_caducidad: caducidad,
      fecha: fechaMov,
    });
    await enFicha(page, request, p.id);
    const lotes = page.getByRole('table', { name: 'Lotes del producto' });
    await expect(fila(lotes, 'L-FECHA')).toContainText(enPantalla(caducidad));
    const historial = page.getByRole('table', { name: 'Historial de movimientos de inventario' });
    await expect(fila(historial, 'L-FECHA')).toContainText(enPantalla(fechaMov));
  });

  test('W61: ajuste que suma solo ofrece Corrección y Otro; queda en el historial con usuario', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const p = await crearProductoApi(request, token, { categoria, unidad, stock_inicial: 4 });
    const sesion = await enFicha(page, request, p.id);

    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar ajuste' });
    await dialogo.getByLabel('Tipo de ajuste').selectOption('aumento');
    const motivos = await dialogo.getByLabel('Motivo').locator('option').allTextContents();
    expect(motivos).toEqual(['Seleccione un motivo…', 'Corrección', 'Otro']);
    await dialogo.getByLabel('Motivo').selectOption('correccion');
    await dialogo.getByLabel('Cantidad').fill('2');
    await dialogo.getByLabel('Observación').fill('Conteo físico');
    await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click();

    await expect(page.getByText(`Ajuste registrado. Stock: 6 ${unidad.abreviatura}.`)).toBeVisible();
    const historial = page.getByRole('table', { name: 'Historial de movimientos de inventario' });
    const f = fila(historial, 'Conteo físico');
    await expect(f).toContainText(`+2 ${unidad.abreviatura}`);
    await expect(f).toContainText('Corrección');
    await expect(f).toContainText(sesion.usuario.nombre);
  });

  test('W62: lotes vencidos (simulados) en lista, ficha y alertas; "Dar de baja" preselecciona el ajuste', async ({ page, request }) => {
    const m = marca();
    const nombre = `E2E Vencido ${m}`;
    const base = {
      id: 777001,
      nombre,
      sku: null,
      descripcion: null,
      categoria_id: 1,
      categoria_nombre: 'Cat simulada',
      controla_lotes: true,
      unidad_id: 1,
      unidad_nombre: 'Unidad simulada',
      unidad_abreviatura: 'uds',
      permite_decimales: false,
      precio_venta: 2,
      stock_actual: 8,
      stock_vendible: 5,
      stock_vencido: 3,
      stock_minimo: 1,
      stock_bajo: false,
      estado: 'activo',
      tiene_movimientos: true,
    };
    const loteVencido = {
      id: 5501,
      producto_id: base.id,
      codigo_lote: 'LV-1',
      fecha_caducidad: diaNegocio(-4),
      cantidad_ingresada: 3,
      cantidad_disponible: 3,
      dias_para_vencer: -4,
      estado_caducidad: 'vencido',
    };
    const loteVigente = {
      id: 5502,
      producto_id: base.id,
      codigo_lote: 'LV-2',
      fecha_caducidad: diaNegocio(90),
      cantidad_ingresada: 5,
      cantidad_disponible: 5,
      dias_para_vencer: 90,
      estado_caducidad: 'vigente',
    };
    const alertas = {
      dias: 15,
      hoy: diaNegocio(0),
      stock_bajo: [],
      por_vencer: [],
      vencidos: [{ ...loteVencido, producto_nombre: nombre, unidad_abreviatura: 'uds' }],
      totales: { stock_bajo: 0, por_vencer: 0, vencidos: 1 },
    };
    await page.route(/\/api\/inventario\/alertas(\?.*)?$/, (r) => r.fulfill(json({ ok: true, data: alertas })));
    await page.route(/\/api\/productos(\?.*)?$/, (r) =>
      r.request().method() === 'GET' ? r.fulfill(json({ ok: true, data: [base] })) : r.fallback(),
    );
    await page.route(new RegExp(`/api/productos/${base.id}$`), (r) => r.fulfill(json({ ok: true, data: base })));
    await page.route(new RegExp(`/api/productos/${base.id}/lotes`), (r) =>
      r.fulfill(json({ ok: true, data: [loteVencido, loteVigente] })),
    );
    await page.route(/\/api\/inventario\/movimientos(\?.*)?$/, (r) =>
      r.fulfill(json({ ok: true, data: { items: [], total: 0, pagina: 1, limite: 50 } })),
    );

    // Lista: stock vendible e insignia de vencido.
    await enProductos(page, request);
    const f = fila(page, nombre);
    await expect(f).toContainText('5 uds');
    await expect(f).toContainText('Vencido: 3 uds');

    // Ficha: vendible, vencido y físico.
    await page.goto(`/productos/${base.id}`);
    await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Datos del producto' })).toContainText('Vencido: 3 uds · Físico: 8 uds');
    await expect(page.getByRole('link', { name: 'Dar de baja en Alertas' })).toBeVisible();

    // Alertas: "Dar de baja" abre el ajuste con todo preseleccionado.
    await page.goto('/productos/alertas');
    const tabla = page.getByRole('table', { name: 'Lotes vencidos con existencias' });
    await expect(page.getByText('No cuentan como stock vendible ni se despachan.')).toBeVisible();
    await expect(fila(tabla, 'LV-1')).toContainText('Vencido');
    await fila(tabla, 'LV-1').getByRole('button', { name: /^Dar de baja/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar ajuste' });
    await expect(dialogo.getByLabel('Tipo de ajuste')).toHaveValue('disminucion');
    await expect(dialogo.getByLabel('Motivo')).toHaveValue('caducidad');
    await expect(dialogo.getByLabel('Lote')).toHaveValue('5501');
    await expect(dialogo.getByLabel('Cantidad')).toHaveValue('3');

    // Con "Aumentar", el lote vencido ya no se ofrece.
    await expect(dialogo.getByLabel('Lote').locator('option', { hasText: 'LV-1' })).toHaveCount(1);
    await dialogo.getByLabel('Tipo de ajuste').selectOption('aumento');
    await expect(dialogo.getByLabel('Lote').locator('option', { hasText: 'LV-1' })).toHaveCount(0);
    await expect(dialogo.getByLabel('Lote').locator('option', { hasText: 'LV-2' })).toHaveCount(1);
  });

  test('W64: el contador de la barra baja sin recargar tras una entrada y no aparece si falla', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    const { unidad, categoria } = await datosBase(request, token);
    const p = await crearProductoApi(request, token, { categoria, unidad, stock_minimo: 1 });
    const totales = (await alertasApi(request, token)).totales;
    const n = totales.stock_bajo + totales.por_vencer + totales.vencidos;
    expect(n).toBeGreaterThan(0);

    await enProductos(page, request, `?buscar=${encodeURIComponent(p.nombre)}`);
    const barra = page.getByRole('navigation', { name: 'Principal' });
    await expect(barra.getByRole('link', { name: /^Productos/ })).toContainText(textoContador(n));

    await fila(page, p.nombre).getByRole('button', { name: `Entrada de ${p.nombre}` }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar entrada' });
    await dialogo.getByLabel('Cantidad').fill('10');
    await dialogo.getByRole('button', { name: 'Registrar entrada' }).click();
    await expect(page.getByText(/^Entrada registrada/)).toBeVisible();
    if (n - 1 > 0) {
      await expect(barra.getByRole('link', { name: /^Productos/ })).toContainText(textoContador(n - 1));
    } else {
      await expect(barra.getByRole('link', { name: /^Productos/ })).toHaveText('Productos');
    }
  });

  test('W64b: si la carga de alertas falla (503), no hay contador y el resto funciona', async ({ page, request }) => {
    await page.route(/\/api\/inventario\/alertas(\?.*)?$/, (r) =>
      r.fulfill(json({ ok: false, codigo: 'BD_NO_DISPONIBLE', mensaje: 'x' }, 503)),
    );
    await enProductos(page, request);
    const barra = page.getByRole('navigation', { name: 'Principal' });
    await expect(barra.getByRole('link', { name: /^Productos/ })).toHaveText('Productos');
    await expect(barra.getByText(/alertas? de inventario/)).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Lista de productos del inventario' }).or(page.getByText(/Aún no hay productos/))).toBeVisible();
  });
});
