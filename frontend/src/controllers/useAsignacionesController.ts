// CONTROLLER: Asignaciones
// Lógica de creación, devolución, búsqueda y validación de asignaciones — datos desde la API REST.

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { asignacionesApi, equiposApi, usuariosApi } from '../services/api';
import type { Asignacion } from '../models/types/index';

export function useAsignacionesController() {
  const { asignaciones, setAsignaciones, updateAsignacion } = useAsignacionesStore();
  const { equipos, setEquipos } = useEquiposStore();
  const { usuarios, setUsuarios } = useUsuariosStore();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<Asignacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asigRes, eqRes, usrRes] = await Promise.all([
        asignacionesApi.getAll(),
        equiposApi.getAll(),
        usuariosApi.getAll(),
      ]);
      setAsignaciones(asigRes.data);
      setEquipos(eqRes.data);
      setUsuarios(usrRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar asignaciones.');
    } finally {
      setLoading(false);
    }
  }, [setAsignaciones, setEquipos, setUsuarios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtrado y enriquecimiento local ──────────────────────────────────────
  const asignacionesEnriquecidas = useMemo(() => {
    return asignaciones
      .map((a) => ({
        ...a,
        usuario: usuarios.find((u) => u.id === a.usuario_id),
        equipo: equipos.find((e) => e.id === a.equipo_id),
      }))
      .sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion));
  }, [asignaciones, usuarios, equipos]);

  const asignacionesFiltradas = useMemo(() => {
    return asignacionesEnriquecidas.filter((a) => {
      const b = busqueda.toLowerCase();
      const match =
        !b ||
        a.usuario?.nombre.toLowerCase().includes(b) ||
        a.equipo?.placa.toLowerCase().includes(b) ||
        a.equipo?.tipo_equipo.toLowerCase().includes(b);
      const matchEstado = !filtroEstado || a.estado === filtroEstado;
      return match && matchEstado;
    });
  }, [asignacionesEnriquecidas, busqueda, filtroEstado]);

  const equiposDisponibles = useMemo(() => {
    return equipos.filter((e) => e.estado === 'Disponible');
  }, [equipos]);

  // ── CRUD con API ───────────────────────────────────────────────────────────
  const crearAsignacion = async (data: {
    usuario_id: string;
    equipo_id: string;
    observaciones?: string;
    fecha_asignacion: string;
  }) => {
    try {
      const res = await asignacionesApi.create(data);
      // Re-fetch para sincronizar estado del equipo
      const [asigRes, eqRes] = await Promise.all([
        asignacionesApi.getAll(),
        equiposApi.getAll(),
      ]);
      setAsignaciones(asigRes.data);
      setEquipos(eqRes.data);
      setModalAbierto(false);
      return { error: null, data: res.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear asignación.';
      setError(msg);
      return { error: msg };
    }
  };

  const registrarDevolucion = async (asignacionId: string) => {
    try {
      await asignacionesApi.devolucion(asignacionId);
      const [asigRes, eqRes] = await Promise.all([
        asignacionesApi.getAll(),
        equiposApi.getAll(),
      ]);
      setAsignaciones(asigRes.data);
      setEquipos(eqRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar devolución.');
    }
  };

  return {
    asignaciones: asignacionesFiltradas,
    totalAsignaciones: asignaciones.length,
    asignacionesActivas: asignaciones.filter((a) => a.estado === 'Activa').length,
    busqueda,
    setBusqueda,
    filtroEstado,
    setFiltroEstado,
    modalAbierto,
    setModalAbierto,
    selectedAsignacion,
    setSelectedAsignacion,
    equiposDisponibles,
    usuarios,
    crearAsignacion,
    registrarDevolucion,
    updateAsignacion,
    loading,
    error,
    refetch: fetchData,
  };
}
