import { formatearMoneda } from '../../utils/formato.js';
import Alerta from '../ui/Alerta.jsx';

/** Límite, saldo pendiente y crédito disponible de una tienda (RF-23). */
export default function ResumenCredito({ tienda }) {
  const soloContado = Number(tienda.limite_credito) === 0;
  return (
    <section className="resumen-credito" aria-labelledby="titulo-credito">
      <h3 id="titulo-credito">Crédito</h3>
      {tienda.credito_excedido && (
        <Alerta tipo="aviso">Crédito excedido: el saldo pendiente supera el límite autorizado.</Alerta>
      )}
      {soloContado && <p className="resumen-credito__nota">Tienda solo de contado (sin crédito autorizado).</p>}
      <dl className="resumen-credito__cifras">
        <div>
          <dt>Límite de crédito</dt>
          <dd>{formatearMoneda(tienda.limite_credito)}</dd>
        </div>
        <div>
          <dt>Saldo pendiente</dt>
          <dd>{formatearMoneda(tienda.saldo_pendiente)}</dd>
        </div>
        <div className={tienda.credito_excedido ? 'resumen-credito__cifra--alerta' : ''}>
          <dt>Crédito disponible</dt>
          <dd>{formatearMoneda(tienda.credito_disponible)}</dd>
        </div>
      </dl>
    </section>
  );
}
