import { useRef, useState } from 'react';
import { crearUsuario, actualizarUsuario } from '../../services/api/usuarios.js';
import { mensajeError, MENSAJES } from '../../utils/mensajesError.js';
import {
  ROLES,
  camposCambiados,
  normalizarCorreo,
  normalizarNombre,
  validarFormularioUsuario,
} from '../../utils/validacionesUsuario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = ['nombre', 'correo', 'contrasena', 'rol'];

/**
 * Modal de crear/editar usuario.
 * - usuario: null para crear; el objeto para editar.
 * - esPropio: edición del administrador con sesión (rol bloqueado).
 */
export default function FormularioUsuario({ usuario, esPropio = false, onGuardado, onCerrar, onNoExiste }) {
  const editando = Boolean(usuario);
  const [valores, setValores] = useState({
    nombre: usuario?.nombre ?? '',
    correo: usuario?.correo ?? '',
    rol: usuario?.rol ?? 'repartidor',
    contrasena: '',
    confirmacion: '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);
  const rolBloqueado = editando && esPropio;

  const cambia = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  const avisaCierreSesiones =
    editando && !esPropio && (valores.rol !== usuario.rol || valores.contrasena !== '');

  function enfocarPrimerError(mapa) {
    const orden = ['nombre', 'correo', 'rol', 'contrasena', 'confirmacion'];
    const campo = orden.find((c) => mapa[c]);
    if (campo) formRef.current?.querySelector(`[name="${campo}"]`)?.focus();
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErrorGeneral('');

    const locales = validarFormularioUsuario(valores, { editando, rolBloqueado });
    setErrores(locales);
    if (Object.keys(locales).length) return enfocarPrimerError(locales);

    let cuerpo;
    if (editando) {
      cuerpo = camposCambiados(usuario, valores, { rolBloqueado });
      if (Object.keys(cuerpo).length === 0) {
        setErrorGeneral('No hay cambios para guardar.');
        return undefined;
      }
    } else {
      cuerpo = {
        nombre: normalizarNombre(valores.nombre),
        correo: normalizarCorreo(valores.correo),
        contrasena: valores.contrasena,
        rol: valores.rol,
      };
    }

    setEnviando(true);
    try {
      if (editando) await actualizarUsuario(usuario.id, cuerpo);
      else await crearUsuario(cuerpo);
      onGuardado({
        mensaje: editando ? 'Usuario actualizado' : 'Usuario creado',
        cambios: editando ? cuerpo : null,
      });
    } catch (err) {
      setEnviando(false);
      manejarError(err);
    }
    return undefined;
  }

  function manejarError(err) {
    if (err.codigo === 'USUARIO_NO_ENCONTRADO' || err.estado === 404) {
      onNoExiste(MENSAJES.USUARIO_NO_ENCONTRADO);
      return;
    }
    if (err.codigo === 'CORREO_DUPLICADO') {
      const nuevos = { correo: MENSAJES.CORREO_DUPLICADO };
      setErrores(nuevos);
      enfocarPrimerError(nuevos);
      return;
    }
    if (err.codigo === 'VALIDACION' && err.errores?.length) {
      const porCampo = {};
      const generales = [];
      for (const { campo, mensaje } of err.errores) {
        if (CAMPOS.includes(campo) && !porCampo[campo]) porCampo[campo] = mensaje;
        else generales.push(mensaje);
      }
      setErrores(porCampo);
      setErrorGeneral(generales.join(' '));
      enfocarPrimerError(porCampo);
      return;
    }
    setErrorGeneral(mensajeError(err));
  }

  return (
    <Modal titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} onCerrar={onCerrar} bloqueado={enviando}>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="modal__cuerpo">
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
          {avisaCierreSesiones && (
            <Alerta tipo="aviso">Se cerrarán las sesiones abiertas de este usuario.</Alerta>
          )}

          <CampoTexto
            etiqueta="Nombre"
            name="nombre"
            value={valores.nombre}
            onChange={cambia('nombre')}
            error={errores.nombre}
            autoComplete="off"
            data-foco-inicial
          />
          <CampoTexto
            etiqueta="Correo electrónico"
            name="correo"
            type="email"
            value={valores.correo}
            onChange={cambia('correo')}
            error={errores.correo}
            autoComplete="off"
          />
          <CampoSelect
            etiqueta="Rol"
            name="rol"
            opciones={ROLES}
            value={valores.rol}
            onChange={cambia('rol')}
            error={errores.rol}
            disabled={rolBloqueado}
            ayuda={rolBloqueado ? 'No puede cambiar su propio rol' : undefined}
          />
          <CampoTexto
            etiqueta={editando ? 'Nueva contraseña' : 'Contraseña'}
            name="contrasena"
            type="password"
            value={valores.contrasena}
            onChange={cambia('contrasena')}
            error={errores.contrasena}
            autoComplete="new-password"
            ayuda={
              editando
                ? 'Déjela vacía para no cambiarla. De 8 a 72 bytes, con al menos una letra y un número.'
                : 'De 8 a 72 bytes, con al menos una letra y un número.'
            }
          />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            name="confirmacion"
            type="password"
            value={valores.confirmacion}
            onChange={cambia('confirmacion')}
            error={errores.confirmacion}
            autoComplete="new-password"
          />
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Guardando…">
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
