import { useState, useEffect, useCallback } from 'react';
import { susuariosApi } from '../services/api';

interface SistemaUsuario {
  id: string;
  username: string;
  nombre?: string;
  email?: string;
  rol: 'admin' | 'gestor';
  activo: boolean;
  ultimo_acceso?: string; 
}

export function useAdminController() {
  const [usuarios, setUsuarios] = useState<SistemaUsuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await susuariosApi.getAll();
      setUsuarios(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  const crearUsuario = async (data: { username: string; password: string; rol: string; nombre?: string; email?: string }) => {
    try {
      const res = await susuariosApi.create(data);
      await fetchUsuarios();
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
      throw err;
    }
  };

  const actualizarUsuario = async (id: string, data: Partial<SistemaUsuario>) => {
    try {
      await susuariosApi.update(id, data);
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
      throw err;
    }
  };

  const eliminarUsuario = async (id: string) => {
    try {
      await susuariosApi.remove(id);
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
      throw err;
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  return { usuarios, loading, error, crearUsuario, actualizarUsuario, eliminarUsuario, refetch: fetchUsuarios };
}
export type { SistemaUsuario };