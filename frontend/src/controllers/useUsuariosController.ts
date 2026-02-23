// CONTROLLER: Usuarios
// Lógica de búsqueda, CRUD y cálculo del perfil completo de un usuario.

import { useState, useMemo } from 'react';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useDocumentosStore } from '../models/stores/useAccesoriosStore';
import type { Usuario } from '../models/types/index';
import { v4 as uuidv4 } from 'uuid';

export function useUsuariosController() {
  const { usuarios, addUsuario, updateUsuario, deleteUsuario, selectedUsuario, setSelectedUsuario } =
    useUsuariosStore();
  const asignaciones = useAsignacionesStore((s) => s.asignaciones);
  const equipos = useEquiposStore((s) => s.equipos);
  const documentos = useDocumentosStore((s) => s.documentos);

  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const areas = useMemo(() => [...new Set(usuarios.map((u) => u.area))].sort((a, b) => a.localeCompare(b)), [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const b = busqueda.toLowerCase();
      const match =
        !b ||
        u.nombre.toLowerCase().includes(b) ||
        u.correo.toLowerCase().includes(b) ||
        u.area.toLowerCase().includes(b) ||
        u.proceso.toLowerCase().includes(b);
      const matchArea = !filtroArea || u.area === filtroArea;
      return match && matchArea;
    });
  }, [usuarios, busqueda, filtroArea]);

  // Perfil completo del usuario: equipos activos, historial y documentos
  const getPerfilUsuario = (usuarioId: string) => {
    const asignacionesActivas = asignaciones.filter(
      (a) => a.usuario_id === usuarioId && a.estado === 'Activa'
    );
    const historialCompleto = asignaciones
      .filter((a) => a.usuario_id === usuarioId)
      .map((a) => ({ ...a, equipo: equipos.find((e) => e.id === a.equipo_id) }))
      .sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion));

    const equiposActivos = asignacionesActivas.map((a) => equipos.find((e) => e.id === a.equipo_id)).filter(Boolean);

    const docsUsuario = documentos.filter((d) => d.usuario_id === usuarioId);

    return { asignacionesActivas, historialCompleto, equiposActivos, docsUsuario };
  };

  const crearUsuario = (data: Omit<Usuario, 'id' | 'fecha_registro'>) => {
    const nuevo: Usuario = {
      ...data,
      id: uuidv4(),
      fecha_registro: new Date().toISOString().split('T')[0],
    };
    addUsuario(nuevo);
    setModalAbierto(false);
  };

  const editarUsuario = (id: string, data: Partial<Usuario>) => {
    updateUsuario(id, data);
    setModalAbierto(false);
    setModoEdicion(false);
  };

  const abrirCrear = () => {
    setSelectedUsuario(null);
    setModoEdicion(false);
    setModalAbierto(true);
  };

  const abrirEditar = (u: Usuario) => {
    setSelectedUsuario(u);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
  };

  return {
    usuarios: usuariosFiltrados,
    totalUsuarios: usuarios.length,
    busqueda,
    setBusqueda,
    filtroArea,
    setFiltroArea,
    areas,
    modalAbierto,
    modoEdicion,
    selectedUsuario,
    setSelectedUsuario,
    abrirCrear,
    abrirEditar,
    cerrarModal,
    crearUsuario,
    editarUsuario,
    deleteUsuario,
    getPerfilUsuario,
  };
}
