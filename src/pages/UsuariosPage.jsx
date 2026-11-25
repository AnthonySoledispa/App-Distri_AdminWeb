import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../context/useAuth.js';
import { cambiarEstadoUsuario, listarUsuarios } from '../services/api/usuarios.js';
import { mensajeError, MENSAJES } from '../utils/mensajesError.js';
import Boton from '../components/ui/Boton.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import DialogoConfirmacion from '../components/ui/DialogoConfirmacion.jsx';
import FiltrosUsuarios from '../components/usuarios/FiltrosUsuarios.jsx';
import TablaUsuarios from '../components/usuarios/TablaUsuarios.jsx';
import FormularioUsuario from '../components/usuarios/FormularioUsuario.jsx';

const CLAVES_FILTRO = ['rol', 'estado', 'buscar'];

export default function UsuariosPage() {
  const { usuario: actual, actualizarUsuarioActual } = useAuth();
  const [params, setParams] = useSearchParams();
  const filtros = {
    rol: params.get('rol') ?? '',
    estado: params.get('estado') ?? '',
    buscar: params.get('buscar') ?? '',
  };

  const [usuarios, setUsuarios] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [formulario, setFormulario] = useState(null); // { usuario } | null
  const [confirmacion, setConfirmacion] = useState(null); // { usuario, nuevoEstado }
  const [enviandoEstado, setEnviandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');
  const [aviso, setAviso] = useState(null); // { texto, tipo } | null
  const temporizadorAviso = useRef(null);

  useEffect(() => {
    document.title = 'Usuarios | DistriGO';
  }, []);

  useEffect(() => () => clearTimeout(temporizadorAviso.current), []);

  const { rol, estado, buscar } = filtros;
  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError('');
    listarUsuarios({ rol, estado, buscar }, { signal: control.signal })
      .then((datos) => {
        setUsuarios(Array.isArray(datos) ? datos : []);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(mensajeError(e));
        setCargando(false);
      });
    return () => control.abort();
  }, [rol, estado, buscar, recarga]);

  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  const cambiarFiltros = useCallback(
    (cambios) => {
      setParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos);
          for (const [k, v] of Object.entries(cambios)) {
            if (v) siguientes.set(k, v);
            else siguientes.delete(k);
          }
          return siguientes;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const limpiarFiltros = useCallback(() => {
    setParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos);
        CLAVES_FILTRO.forEach((k) => siguientes.delete(k));
        return siguientes;
      },
      { replace: true },
    );
  }, [setParams]);

  function mostrarAviso(texto, tipo = 'exito') {
    clearTimeout(temporizadorAviso.current);
    setAviso({ texto, tipo });
    temporizadorAviso.current = setTimeout(() => setAviso(null), 4000);
  }

  function alGuardar({ mensaje, cambios }) {
    const editado = formulario?.usuario;
    setFormulario(null);
    // Si el administrador se edita a sí mismo, la cabecera se actualiza.
    if (editado && editado.id === actual?.id && cambios) {
      const parcial = {};
      if (cambios.nombre) parcial.nombre = cambios.nombre;
      if (cambios.correo) parcial.correo = cambios.correo;
      if (Object.keys(parcial).length) actualizarUsuarioActual(parcial);
    }
    mostrarAviso(mensaje);
    recargar();
  }

  function alNoExistir(texto) {
    setFormulario(null);
    setConfirmacion(null);
    mostrarAviso(texto, 'error');
    recargar();
  }

  async function confirmarEstado() {
    const { usuario, nuevoEstado } = confirmacion;
    setEnviandoEstado(true);
    setErrorEstado('');
    try {
      await cambiarEstadoUsuario(usuario.id, nuevoEstado);
      setConfirmacion(null);
      mostrarAviso(nuevoEstado === 'activo' ? 'Usuario activado' : 'Usuario desactivado');
      recargar();
    } catch (e) {
      if (e.codigo === 'USUARIO_NO_ENCONTRADO' || e.estado === 404) {
        alNoExistir(MENSAJES.USUARIO_NO_ENCONTRADO);
      } else {
        setErrorEstado(mensajeError(e));
      }
    } finally {
      setEnviandoEstado(false);
    }
  }

  function pedirCambioEstado(usuario) {
    setErrorEstado('');
    setConfirmacion({ usuario, nuevoEstado: usuario.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  const desactivando = confirmacion?.nuevoEstado === 'inactivo';

  return (
    <>
      <div className="pagina__encabezado">
        <p>Administre las cuentas de administradores y repartidores.</p>
        <Boton onClick={() => setFormulario({ usuario: null })}>Nuevo usuario</Boton>
      </div>

      <FiltrosUsuarios filtros={filtros} onCambiar={cambiarFiltros} onLimpiar={limpiarFiltros} />

      {error ? (
        <div className="tabla-caja estado-error">
          <Alerta tipo="error">{error}</Alerta>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : usuarios === null ? (
        <div className="tabla-caja">
          <Cargando texto="Cargando usuarios…" />
        </div>
      ) : (
        <TablaUsuarios
          usuarios={usuarios}
          idActual={actual?.id}
          ocupado={cargando}
          onEditar={(u) => setFormulario({ usuario: u })}
          onCambiarEstado={pedirCambioEstado}
        />
      )}

      {aviso && (
        <Alerta tipo={aviso.tipo} className="aviso-flotante">
          {aviso.texto}
        </Alerta>
      )}

      {formulario && (
        <FormularioUsuario
          usuario={formulario.usuario}
          esPropio={formulario.usuario?.id === actual?.id}
          onGuardado={alGuardar}
          onCerrar={() => setFormulario(null)}
          onNoExiste={alNoExistir}
        />
      )}

      {confirmacion && (
        <DialogoConfirmacion
          titulo={desactivando ? 'Desactivar usuario' : 'Activar usuario'}
          mensaje={
            desactivando
              ? `¿Desactivar a ${confirmacion.usuario.nombre}? No podrá iniciar sesión y se cerrarán sus sesiones abiertas.`
              : `¿Activar a ${confirmacion.usuario.nombre}? Podrá volver a iniciar sesión.`
          }
          textoConfirmar={desactivando ? 'Desactivar' : 'Activar'}
          peligro={desactivando}
          enviando={enviandoEstado}
          error={errorEstado}
          onConfirmar={confirmarEstado}
          onCancelar={() => setConfirmacion(null)}
        />
      )}
    </>
  );
}
