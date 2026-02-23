// CONTROLLER: Asignaciones
// Lógica de creación, devolución, búsqueda y validación de asignaciones.

import { useState, useMemo } from 'react';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import type { Asignacion } from '../models/types/index';
import { v4 as uuidv4 } from 'uuid';

export function useAsignacionesController() {
  const { asignaciones, addAsignacion, updateAsignacion, devolverEquipo } = useAsignacionesStore();
  const { equipos, updateEquipo } = useEquiposStore();
  const usuarios = useUsuariosStore((s) => s.usuarios);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<Asignacion | null>(null);

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

  // Equipos disponibles para asignar (sin asignación activa)
  const equiposDisponibles = useMemo(() => {
    const asignadosIds = new Set(
      asignaciones.filter((a) => a.estado === 'Activa').map((a) => a.equipo_id)
    );
    return equipos.filter((e) => !asignadosIds.has(e.id) && e.estado === 'Disponible');
  }, [equipos, asignaciones]);

  const crearAsignacion = (data: {
    usuario_id: string;
    equipo_id: string;
    observaciones?: string;
    fecha_asignacion: string;
  }) => {
    // Validar que el equipo no tenga asignación activa
    const yaAsignado = asignaciones.find(
      (a) => a.equipo_id === data.equipo_id && a.estado === 'Activa'
    );
    if (yaAsignado) return { error: 'El equipo ya tiene una asignación activa.' };

    const nueva: Asignacion = {
      id: uuidv4(),
      ...data,
      estado: 'Activa',
    };
    addAsignacion(nueva);
    updateEquipo(data.equipo_id, { estado: 'Asignado' });
    setModalAbierto(false);
    return { error: null };
  };

  const registrarDevolucion = (asignacionId: string, equipoId: string) => {
    const fecha = new Date().toISOString().split('T')[0];
    devolverEquipo(asignacionId, fecha);
    updateEquipo(equipoId, { estado: 'Disponible' });
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
  };
}
