# DistriGO – Panel web de administración (AdminWeb)

Panel web del **administrador** de DistriGO. Módulo 1 (Autenticación y usuarios, RF-01 a RF-08): inicio de sesión, cierre de sesión, control de inactividad y gestión de usuarios (listar, filtrar, crear, editar, activar y desactivar).

Stack: React 19 + Vite 8 (JavaScript) y react-router 7. Diseño propio con CSS y variables, sin frameworks de UI. Toda la lógica y los permisos viven en el backend; este panel solo consume su API REST.

## Requisitos

- Node.js 22.12 o superior (probado con 22.15) y npm.
- Backend `App_DistriGo_Backen` en marcha en `http://localhost:3000` (con MySQL y al menos un administrador creado).
- Para las pruebas e2e: Google Chrome y Microsoft Edge instalados (no se descargan navegadores).

## Instalación

```bash
npm install
cp .env.example .env     # en PowerShell: Copy-Item .env.example .env
```

Variables de `.env` (el archivo no se versiona):

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base de la API, sin barra final | `http://localhost:3000/api` |

> Las variables `VITE_*` quedan dentro del código publicado. Nunca coloque claves ni contraseñas en este archivo.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en http://localhost:5173 |
| `npm test` | Pruebas unitarias (vitest) |
| `npm run test:e2e` | Pruebas e2e (Playwright, Chrome y Edge) en entorno aislado (backend :3100 y panel :5174) |

El puerto **5173 es obligatorio** (`strictPort`): el backend solo admite CORS desde `http://localhost:5173`. Si está ocupado, libérelo en lugar de cambiar de puerto.

## Pruebas

- **Unitarias** (`tests/unit`): cliente HTTP, validaciones y mensajes de error. Corren en entorno `node`.
- **E2E** (`tests/e2e`): Playwright levanta su propio entorno aislado: una instancia del backend (`node src/server.js` en `../App_DistriGo_Backen`, puerto 3100, `LOGIN_MAX_INTENTOS=1000`, CORS para `http://localhost:5174`; el resto sale del `.env` del backend, que debe tener MySQL disponible) y Vite en el puerto 5174 apuntando a `http://localhost:3100/api`. No usa ni afecta al backend de :3000 ni al `npm run dev` de :5173, pero los puertos 3100 y 5174 deben estar libres. La URL de la API para las ayudas de prueba se puede cambiar con `E2E_API_URL` (por defecto `http://localhost:3100/api`).
  - Las credenciales se leen de variables de entorno `E2E_ADMIN_CORREO`, `E2E_ADMIN_CONTRASENA`, `E2E_ADMIN_NOMBRE` y `E2E_REPARTIDOR_*`. Si faltan, se leen `TEST_ADMIN_*` y `TEST_REPARTIDOR_*` del `.env` del backend (`../App_DistriGo_Backen/.env`). Nunca se imprimen.
  - Como el backend de pruebas es propio y con el límite de logins elevado, repetir la suite no produce 429.
  - Los usuarios creados por las pruebas (`e2e.<marca>@prueba.local`) quedan en la base de datos, desactivados al terminar.
  - Para correr un solo navegador: `npx playwright test --project=chrome` o `--project=msedge`.

## Estructura

```
src/
  assets/        logo reducido
  components/    layout/ (barra lateral, cabecera), ui/ (botones, campos, modal...), sesion/, usuarios/
  context/       AuthContext (estado de sesión, inactividad) y useAuth
  pages/         Login, Inicio, Usuarios, 404
  routes/        RutaProtegida, RutaPublica
  services/      api/ (cliente HTTP, auth, usuarios) y almacenSesion
  styles/        variables, base, layout, componentes, login
  utils/         mensajes de error, validaciones, formato
tests/           unit/ y e2e/
```

## Notas de diseño

- **Sesión:** el token JWT se guarda en `sessionStorage` (sobrevive a F5 y se borra al cerrar la pestaña). La contraseña nunca se guarda.
- **Inactividad:** el backend cierra la sesión tras 30 minutos sin peticiones. El panel avisa 60 segundos antes; ratón y teclado no renuevan la sesión, solo "Seguir conectado".
- **Pantalla mínima:** 768 px (tablet). Por debajo de 1024 px la barra lateral se abre con el botón "Menú".
- **Secciones futuras:** Productos, Tiendas, Pedidos, Rutas, Cobros, Reportes y Agentes IA aparecen deshabilitadas ("Próximamente") hasta sus módulos.
- **Logo:** `src/assets/logo-distrigo.png` (320x320) y `public/favicon.png` (64x64) son reducciones del logo original de `Contexto/`.
- **Instalación de dependencias:** `vitest@5.1.0` falla en `npm install` desde cero por un error de resolución de peers de npm 11; el `package-lock.json` incluido evita el problema (use `npm ci` o `npm install` con el lock presente).
