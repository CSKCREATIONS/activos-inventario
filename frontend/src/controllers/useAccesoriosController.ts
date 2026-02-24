// CONTROLLER: Accesorios — datos desde la API REST.
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccesoriosStore } from '../models/stores/useAccesoriosStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { accesoriosApi, equiposApi } from '../services/api';
import type { Accesorio } from '../models/types/index';

export function useAccesoriosController() {
  const { accesorios, setAccesorios, updateAccesorio, deleteAccesorio } = useAccesoriosStore();
  const { equipos, setEquipos } = useEquiposStore();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [selected, setSelected] = useState<Accesorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, eqRes] = await Promise.all([
        accesoriosApi.getAll(),
        equiposApi.getAll(),
      ]);
      setAccesorios(accRes.data);
      setEquipos(eqRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar accesorios.');
    } finally {
      setLoading(false);
    }
  }, [setAccesorios, setEquipos]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtrado local ─────────────────────────────────────────────────────────
  const accesoriosFiltrados = useMemo(() => {
    return accesorios.filter((a) => {
      const b = busqueda.toLowerCase();
      const match = !b || a.nombre.toLowerCase().includes(b) || a.placa?.toLowerCase().includes(b);
      const matchEstado = !filtroEstado || a.estado === filtroEstado;
      return match && matchEstado;
    });
  }, [accesorios, busqueda, filtroEstado]);

  const accesoriosEnriquecidos = useMemo(() => {
    return accesoriosFiltrados.map((a) => ({
      ...a,
      equipo_principal: a.equipo_principal_id
        ? equipos.find((e) => e.id === a.equipo_principal_id)
        : null,
    }));
  }, [accesoriosFiltrados, equipos]);

  // ── CRUD con API ───────────────────────────────────────────────────────────
  const crear = async (data: Omit<Accesorio, 'id' | 'fecha_registro'>) => {
    try {
      const res = await accesoriosApi.create(data);
      setAccesorios([...accesorios, res.data]);
      setModalAbierto(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear accesorio.');
    }
  };

  const editar = async (id: string, data: Partial<Accesorio>) => {
    try {
      const res = await accesoriosApi.update(id, data);
      updateAccesorio(id, res.data);
      setModalAbierto(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar accesorio.');
    }
  };

  const eliminar = async (id: string) => {
    try {
      await accesoriosApi.remove(id);
      deleteAccesorio(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar accesorio.');
    }
  };

  return {
    accesorios: accesoriosEnriquecidos,
    busqueda, setBusqueda,
    filtroEstado, setFiltroEstado,
    modalAbierto, setModalAbierto,
    selected, setSelected,
    equipos,
    crear, editar,
    deleteAccesorio: eliminar,
    loading, error,
    refetch: fetchData,
  };
}
