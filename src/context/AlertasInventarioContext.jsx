import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { obtenerAlertas } from '../services/api/inventario.js';

export const AlertasInventarioContext = createContext(null);

/**
 * Totales de alertas de inventario para el contador de la barra lateral.
 * Se carga al montar el panel y cuando una pantalla llama a recargarAlertas().
 * Si la carga falla, `totales` queda en null y no se interrumpe nada más.
 */
export function AlertasInventarioProvider({ children }) {
  const [totales, setTotales] = useState(null);
  const contador = useRef(0);

  const recargarAlertas = useCallback(async () => {
    const mio = ++contador.current;
    try {
      const datos = await obtenerAlertas();
      if (mio === contador.current) setTotales(datos?.totales ?? null);
    } catch {
      if (mio === contador.current) setTotales(null);
    }
  }, []);

  useEffect(() => {
    recargarAlertas();
    return () => {
      contador.current += 1;
    };
  }, [recargarAlertas]);

  const valor = useMemo(() => ({ totales, recargarAlertas }), [totales, recargarAlertas]);
  return <AlertasInventarioContext.Provider value={valor}>{children}</AlertasInventarioContext.Provider>;
}
