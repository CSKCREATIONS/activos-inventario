// CONTROLLER: Activos (Equipos)
// Lógica de filtrado, búsqueda y CRUD de equipos.

import { useState, useMemo } from 'react';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import type { Equipo, EstadoEquipo, Criticidad, TipoEquipo } from '../models/types/index';
import { v4 as uuidv4 } from 'uuid';

export interface FiltrosEquipos {
  busqueda: string;
  estado: EstadoEquipo | '';
  criticidad: Criticidad | '';
  tipo: TipoEquipo | '';
  es_rentado: boolean | null;
}

export function useActivosController() {
  const { equipos, addEquipo, updateEquipo, deleteEquipo, selectedEquipo, setSelectedEquipo } =
    useEquiposStore();
  const asignaciones = useAsignacionesStore((s) => s.asignaciones);
  const usuarios = useUsuariosStore((s) => s.usuarios);

  const [filtros, setFiltros] = useState<FiltrosEquipos>({
    busqueda: '',
    estado: '',
    criticidad: '',
    tipo: '',
    es_rentado: null,
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

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

  const crearEquipo = (data: Omit<Equipo, 'id' | 'fecha_registro'>) => {
    const nuevoEquipo: Equipo = {
      ...data,
      id: uuidv4(),
      fecha_registro: new Date().toISOString().split('T')[0],
    };
    addEquipo(nuevoEquipo);
    setModalAbierto(false);
  };

  const editarEquipo = (id: string, data: Partial<Equipo>) => {
    updateEquipo(id, data);
    setModalAbierto(false);
    setModoEdicion(false);
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
    deleteEquipo,
    getResponsableActual,
    getHistorialEquipo,
  };
}
