import Modal from './Modal.jsx';
import Boton from './Boton.jsx';
import Alerta from './Alerta.jsx';

/** El foco inicial va a "Cancelar" para evitar confirmaciones accidentales. */
export default function DialogoConfirmacion({
  titulo,
  mensaje,
  textoConfirmar,
  peligro = false,
  enviando = false,
  error,
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal titulo={titulo} onCerrar={onCancelar} bloqueado={enviando}>
      <div className="modal__cuerpo">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <p>{mensaje}</p>
      </div>
      <div className="modal__pie">
        <Boton variante="secundario" onClick={onCancelar} disabled={enviando} data-foco-inicial>
          Cancelar
        </Boton>
        <Boton
          variante={peligro ? 'peligro' : 'primario'}
          onClick={onConfirmar}
          cargando={enviando}
          textoCargando="Procesando…"
        >
          {textoConfirmar}
        </Boton>
      </div>
    </Modal>
  );
}
