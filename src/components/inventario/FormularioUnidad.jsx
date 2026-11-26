import { useRef, useState } from 'react';
import { actualizarUnidad, crearUnidad } from '../../services/api/unidades.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { MENSAJES } from '../../utils/mensajesError.js';
import { validarUnidad } from '../../utils/validacionesInventario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoCasilla from '../ui/CampoCasilla.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = ['nombre', 'abreviatura', 'permite_decimales'];

/** Modal de crear/editar unidad de medida (RF-10). `unidad` es null para crear. */
export default function FormularioUnidad({ unidad, onGuardado, onCerrar, onNoExiste }) {
  const editando = Boolean(unidad);
  const [valores, setValores] = useState({
    nombre: unidad?.nombre ?? '',
    abreviatura: unidad?.abreviatura ?? '',
    permite_decimales: Boolean(unidad?.permite_decimales),
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);
  const decimalesBloqueado = editando && unidad.tiene_movimientos;

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
    const locales = validarUnidad(valores);
    setErrores(locales);
    if (Object.keys(locales).length) return enfocar(locales);

    const nombre = valores.nombre.trim();
    const abreviatura = valores.abreviatura.trim();
    let cuerpo;
    if (editando) {
      cuerpo = {};
      if (nombre !== unidad.nombre) cuerpo.nombre = nombre;
      if (abreviatura !== unidad.abreviatura) cuerpo.abreviatura = abreviatura;
      if (valores.permite_decimales !== Boolean(unidad.permite_decimales)) {
        cuerpo.permite_decimales = valores.permite_decimales;
      }
      if (Object.keys(cuerpo).length === 0) {
        setErrorGeneral('No hay cambios para guardar.');
        return undefined;
      }
    } else {
      cuerpo = { nombre, abreviatura, permite_decimales: valores.permite_decimales };
    }

    setEnviando(true);
    try {
      if (editando) await actualizarUnidad(unidad.id, cuerpo);
      else await crearUnidad(cuerpo);
      onGuardado(editando ? 'Unidad actualizada' : 'Unidad creada');
    } catch (err) {
      setEnviando(false);
      if (err.codigo === 'UNIDAD_NO_ENCONTRADA' || err.estado === 404) {
        onNoExiste(MENSAJES.UNIDAD_NO_ENCONTRADA);
        return undefined;
      }
      const { porCampo, general } = clasificarError(err, CAMPOS, { UNIDAD_DUPLICADA: 'nombre' });
      setErrores(porCampo);
      setErrorGeneral(general);
      enfocar(porCampo);
    }
    return undefined;
  }

  return (
    <Modal titulo={editando ? 'Editar unidad' : 'Nueva unidad'} onCerrar={onCerrar} bloqueado={enviando}>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="modal__cuerpo">
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
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
            etiqueta="Abreviatura"
            name="abreviatura"
            value={valores.abreviatura}
            onChange={cambia('abreviatura')}
            error={errores.abreviatura}
            autoComplete="off"
          />
          <CampoCasilla
            etiqueta="Permitir cantidades con decimales"
            name="permite_decimales"
            checked={valores.permite_decimales}
            disabled={decimalesBloqueado}
            onChange={(e) => setValores((v) => ({ ...v, permite_decimales: e.target.checked }))}
            error={errores.permite_decimales}
            ayuda={
              decimalesBloqueado
                ? 'No se puede cambiar: hay productos con movimientos.'
                : 'Úsela para unidades como litros o kilos.'
            }
          />
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Guardando…">
            {editando ? 'Guardar cambios' : 'Crear unidad'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
