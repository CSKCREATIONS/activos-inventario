// CONTROLLER: Usuarios
// Lógica de búsqueda, CRUD y cálculo del perfil completo de un usuario — datos desde la API REST.

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useDocumentosStore } from '../models/stores/useAccesoriosStore';
import { usuariosApi, asignacionesApi, equiposApi, documentosApi } from '../services/api';
import type { Usuario } from '../models/types/index';

export function useUsuariosController() {
  const { usuarios, setUsuarios, updateUsuario, deleteUsuario, selectedUsuario, setSelectedUsuario } =
    useUsuariosStore();
  const { asignaciones, setAsignaciones } = useAsignacionesStore();
  const { equipos, setEquipos } = useEquiposStore();
  const { documentos, setDocumentos } = useDocumentosStore();

  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usrRes, asigRes, eqRes, docRes] = await Promise.all([
        usuariosApi.getAll(),
        asignacionesApi.getAll(),
        equiposApi.getAll(),
        documentosApi.getAll(),
      ]);
      setUsuarios(usrRes.data);
      setAsignaciones(asigRes.data);
      setEquipos(eqRes.data);
      setDocumentos(docRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  }, [setUsuarios, setAsignaciones, setEquipos, setDocumentos]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtrado local ─────────────────────────────────────────────────────────
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

  // ── CRUD con API ───────────────────────────────────────────────────────────
  const crearUsuario = async (data: Omit<Usuario, 'id' | 'fecha_registro'>) => {
    try {
      const res = await usuariosApi.create(data);
      setUsuarios([...usuarios, res.data]);
      setModalAbierto(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario.');
    }
  };

  const editarUsuario = async (id: string, data: Partial<Usuario>) => {
    try {
      const res = await usuariosApi.update(id, data);
      updateUsuario(id, res.data);
      setModalAbierto(false);
      setModoEdicion(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario.');
    }
  };

  const eliminarUsuario = async (id: string) => {
    try {
      await usuariosApi.remove(id);
      deleteUsuario(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario.');
    }
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
    deleteUsuario: eliminarUsuario,
    getPerfilUsuario,
    loading,
    error,
    refetch: fetchData,
  };
}
