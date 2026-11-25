import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { iniciarSesion as iniciarSesionApi, cerrarSesionApi, obtenerPerfil } from '../services/api/auth.js';
import { ApiError, registrarManejadorSesionInvalida } from '../services/api/cliente.js';
import {
  guardarFlash,
  guardarSesion,
  leerSesion,
  limpiarSesion,
  actualizarSesion,
} from '../services/almacenSesion.js';
import { MENSAJES, mensajeSesionInvalida } from '../utils/mensajesError.js';

export const AuthContext = createContext(null);

const INTERVALO_COMPROBACION_MS = 15_000;
export const AVISO_ANTES_MS = 60_000;

const sesionInicial = () => leerSesion();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState(() => (sesionInicial() ? 'verificando' : 'anonimo'));
  const [usuario, setUsuario] = useState(() => sesionInicial()?.usuario ?? null);
  const [avisoInactividad, setAvisoInactividad] = useState(false);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const pasarAAnonimo = useCallback((mensajeFlash) => {
    limpiarSesion();
    if (mensajeFlash) guardarFlash(mensajeFlash);
    setUsuario(null);
    setAvisoInactividad(false);
    setEstado('anonimo');
  }, []);

  // 401 de sesión (token ausente/inválido, sesión cerrada o expirada) en peticiones autenticadas.
  useEffect(() => {
    registrarManejadorSesionInvalida((codigo) => {
      if (!leerSesion()) return;
      const s = leerSesion();
      pasarAAnonimo(
        mensajeSesionInvalida(codigo, {
          ultimaActividad: s?.ultimaActividad,
          inactividadMinutos: s?.inactividadMinutos,
        }),
      );
    });
    return () => registrarManejadorSesionInvalida(null);
  }, [pasarAAnonimo]);

  // Verificación inicial de la sesión guardada (F5).
  const verificar = useCallback(async () => {
    const s = leerSesion();
    if (!s) {
      setEstado('anonimo');
      return;
    }
    setEstado('verificando');
    try {
      const perfil = await obtenerPerfil();
      if (perfil?.rol !== 'administrador') {
        pasarAAnonimo(MENSAJES.CLIENTE_NO_PERMITIDO);
        return;
      }
      actualizarSesion({ usuario: perfil });
      setUsuario(perfil);
      setEstado('autenticado');
    } catch (e) {
      if (e instanceof ApiError && (e.codigo === 'RED' || e.codigo === 'TIEMPO_AGOTADO' || e.estado >= 500)) {
        setEstado('errorConexion');
      } else if (!leerSesion()) {
        setEstado('anonimo'); // ya lo resolvió el manejador de sesión inválida
      } else {
        pasarAAnonimo(MENSAJES.SESION_CERRADA);
      }
    }
  }, [pasarAAnonimo]);

  useEffect(() => {
    if (sesionInicial()) verificar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarSesion = useCallback(
    async (correo, contrasena) => {
      const datos = await iniciarSesionApi(correo, contrasena);
      if (datos?.usuario?.rol !== 'administrador') {
        // Comprobación defensiva: el panel solo admite administradores.
        guardarSesion({ token: datos.token, usuario: datos.usuario, inactividadMinutos: 30, ultimaActividad: Date.now() });
        try {
          await cerrarSesionApi();
        } catch {
          /* se ignora */
        }
        limpiarSesion();
        throw new ApiError({ estado: 403, codigo: 'CLIENTE_NO_PERMITIDO', mensaje: MENSAJES.CLIENTE_NO_PERMITIDO });
      }
      guardarSesion({
        token: datos.token,
        usuario: datos.usuario,
        inactividadMinutos: datos.inactividad_minutos,
        ultimaActividad: Date.now(),
      });
      setUsuario(datos.usuario);
      setAvisoInactividad(false);
      setEstado('autenticado');
      return datos.usuario;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await cerrarSesionApi();
    } catch {
      /* si falla, igual se cierra la sesión local */
    }
    pasarAAnonimo(MENSAJES.LOGOUT);
    navigate('/login', { replace: true });
  }, [navigate, pasarAAnonimo]);

  const expirarPorInactividad = useCallback(() => {
    pasarAAnonimo(MENSAJES.INACTIVIDAD);
  }, [pasarAAnonimo]);

  const actualizarUsuarioActual = useCallback((parcial) => {
    setUsuario((u) => {
      const nuevo = { ...u, ...parcial };
      actualizarSesion({ usuario: nuevo });
      return nuevo;
    });
  }, []);

  // Control de inactividad: solo las peticiones al backend renuevan la sesión.
  const comprobarInactividad = useCallback(() => {
    if (estadoRef.current !== 'autenticado') return;
    const s = leerSesion();
    if (!s) return;
    const limite = (s.inactividadMinutos || 30) * 60_000;
    const transcurrido = Date.now() - (s.ultimaActividad || Date.now());
    if (transcurrido >= limite) {
      expirarPorInactividad();
    } else {
      setAvisoInactividad(limite - transcurrido <= AVISO_ANTES_MS);
    }
  }, [expirarPorInactividad]);

  useEffect(() => {
    if (estado !== 'autenticado') return undefined;
    comprobarInactividad();
    const id = setInterval(comprobarInactividad, INTERVALO_COMPROBACION_MS);
    return () => clearInterval(id);
  }, [estado, comprobarInactividad]);

  const seguirConectado = useCallback(async () => {
    await obtenerPerfil();
    comprobarInactividad();
  }, [comprobarInactividad]);

  const valor = useMemo(
    () => ({
      estado,
      usuario,
      avisoInactividad,
      iniciarSesion,
      logout,
      verificar,
      seguirConectado,
      expirarPorInactividad,
      actualizarUsuarioActual,
    }),
    [
      estado,
      usuario,
      avisoInactividad,
      iniciarSesion,
      logout,
      verificar,
      seguirConectado,
      expirarPorInactividad,
      actualizarUsuarioActual,
    ],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
