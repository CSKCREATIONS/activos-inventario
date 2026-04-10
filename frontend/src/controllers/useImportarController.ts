// CONTROLLER: Importar CSV — gestiona estado de carga masiva
import { useState, useCallback } from 'react';
import { importarApi, type EntidadImportable, type ImportarResult } from '../services/api';

export function useImportarController() {
  const [entidad, setEntidad] = useState<EntidadImportable>('equipos');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ImportarResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File | null) => {
    setArchivo(file);
    setResultado(null);
    setError(null);
  }, []);

  const handleEntidad = useCallback((e: EntidadImportable) => {
    setEntidad(e);
    setArchivo(null);
    setResultado(null);
    setError(null);
  }, []);

  const handleImportar = useCallback(async () => {
    if (!archivo) return;
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const res = await importarApi.upload(entidad, archivo);
      setResultado(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [entidad, archivo]);

  const descargarPlantilla = useCallback(() => {
    importarApi.descargarPlantilla(entidad);
  }, [entidad]);

  const reset = useCallback(() => {
    setArchivo(null);
    setResultado(null);
    setError(null);
  }, []);

  return {
    entidad,
    archivo,
    loading,
    resultado,
    error,
    handleFile,
    handleEntidad,
    handleImportar,
    descargarPlantilla,
    reset,
  };
}
