// VIEW: Dashboard
// Muestra KPIs, gráficas y alertas. Consume datos del useDashboardController.

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Monitor, CheckCircle, AlertTriangle, ShieldAlert, FileX, FileWarning, Repeat } from 'lucide-react';
import { useDashboardController } from '../../../controllers/useDashboardController';
import { KpiCard, Card } from '../../components/ui/index';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const CRITICIDAD_COLORS: Record<string, string> = {
  Baja: '#10b981',
  Media: '#f59e0b',
  Alta: '#f97316',
  Crítica: '#ef4444',
};

const ESTADO_COLORS: Record<string, string> = {
  Disponible: '#10b981',
  Asignado: '#3b82f6',
  Dañado: '#ef4444',
  Baja: '#94a3b8',
  'En revisión': '#f59e0b',
  Rentado: '#8b5cf6',
};

export function DashboardPage() {
  const { stats, datosPorArea, datosPorCriticidad, datosPorSO, datosPorEstado, alertas } =
    useDashboardController();

  return (
    <div className="space-y-6">

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                alerta.tipo === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : alerta.tipo === 'warning'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <AlertTriangle size={16} className="shrink-0" />
              {alerta.mensaje}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Total activos" valor={stats.total_equipos} icon={<Monitor size={20} />} color="blue" />
        <KpiCard titulo="Asignados" valor={stats.equipos_asignados} icon={<CheckCircle size={20} />} color="green" />
        <KpiCard titulo="Disponibles" valor={stats.equipos_disponibles} icon={<Monitor size={20} />} color="slate" />
        <KpiCard titulo="Críticos / Altos" valor={stats.equipos_criticos} icon={<ShieldAlert size={20} />} color="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard titulo="Sin acta firmada" valor={stats.equipos_sin_acta} icon={<FileX size={20} />} color="orange" />
        <KpiCard titulo="Sin hoja de vida" valor={stats.equipos_sin_hoja_vida} icon={<FileWarning size={20} />} color="orange" />
        <KpiCard titulo="Equipos rentados" valor={stats.equipos_rentados} icon={<Repeat size={20} />} color="purple" />
      </div>

      {/* Gráficas - fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Por estado */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Equipos por estado</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={datosPorEstado}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {datosPorEstado.map((entry) => (
                  <Cell key={entry.name} fill={ESTADO_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Por criticidad */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Distribución por criticidad</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={datosPorCriticidad} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Equipos" radius={[4, 4, 0, 0]}>
                {datosPorCriticidad.map((entry) => (
                  <Cell key={entry.name} fill={CRITICIDAD_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Gráficas - fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Por área */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Activos por área</h3>
          {datosPorArea.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Sin datos de áreas</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datosPorArea} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Activos asignados" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Por sistema operativo */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Equipos por sistema operativo</h3>
          {datosPorSO.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Sin datos de SO</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={datosPorSO}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {datosPorSO.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

    </div>
  );
}
