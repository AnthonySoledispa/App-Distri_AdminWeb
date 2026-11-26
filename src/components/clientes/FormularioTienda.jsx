import { useRef, useState } from 'react';
import { actualizarCliente, crearCliente } from '../../services/api/clientes.js';
import { clasificarError } from '../../utils/erroresFormulario.js';
import { formatearMoneda } from '../../utils/formato.js';
import { MENSAJES } from '../../utils/mensajesError.js';
import { camposCambiadosTienda, cuerpoNuevaTienda, validarTienda } from '../../utils/validacionesClientes.js';
import { aNumero } from '../../utils/validacionesInventario.js';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';
import CampoTexto from '../ui/CampoTexto.jsx';
import CampoSelect from '../ui/CampoSelect.jsx';
import Alerta from '../ui/Alerta.jsx';
import DialogoConfirmacion from '../ui/DialogoConfirmacion.jsx';

const CAMPOS = ['nombre', 'contacto', 'telefono', 'direccion', 'ruta_id', 'limite_credito'];
const CAMPO_POR_CODIGO = { CLIENTE_DUPLICADO: 'nombre', RUTA_INACTIVA: 'ruta_id', RUTA_NO_ENCONTRADA: 'ruta_id' };

/** Opciones de ruta: solo activas, más la actual de la tienda aunque esté inactiva. */
export function opcionesRuta(rutas, tienda) {
  const lista = rutas
    .filter((r) => r.estado === 'activo' || r.id === tienda?.ruta_id)
    .map((r) => ({ valor: String(r.id), etiqueta: r.estado === 'activo' ? r.nombre : `${r.nombre} (inactiva)` }));
  return [{ valor: '', etiqueta: 'Sin ruta' }, ...lista];
}

/** Modal de crear/editar tienda (RF-20, RF-21). `tienda` es null para crear. El PUT lleva solo lo cambiado. */
export default function FormularioTienda({ tienda, rutas, onGuardado, onCerrar, onNoExiste }) {
  const editando = Boolean(tienda);
  const [valores, setValores] = useState({
    nombre: tienda?.nombre ?? '',
    contacto: tienda?.contacto ?? '',
    telefono: tienda?.telefono ?? '',
    direccion: tienda?.direccion ?? '',
    ruta_id: tienda?.ruta_id ? String(tienda.ruta_id) : '',
    limite_credito: tienda ? String(tienda.limite_credito).replace('.', ',') : '0',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmarLimite, setConfirmarLimite] = useState(null); // cuerpo pendiente
  const formRef = useRef(null);

  const cambia = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  function enfocar(mapa) {
    const campo = CAMPOS.find((c) => mapa[c]);
    if (campo) formRef.current?.querySelector(`[name="${campo}"]`)?.focus();
  }

  async function guardar(cuerpo) {
    setEnviando(true);
    try {
      if (editando) await actualizarCliente(tienda.id, cuerpo);
      else await crearCliente(cuerpo);
      onGuardado(editando ? 'Tienda actualizada' : 'Tienda creada');
    } catch (err) {
      setEnviando(false);
      setConfirmarLimite(null);
      if (err.codigo === 'CLIENTE_NO_ENCONTRADO') {
        onNoExiste(MENSAJES.CLIENTE_NO_ENCONTRADO);
        return;
      }
      const { porCampo, general } = clasificarError(err, CAMPOS, CAMPO_POR_CODIGO);
      setErrores(porCampo);
      setErrorGeneral(general);
      enfocar(porCampo);
    }
  }

  function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setErrorGeneral('');
    const locales = validarTienda(valores);
    setErrores(locales);
    if (Object.keys(locales).length) {
      enfocar(locales);
      return;
    }
    if (!editando) {
      guardar(cuerpoNuevaTienda(valores));
      return;
    }
    const cuerpo = camposCambiadosTienda(tienda, valores);
    if (Object.keys(cuerpo).length === 0) {
      setErrorGeneral('No hay cambios para guardar.');
      return;
    }
    if (cuerpo.limite_credito !== undefined && cuerpo.limite_credito < Number(tienda.saldo_pendiente)) {
      setConfirmarLimite(cuerpo);
      return;
    }
    guardar(cuerpo);
  }

  return (
    <>
      <Modal titulo={editando ? 'Editar tienda' : 'Nueva tienda'} onCerrar={onCerrar} bloqueado={enviando}>
        <form ref={formRef} onSubmit={enviar} noValidate>
          <div className="modal__cuerpo">
            {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
            <CampoTexto
              etiqueta="Nombre de la tienda"
              name="nombre"
              value={valores.nombre}
              onChange={cambia('nombre')}
              error={errores.nombre}
              maxLength={120}
              autoComplete="off"
              data-foco-inicial
            />
            <CampoTexto
              etiqueta="Persona de contacto"
              name="contacto"
              value={valores.contacto}
              onChange={cambia('contacto')}
              error={errores.contacto}
              maxLength={100}
              autoComplete="off"
            />
            <CampoTexto
              etiqueta="Teléfono"
              name="telefono"
              type="tel"
              value={valores.telefono}
              onChange={cambia('telefono')}
              error={errores.telefono}
              ayuda="Celular 09XXXXXXXX o fijo 02XXXXXXX. También acepta +593."
              maxLength={25}
              autoComplete="off"
            />
            <CampoTexto
              etiqueta="Dirección"
              name="direccion"
              value={valores.direccion}
              onChange={cambia('direccion')}
              error={errores.direccion}
              maxLength={255}
              autoComplete="off"
            />
            <CampoSelect
              etiqueta="Ruta"
              name="ruta_id"
              opciones={opcionesRuta(rutas, tienda)}
              value={valores.ruta_id}
              onChange={cambia('ruta_id')}
              error={errores.ruta_id}
            />
            <CampoTexto
              etiqueta="Límite de crédito (USD)"
              name="limite_credito"
              inputMode="decimal"
              value={valores.limite_credito}
              onChange={cambia('limite_credito')}
              error={errores.limite_credito}
              ayuda="0 = solo contado"
              autoComplete="off"
            />
          </div>
          <div className="modal__pie">
            <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={enviando} textoCargando="Guardando…">
              {editando ? 'Guardar cambios' : 'Crear tienda'}
            </Boton>
          </div>
        </form>
      </Modal>
      {confirmarLimite && (
        <DialogoConfirmacion
          titulo="Reducir límite de crédito"
          mensaje={`El nuevo límite (${formatearMoneda(aNumero(valores.limite_credito))}) es menor que el saldo pendiente de la tienda (${formatearMoneda(
            tienda.saldo_pendiente,
          )}). La tienda quedará con el crédito excedido y no podrá hacer pedidos a crédito hasta saldar la diferencia. ¿Desea continuar?`}
          textoConfirmar="Guardar de todos modos"
          peligro
          enviando={enviando}
          onConfirmar={() => guardar(confirmarLimite)}
          onCancelar={() => setConfirmarLimite(null)}
        />
      )}
    </>
  );
}
