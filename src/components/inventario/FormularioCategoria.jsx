import { useRef, useState } from 'react';
import { actualizarCategoria, crearCategoria } from '../../services/api/categorias.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { MENSAJES } from '../../utils/mensajesError.js';
import { validarCategoria } from '../../utils/validacionesInventario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoArea from '../ui/CampoArea.jsx';
import CampoCasilla from '../ui/CampoCasilla.jsx';
import Alerta from '../ui/Alerta.jsx';

const CAMPOS = ['nombre', 'descripcion', 'controla_lotes'];

/** Modal de crear/editar categoría (RF-10, RF-16). `categoria` es null para crear. */
export default function FormularioCategoria({ categoria, onGuardado, onCerrar, onNoExiste }) {
  const editando = Boolean(categoria);
  const [valores, setValores] = useState({
    nombre: categoria?.nombre ?? '',
    descripcion: categoria?.descripcion ?? '',
    controla_lotes: Boolean(categoria?.controla_lotes),
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);
  const lotesBloqueado = editando && categoria.tiene_movimientos;

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
    const locales = validarCategoria(valores);
    setErrores(locales);
    if (Object.keys(locales).length) return enfocar(locales);

    const nombre = valores.nombre.trim();
    const descripcion = valores.descripcion.trim();
    let cuerpo;
    if (editando) {
      cuerpo = {};
      if (nombre !== categoria.nombre) cuerpo.nombre = nombre;
      if (descripcion !== (categoria.descripcion ?? '')) cuerpo.descripcion = descripcion || null;
      if (valores.controla_lotes !== Boolean(categoria.controla_lotes)) cuerpo.controla_lotes = valores.controla_lotes;
      if (Object.keys(cuerpo).length === 0) {
        setErrorGeneral('No hay cambios para guardar.');
        return undefined;
      }
    } else {
      cuerpo = { nombre, controla_lotes: valores.controla_lotes };
      if (descripcion) cuerpo.descripcion = descripcion;
    }

    setEnviando(true);
    try {
      if (editando) await actualizarCategoria(categoria.id, cuerpo);
      else await crearCategoria(cuerpo);
      onGuardado(editando ? 'Categoría actualizada' : 'Categoría creada');
    } catch (err) {
      setEnviando(false);
      if (err.codigo === 'CATEGORIA_NO_ENCONTRADA' || err.estado === 404) {
        onNoExiste(MENSAJES.CATEGORIA_NO_ENCONTRADA);
        return undefined;
      }
      const { porCampo, general } = clasificarError(err, CAMPOS, { CATEGORIA_DUPLICADA: 'nombre' });
      setErrores(porCampo);
      setErrorGeneral(general);
      enfocar(porCampo);
    }
    return undefined;
  }

  return (
    <Modal titulo={editando ? 'Editar categoría' : 'Nueva categoría'} onCerrar={onCerrar} bloqueado={enviando}>
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
          <CampoArea
            etiqueta="Descripción (opcional)"
            name="descripcion"
            value={valores.descripcion}
            onChange={cambia('descripcion')}
            error={errores.descripcion}
            maxLength={255}
          />
          <CampoCasilla
            etiqueta="Controlar lotes y fecha de caducidad"
            name="controla_lotes"
            checked={valores.controla_lotes}
            disabled={lotesBloqueado}
            onChange={(e) => setValores((v) => ({ ...v, controla_lotes: e.target.checked }))}
            error={errores.controla_lotes}
            ayuda={
              lotesBloqueado
                ? 'No se puede cambiar: hay productos con movimientos.'
                : 'Al registrar entradas se pedirá el lote y la fecha de caducidad.'
            }
          />
        </div>
        <div className="modal__pie">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} textoCargando="Guardando…">
            {editando ? 'Guardar cambios' : 'Crear categoría'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
