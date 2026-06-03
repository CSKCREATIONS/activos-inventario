// CONTROLLER: Asignaciones
// Lógica de creación, devolución, búsqueda y validación de asignaciones — datos desde la API REST.

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { asignacionesApi, equiposApi, usuariosApi } from '../services/api';
import type { Asignacion, AccesorioAsignado } from '../models/types/index';

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

  // Agrupar accesorios disponibles por tipo
  const accesoriosDisponiblesAgrupados = useMemo(() => {
    const accesorios = equipos.filter((e) => e.estado === 'Disponible');
    const tipos = new Set<string>();
    accesorios.forEach((a) => {
      if (a.tipo_equipo && ['Monitor', 'Impresora', 'Escáner', 'Celular', 'Tablet', 'Router', 'Switch', 'UPS'].includes(a.tipo_equipo)) {
        tipos.add(a.tipo_equipo);
      }
    });
    const grouped: Record<string, typeof accesorios> = {};
    Array.from(tipos).forEach((tipo) => {
      grouped[tipo] = accesorios.filter((a) => a.tipo_equipo === tipo);
    });
    return grouped;
  }, [equipos]);

  // ── CRUD con API ───────────────────────────────────────────────────────────
  const crearAsignacion = async (data: {
    usuario_id: string;
    equipo_id: string;
    observaciones?: string;
    fecha_asignacion: string;
    accesorios_entregados?: (string | AccesorioAsignado)[];
    generar_hoja_vida?: boolean;
  }) => {
    try {
      // Debug: log de datos siendo enviados
      console.log('[Asignaciones] Datos siendo enviados al backend:', data);
      console.log('[Asignaciones] Accesorios entregados:', data.accesorios_entregados);
      
      const res = await asignacionesApi.create(data);
      // Re-fetch para sincronizar estado del equipo
      const [asigRes, eqRes] = await Promise.all([
        asignacionesApi.getAll(),
        equiposApi.getAll(),
      ]);
      setAsignaciones(asigRes.data);
      setEquipos(eqRes.data);
      setModalAbierto(false);
      // Intentar previsualizar el acta generada automáticamente
      try {
        // Si la respuesta de creación no trae id, buscarla entre las asignaciones recargadas
        let createdId: string | undefined = res?.data?.id;
        if (!createdId) {
          const match = asigRes.data.find((a: any) => (
            a.equipo_id === data.equipo_id &&
            a.usuario_id === data.usuario_id &&
            a.fecha_asignacion === data.fecha_asignacion &&
            a.estado === 'Activa'
          ));
          createdId = match?.id;
        }
        if (createdId) {
          const { blob } = await asignacionesApi.downloadActa(createdId, true);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      } catch (err: unknown) {
        // No bloquear la acción principal si la generación/previsualización falla
        console.error('Error al generar/previsualizar acta:', err);
      }
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

  const descargarBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const descargarActa = async (asignacionId: string) => {
    try {
      const { blob, filename } = await asignacionesApi.downloadActa(asignacionId, true);
      descargarBlob(blob, filename);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al descargar acta.');
    }
  };

  const previsualizarActa = async (asignacionId: string) => {
    try {
      // Forzar regeneración para asegurarnos de mostrar el acta rellena
      const { blob } = await asignacionesApi.downloadActa(asignacionId, true);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al previsualizar acta.');
    }
  };

  const descargarHojaVida = async (equipoId: string, placa?: string) => {
    try {
      const blob = await equiposApi.getHojaVidaPdf(equipoId);
      const safePlaca = (placa ?? equipoId).toString().replaceAll(/[^a-zA-Z0-9_-]+/g, '_');
      descargarBlob(blob, `hoja_vida_${safePlaca}.pdf`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al descargar hoja de vida.');
    }
  };

  const editarAsignacion = async (asignacionId: string, datosActualizados: Partial<any>) => {
    try {
      setLoading(true);
      setError(null);
      
      const actualizada = await asignacionesApi.update(asignacionId, datosActualizados);
      
      // Actualizar en el store
      updateAsignacion(asignacionId, actualizada.data);
      
      // Recargar todos los datos para sincronizar
      await fetchData();
      
      setSelectedAsignacion(null);
      setModalAbierto(false);
      
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al actualizar asignación.';
      setError(errorMsg);
      return { error: errorMsg };
    } finally {
      setLoading(false);
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
    accesoriosDisponiblesAgrupados,
    usuarios,
    crearAsignacion,
    editarAsignacion,
    registrarDevolucion,
    descargarActa,
    previsualizarActa,
    descargarHojaVida,
    updateAsignacion,
    loading,
    error,
    refetch: fetchData,
  };
}
