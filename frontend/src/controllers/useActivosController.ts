// CONTROLLER: Activos (Equipos)
// Lógica de filtrado, búsqueda y CRUD de equipos — datos desde la API REST.

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { equiposApi, asignacionesApi, usuariosApi } from '../services/api';
import type { Equipo, EstadoEquipo, Criticidad, TipoEquipo } from '../models/types/index';

export interface FiltrosEquipos {
  busqueda: string;
  estado: EstadoEquipo | '';
  criticidad: Criticidad | '';
  tipo: TipoEquipo | '';
  es_rentado: boolean | null;
}

export function useActivosController() {
  const { equipos, setEquipos, updateEquipo, deleteEquipo, selectedEquipo, setSelectedEquipo } =
    useEquiposStore();
  const { asignaciones, setAsignaciones } = useAsignacionesStore();
  const { usuarios, setUsuarios } = useUsuariosStore();

  const [filtros, setFiltros] = useState<FiltrosEquipos>({
    busqueda: '',
    estado: '',
    criticidad: '',
    tipo: '',
    es_rentado: null,
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carga inicial desde la API ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eqRes, asigRes, usrRes] = await Promise.all([
        equiposApi.getAll(),
        asignacionesApi.getAll(),
        usuariosApi.getAll(),
      ]);
      setEquipos(eqRes.data);
      setAsignaciones(asigRes.data);
      setUsuarios(usrRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar equipos.');
    } finally {
      setLoading(false);
    }
  }, [setEquipos, setAsignaciones, setUsuarios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtrado local ───────────────────────────────────────────────────────────
  const equiposFiltrados = useMemo(() => {
    return equipos.filter((e) => {
      const b = filtros.busqueda.toLowerCase();
      const matchBusqueda =
        !b ||
        e.placa.toLowerCase().includes(b) ||
        e.marca?.toLowerCase().includes(b) ||
        e.modelo?.toLowerCase().includes(b) ||
        e.serial?.toLowerCase().includes(b);
      const matchEstado = !filtros.estado || e.estado === filtros.estado;
      const matchCriticidad = !filtros.criticidad || e.criticidad === filtros.criticidad;
      const matchTipo = !filtros.tipo || e.tipo_equipo === filtros.tipo;
      const matchRentado = filtros.es_rentado === null || e.es_rentado === filtros.es_rentado;
      return matchBusqueda && matchEstado && matchCriticidad && matchTipo && matchRentado;
    });
  }, [equipos, filtros]);

  const getResponsableActual = (equipoId: string) => {
    const asignacion = asignaciones.find(
      (a) => a.equipo_id === equipoId && a.estado === 'Activa'
    );
    if (!asignacion) return null;
    return usuarios.find((u) => u.id === asignacion.usuario_id) ?? null;
  };

  const getHistorialEquipo = (equipoId: string) => {
    return asignaciones
      .filter((a) => a.equipo_id === equipoId)
      .map((a) => ({
        ...a,
        usuario: usuarios.find((u) => u.id === a.usuario_id),
      }))
      .sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion));
  };

  // ── CRUD con API ─────────────────────────────────────────────────────────────
  const crearEquipo = async (data: Omit<Equipo, 'id' | 'fecha_registro'>) => {
    try {
      const res = await equiposApi.create(data);
      setEquipos([...equipos, res.data]);
      setModalAbierto(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear equipo.');
    }
  };

  const editarEquipo = async (id: string, data: Partial<Equipo>) => {
    try {
      const res = await equiposApi.update(id, data);
      updateEquipo(id, res.data);
      setModalAbierto(false);
      setModoEdicion(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar equipo.');
    }
  };

  const eliminarEquipo = async (id: string) => {
    try {
      await equiposApi.remove(id);
      deleteEquipo(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar equipo.');
    }
  };

  const abrirCrear = () => {
    setSelectedEquipo(null);
    setModoEdicion(false);
    setModalAbierto(true);
  };

  const abrirEditar = (equipo: Equipo) => {
    setSelectedEquipo(equipo);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
  };

  return {
    equipos: equiposFiltrados,
    totalEquipos: equipos.length,
    filtros,
    setFiltros,
    modalAbierto,
    modoEdicion,
    selectedEquipo,
    setSelectedEquipo,
    abrirCrear,
    abrirEditar,
    cerrarModal,
    crearEquipo,
    editarEquipo,
    deleteEquipo: eliminarEquipo,
    getResponsableActual,
    getHistorialEquipo,
    loading,
    error,
    refetch: fetchData,
  };
}
