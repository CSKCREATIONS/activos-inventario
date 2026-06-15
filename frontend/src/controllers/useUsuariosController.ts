// CONTROLLER: Usuarios
// Lógica de búsqueda, CRUD y perfil de usuario — datos desde la API REST.

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

  // Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroTipoUsuario, setFiltroTipoUsuario] = useState(''); // nuevo filtro

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

  // ── Listas para filtros (áreas y sedes) ────────────────────────────────────
  const areas = useMemo(() => {
  const uniqueAreas = [...new Set(usuarios.map((u) => u.area).filter((a): a is string => a !== null && a !== ''))];
  return uniqueAreas.sort((a, b) => a.localeCompare(b));
}, [usuarios]);

const sedes = useMemo(() => {
  const uniqueSedes = [...new Set(usuarios.map((u) => u.sede || '').filter((s): s is string => s !== null && s !== ''))];
  return uniqueSedes.sort((a, b) => a.localeCompare(b));
}, [usuarios]);

  // Tipos de usuario disponibles (para filtro)
  const tiposUsuario = useMemo(() => {
    const tipos = new Set(usuarios.map((u) => u.tipo_usuario).filter(Boolean));
    return Array.from(tipos).sort();
  }, [usuarios]);

  // ── Filtrado local combinado ────────────────────────────────────────────────
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusqueda = !busqueda ||
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (u.correo && u.correo.toLowerCase().includes(busqueda.toLowerCase())) ||
        (u.area && u.area.toLowerCase().includes(busqueda.toLowerCase())) ||
        (u.proceso && u.proceso.toLowerCase().includes(busqueda.toLowerCase()));

      const matchArea = !filtroArea || u.area === filtroArea;
      const matchSede = !filtroSede || (u.sede || '') === filtroSede;
      const matchTipo = !filtroTipoUsuario || u.tipo_usuario === filtroTipoUsuario;

      return matchBusqueda && matchArea && matchSede && matchTipo;
    });
  }, [usuarios, busqueda, filtroArea, filtroSede, filtroTipoUsuario]);

  // ── Perfil del usuario (asignaciones, documentos) ─────────────────────────
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
      throw err; // para que la vista pueda manejar el error si lo desea
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
      throw err;
    }
  };

  const eliminarUsuario = async (id: string) => {
    try {
      await usuariosApi.remove(id);
      deleteUsuario(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario.');
      throw err;
    }
  };

  // ── Control de modal ───────────────────────────────────────────────────────
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
    // Datos
    usuarios: usuariosFiltrados,
    totalUsuarios: usuarios.length,
    areas,
    sedes,
    tiposUsuario,        // nuevo
    loading,
    error,

    // Filtros
    busqueda,
    setBusqueda,
    filtroArea,
    setFiltroArea,
    filtroSede,
    setFiltroSede,
    filtroTipoUsuario,   // nuevo
    setFiltroTipoUsuario,

    // Modal y CRUD
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
    refetch: fetchData,
  };
}