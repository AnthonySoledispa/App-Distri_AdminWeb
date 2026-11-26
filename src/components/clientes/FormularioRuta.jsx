import { useRef, useState } from 'react';
import { actualizarRuta, crearRuta } from '../../services/api/rutas.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { MENSAJES } from '../../utils/mensajesError.js';
import { validarRuta } from '../../utils/validacionesClientes.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoArea from '../ui/CampoArea.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = ['nombre', 'descripcion'];

/** Modal de crear/editar ruta. `ruta` es null para crear. El PUT lleva solo lo cambiado. */
export default function FormularioRuta({ ruta, onGuardado, onCerrar, onNoExiste }) {
  const editando = Boolean(ruta);
  const [valores, setValores] = useState({ nombre: ruta?.nombre ?? '', descripcion: ruta?.descripcion ?? '' });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);

  const cambia = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  function enfocar(mapa) {
    const campo = CAMPOS.find((c) => mapa[c]);
    if (campo) formRef.current?.querySelector(`[name="${campo}"]`)?.focus();
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErrorGeneral('');
    const locales = validarRuta(valores);
    setErrores(locales);
    if (Object.keys(locales).length) return enfocar(locales);

    const nombre = valores.nombre.trim();
    const descripcion = valores.descripcion.trim();
    let cuerpo;
    if (editando) {
      cuerpo = {};
      if (nombre !== ruta.nombre) cuerpo.nombre = nombre;
      if (descripcion !== (ruta.descripcion ?? '')) cuerpo.descripcion = descripcion || null;
      if (Object.keys(cuerpo).length === 0) {
        setErrorGeneral('No hay cambios para guardar.');
        return undefined;
      }
    } else {
      cuerpo = { nombre };
      if (descripcion) cuerpo.descripcion = descripcion;
    }

    setEnviando(true);
    try {
      if (editando) await actualizarRuta(ruta.id, cuerpo);
      else await crearRuta(cuerpo);
      onGuardado(editando ? 'Ruta actualizada' : 'Ruta creada');
    } catch (err) {
      setEnviando(false);
      if (err.codigo === 'RUTA_NO_ENCONTRADA' || err.estado === 404) {
        onNoExiste(MENSAJES.RUTA_NO_ENCONTRADA);
        return undefined;
      }
      const { porCampo, general } = clasificarError(err, CAMPOS, { RUTA_DUPLICADA: 'nombre' });
      setErrores(porCampo);
      setErrorGeneral(general);
      enfocar(porCampo);
    }
    return undefined;
  }

  return (
    <Modal titulo={editando ? 'Editar ruta' : 'Nueva ruta'} onCerrar={onCerrar} bloqueado={enviando}>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="modal__cuerpo">
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
          <CampoTexto
            etiqueta="Nombre"
            name="nombre"
            value={valores.nombre}
            onChange={cambia('nombre')}
            error={errores.nombre}
            maxLength={80}
            autoComplete="off"
            data-foco-inicial
          />
          <CampoArea
            etiqueta="Descripción (opcional)"
            name="descripcion"
            value={valores.descripcion}
            onChange={cambia('descripcion')}
            error={errores.descripcion}
            maxLength={255}
          />
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Guardando…">
            {editando ? 'Guardar cambios' : 'Crear ruta'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
