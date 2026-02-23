// CONTROLLER: Dashboard
// Lógica de negocio para calcular KPIs y datos de las gráficas del dashboard.
// La vista solo consume lo que este hook expone.

import { useMemo } from 'react';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useAsignacionesStore } from '../models/stores/useAsignacionesStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import { useDocumentosStore } from '../models/stores/useAccesoriosStore';
import type { DashboardStats } from '../models/types/index';

export function useDashboardController() {
  const equipos = useEquiposStore((s) => s.equipos);
  const asignaciones = useAsignacionesStore((s) => s.asignaciones);
  const usuarios = useUsuariosStore((s) => s.usuarios);
  const documentos = useDocumentosStore((s) => s.documentos);

  const stats: DashboardStats = useMemo(() => {
    const equiposConActa = new Set(documentos.filter((d) => d.tipo === 'Acta').map((d) => d.equipo_id));
    const equiposConHv = new Set(documentos.filter((d) => d.tipo === 'Hoja de vida').map((d) => d.equipo_id));

    return {
      total_equipos: equipos.filter((e) => e.estado !== 'Baja').length,
      equipos_asignados: equipos.filter((e) => e.estado === 'Asignado').length,
      equipos_disponibles: equipos.filter((e) => e.estado === 'Disponible').length,
      equipos_criticos: equipos.filter((e) => e.criticidad === 'Alta' || e.criticidad === 'Crítica').length,
      equipos_sin_acta: equipos.filter((e) => e.estado !== 'Baja' && !equiposConActa.has(e.id)).length,
      equipos_sin_hoja_vida: equipos.filter((e) => e.estado !== 'Baja' && !equiposConHv.has(e.id)).length,
      equipos_rentados: equipos.filter((e) => e.es_rentado).length,
    };
  }, [equipos, documentos]);

  // Datos para gráfica: distribución por área (basada en asignaciones activas)
  const datosPorArea = useMemo(() => {
    const mapa: Record<string, number> = {};
    asignaciones
      .filter((a) => a.estado === 'Activa')
      .forEach((a) => {
        const user = usuarios.find((u) => u.id === a.usuario_id);
        const area = user?.area ?? 'Sin área';
        mapa[area] = (mapa[area] ?? 0) + 1;
      });
    return Object.entries(mapa).map(([name, value]) => ({ name, value }));
  }, [asignaciones, usuarios]);

  // Datos para gráfica: distribución por criticidad
  const datosPorCriticidad = useMemo(() => {
    const mapa: Record<string, number> = {};
    equipos.filter((e) => e.estado !== 'Baja').forEach((e) => {
      mapa[e.criticidad] = (mapa[e.criticidad] ?? 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value }));
  }, [equipos]);

  // Datos para gráfica: distribución por sistema operativo
  const datosPorSO = useMemo(() => {
    const mapa: Record<string, number> = {};
    equipos.filter((e) => e.sistema_operativo && e.estado !== 'Baja').forEach((e) => {
      const so = e.sistema_operativo!;
      mapa[so] = (mapa[so] ?? 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value }));
  }, [equipos]);

  // Datos para gráfica: distribución por estado
  const datosPorEstado = useMemo(() => {
    const mapa: Record<string, number> = {};
    equipos.forEach((e) => {
      mapa[e.estado] = (mapa[e.estado] ?? 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value }));
  }, [equipos]);

  // Alertas
  const alertas = useMemo(() => {
    const list: { tipo: 'error' | 'warning' | 'info'; mensaje: string }[] = [];
    if (stats.equipos_sin_acta > 0)
      list.push({ tipo: 'warning', mensaje: `${stats.equipos_sin_acta} equipos sin acta firmada` });
    if (stats.equipos_sin_hoja_vida > 0)
      list.push({ tipo: 'warning', mensaje: `${stats.equipos_sin_hoja_vida} equipos sin hoja de vida` });
    const sinResponsable = equipos.filter(
      (e) => e.estado === 'Asignado' && !asignaciones.some((a) => a.equipo_id === e.id && a.estado === 'Activa')
    );
    if (sinResponsable.length > 0)
      list.push({ tipo: 'error', mensaje: `${sinResponsable.length} equipos "Asignado" sin asignación activa registrada` });
    if (stats.equipos_rentados > 0)
      list.push({ tipo: 'info', mensaje: `${stats.equipos_rentados} equipo(s) rentado(s) activos` });
    return list;
  }, [stats, equipos, asignaciones]);

  return { stats, datosPorArea, datosPorCriticidad, datosPorSO, datosPorEstado, alertas };
}
