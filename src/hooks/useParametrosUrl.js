import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Filtros guardados en la URL: lee, cambia (con replace) y limpia las claves indicadas. */
export function useParametrosUrl(claves) {
  const [params, setParams] = useSearchParams();
  const valores = {};
  for (const k of claves) valores[k] = params.get(k) ?? '';

  const cambiar = useCallback(
    (cambios) => {
      setParams(
        (previos) => {
          const s = new URLSearchParams(previos);
          for (const [k, v] of Object.entries(cambios)) {
            if (v) s.set(k, v);
            else s.delete(k);
          }
          return s;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const limpiar = useCallback(
    (lista) => {
      setParams(
        (previos) => {
          const s = new URLSearchParams(previos);
          lista.forEach((k) => s.delete(k));
          return s;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { valores, cambiar, limpiar };
}
