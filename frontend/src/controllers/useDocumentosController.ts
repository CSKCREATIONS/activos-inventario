// CONTROLLER: Documentos — datos desde la API REST.
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDocumentosStore } from '../models/stores/useAccesoriosStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { documentosApi, equiposApi, usuariosApi } from '../services/api';
import type { Documento, TipoDocumento } from '../models/types/index';

export function useDocumentosController() {
  const { documentos, setDocumentos, deleteDocumento } = useDocumentosStore();
  const { equipos, setEquipos } = useEquiposStore();
  const { usuarios, setUsuarios } = useUsuariosStore();

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | ''>('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docRes, eqRes, usrRes] = await Promise.all([
        documentosApi.getAll(),
        equiposApi.getAll(),
        usuariosApi.getAll(),
      ]);
      setDocumentos(docRes.data);
      setEquipos(eqRes.data);
      setUsuarios(usrRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos.');
    } finally {
      setLoading(false);
    }
  }, [setDocumentos, setEquipos, setUsuarios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtrado y enriquecimiento local ──────────────────────────────────────
  const documentosEnriquecidos = useMemo(() => {
    return documentos
      .filter((d) => {
        const b = busqueda.toLowerCase();
        const match = !b || d.nombre.toLowerCase().includes(b);
        const matchTipo = !filtroTipo || d.tipo === filtroTipo;
        return match && matchTipo;
      })
      .map((d) => ({
        ...d,
        equipo: d.equipo_id ? equipos.find((e) => e.id === d.equipo_id) : null,
        usuario: d.usuario_id ? usuarios.find((u) => u.id === d.usuario_id) : null,
      }));
  }, [documentos, busqueda, filtroTipo, equipos, usuarios]);

  // ── Subir documento (FormData con archivo) ────────────────────────────────
  const subir = async (data: Omit<Documento, 'id' | 'fecha_carga' | 'version'> & { archivo?: File }) => {
    try {
      const form = new FormData();
      form.append('nombre', data.nombre);
      form.append('tipo', data.tipo);
      form.append('url', data.url ?? '');
      if (data.equipo_id) form.append('equipo_id', data.equipo_id);
      if (data.asignacion_id) form.append('asignacion_id', data.asignacion_id);
      if (data.usuario_id) form.append('usuario_id', data.usuario_id);
      if (data.cargado_por) form.append('cargado_por', data.cargado_por);
      if (data.archivo) form.append('archivo', data.archivo);

      const res = await documentosApi.create(form);
      setDocumentos([...documentos, res.data]);
      setModalAbierto(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir documento.');
    }
  };

  const eliminar = async (id: string) => {
    try {
      await documentosApi.remove(id);
      deleteDocumento(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar documento.');
    }
  };

  return {
    documentos: documentosEnriquecidos,
    busqueda, setBusqueda,
    filtroTipo, setFiltroTipo,
    modalAbierto, setModalAbierto,
    equipos, usuarios,
    subir,
    deleteDocumento: eliminar,
    loading, error,
    refetch: fetchData,
  };
}
