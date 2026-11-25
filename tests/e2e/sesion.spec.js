import { test, expect } from '@playwright/test';
import {
  API,
  TEXTO,
  conAuth,
  entrarComoAdmin,
  hayCredenciales,
  iniciarSesionUI,
  loginApi,
  admin,
  usuarioNuevo,
} from './credenciales.js';

test.describe('Sesión y navegación (RF-03, RF-05, RF-06)', () => {
  test.skip(!hayCredenciales, 'Faltan credenciales de prueba (E2E_* o .env del backend).');

  test('W09: /usuarios sin sesión lleva al login y, tras entrar, vuelve a /usuarios', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/login$/);
    await iniciarSesionUI(page);
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toBeVisible();
  });

  test('W10: /login con sesión redirige a /', async ({ page, request }) => {
    await entrarComoAdmin(page, request);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();
  });

  test('W11: F5 mantiene la sesión', async ({ page, request }) => {
    await entrarComoAdmin(page, request, '/usuarios');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toBeVisible();
    await expect(page).toHaveURL(/\/usuarios$/);
  });

  test('W12: un token alterado lleva al login con mensaje', async ({ page, request }) => {
    await entrarComoAdmin(page, request);
    await page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('distrigo.sesion'));
      s.token = `${s.token}x`;
      sessionStorage.setItem('distrigo.sesion', JSON.stringify(s));
    });
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText(TEXTO.sesionCerrada);
  });

  test('W13: cerrar sesión invalida el token y "Atrás" no vuelve al panel', async ({ page, request }) => {
    await page.goto('/login');
    await iniciarSesionUI(page);
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();
    const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('distrigo.sesion')).token);

    await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText(TEXTO.logout);
    expect(await page.evaluate(() => sessionStorage.getItem('distrigo.sesion'))).toBeNull();

    const r = await request.get(`${API}/usuarios`, conAuth(token));
    expect(r.status()).toBe(401);
    expect((await r.json()).codigo).toBe('SESION_CERRADA');

    await page.goBack();
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toHaveCount(0);
  });

  test('W14: un minuto antes del límite aparece el aviso y "Seguir conectado" lo cierra', async ({ page, request }) => {
    await page.clock.install();
    const datos = await entrarComoAdmin(page, request);
    // Se espera a que el panel esté montado (y su temporizador activo) antes de adelantar el reloj.
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();
    const limiteMs = datos.inactividad_minutos * 60_000;

    await page.clock.fastForward(limiteMs - 30_000);
    const aviso = page.getByRole('alertdialog');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Su sesión está por expirar');

    await aviso.getByRole('button', { name: 'Seguir conectado' }).click();
    await expect(aviso).toBeHidden();
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();
  });

  test('W15: pasado el límite se cierra la sesión con el mensaje de inactividad', async ({ page, request }) => {
    await page.clock.install();
    const datos = await entrarComoAdmin(page, request);
    // Se espera a que el panel esté montado (y su temporizador activo) antes de adelantar el reloj.
    await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();
    await page.clock.fastForward(datos.inactividad_minutos * 60_000 + 60_000);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText(TEXTO.inactividad);
  });

  test('W16: un 401 SESION_EXPIRADA simulado en la lista redirige al login', async ({ page, request }) => {
    await entrarComoAdmin(page, request);
    await page.route(/\/api\/usuarios(\?.*)?$/, (ruta) =>
      ruta.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, codigo: 'SESION_EXPIRADA', mensaje: 'Sesion expirada' }),
      }),
    );
    await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('status')).toContainText(TEXTO.sesionCerrada);
  });

  test('W17: una sesión invalidada en el servidor lleva al login en la siguiente acción', async ({ page, request }) => {
    const principal = await loginApi(request, admin);
    const segundo = usuarioNuevo('e2e.admin');
    const creado = await request.post(`${API}/usuarios`, {
      ...conAuth(principal.token),
      data: { ...segundo, rol: 'administrador' },
    });
    test.skip(creado.status() !== 201, 'No se pudo crear el segundo administrador; probar W17 a mano.');
    const idSegundo = (await creado.json()).data.id;

    try {
      await page.goto('/login');
      await iniciarSesionUI(page, segundo);
      await expect(page.getByRole('heading', { name: /^Bienvenido/ })).toBeVisible();

      // El primer administrador cambia la contraseña del segundo: se cierran sus sesiones.
      const cambio = await request.put(`${API}/usuarios/${idSegundo}`, {
        ...conAuth(principal.token),
        data: { contrasena: `Bb2${segundo.contrasena}` },
      });
      expect(cambio.status()).toBe(200);

      await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('status')).toContainText(TEXTO.sesionCerrada);
    } finally {
      await request.patch(`${API}/usuarios/${idSegundo}/estado`, { ...conAuth(principal.token), data: { estado: 'inactivo' } });
    }
  });

  test('W18: el menú tiene 2 enlaces y 7 secciones deshabilitadas', async ({ page, request }) => {
    await entrarComoAdmin(page, request);
    const barra = page.getByRole('navigation', { name: 'Principal' });
    await expect(barra.locator('a')).toHaveCount(2);
    await expect(barra.locator('[aria-disabled="true"]')).toHaveCount(7);
    await expect(barra.getByText('Próximamente')).toHaveCount(7);
    await expect(barra.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  });

  test('menú colapsable en tablet: abre con el botón y cierra con Esc', async ({ page, request }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await entrarComoAdmin(page, request);
    const boton = page.getByRole('button', { name: 'Menú' });
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  test('ruta desconocida muestra la página 404', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });
});
