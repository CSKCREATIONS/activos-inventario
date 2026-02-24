// CONTROLLER: Reportes
// Genera los datos para los reportes exportables — datos desde la API REST.

import { useMemo, useEffect, useCallback, useState } from 'react';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useDocumentosStore } from '../models/stores/useAccesoriosStore';
import { equiposApi, usuariosApi, asignacionesApi, documentosApi } from '../services/api';

export function useReportesController() {
  const { equipos, setEquipos } = useEquiposStore();
  const { usuarios, setUsuarios } = useUsuariosStore();
  const { asignaciones, setAsignaciones } = useAsignacionesStore();
  const { documentos, setDocumentos } = useDocumentosStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eqRes, usrRes, asigRes, docRes] = await Promise.all([
        equiposApi.getAll(),
        usuariosApi.getAll(),
        asignacionesApi.getAll(),
        documentosApi.getAll(),
      ]);
      setEquipos(eqRes.data);
      setUsuarios(usrRes.data);
      setAsignaciones(asigRes.data);
      setDocumentos(docRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos para reportes.');
    } finally {
      setLoading(false);
    }
  }, [setEquipos, setUsuarios, setAsignaciones, setDocumentos]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Reporte: inventario completo ──────────────────────────────────────────
  const reporteInventario = useMemo(() => {
    return equipos.map((e) => {
      const asignacion = asignaciones.find((a) => a.equipo_id === e.id && a.estado === 'Activa');
      const usuario = asignacion ? usuarios.find((u) => u.id === asignacion.usuario_id) : null;
      return {
        placa: e.placa,
        serial: e.serial ?? '',
        tipo: e.tipo_equipo,
        marca: e.marca ?? '',
        modelo: e.modelo ?? '',
        so: e.sistema_operativo ?? '',
        criticidad: e.criticidad,
        confidencialidad: e.confidencialidad,
        estado: e.estado,
        responsable: usuario?.nombre ?? 'Sin asignar',
        area: usuario?.area ?? '',
        es_rentado: e.es_rentado ? 'Sí' : 'No',
        fecha_registro: e.fecha_registro,
      };
    });
  }, [equipos, asignaciones, usuarios]);

  // ── Reporte: equipos sin documentos ──────────────────────────────────────
  const reporteSinDocs = useMemo(() => {
    const equiposConActa = new Set(documentos.filter((d) => d.tipo === 'Acta').map((d) => d.equipo_id));
    const equiposConHv = new Set(documentos.filter((d) => d.tipo === 'Hoja de vida').map((d) => d.equipo_id));
    return equipos
      .filter((e) => e.estado !== 'Baja')
      .filter((e) => !equiposConActa.has(e.id) || !equiposConHv.has(e.id))
      .map((e) => ({
        placa: e.placa,
        tipo: e.tipo_equipo,
        estado: e.estado,
        sin_acta: equiposConActa.has(e.id) ? 'No' : 'Sí',
        sin_hoja_vida: equiposConHv.has(e.id) ? 'No' : 'Sí',
      }));
  }, [equipos, documentos]);

  // ── Reporte: historial de asignaciones ───────────────────────────────────
  const reporteHistorial = useMemo(() => {
    return asignaciones.map((a) => {
      const usuario = usuarios.find((u) => u.id === a.usuario_id);
      const equipo = equipos.find((e) => e.id === a.equipo_id);
      return {
        equipo_placa: equipo?.placa ?? '',
        equipo_tipo: equipo?.tipo_equipo ?? '',
        usuario: usuario?.nombre ?? '',
        area: usuario?.area ?? '',
        fecha_asignacion: a.fecha_asignacion,
        fecha_devolucion: a.fecha_devolucion ?? 'Activa',
        estado: a.estado,
      };
    }).sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion));
  }, [asignaciones, usuarios, equipos]);

  // ── Exportar a CSV ────────────────────────────────────────────────────────
  const exportarCSV = (datos: Record<string, string | number>[], nombreArchivo: string) => {
    if (!datos.length) return;
    const headers = Object.keys(datos[0]).join(',');
    const filas = datos.map((row) => Object.values(row).map((v) => `"${v}"`).join(','));
    const csv = [headers, ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { reporteInventario, reporteSinDocs, reporteHistorial, exportarCSV, loading, error };
}
