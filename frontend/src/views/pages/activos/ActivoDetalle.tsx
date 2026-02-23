// VIEW: Detalle de un Activo
// Muestra ficha completa, responsable actual e historial de asignaciones.

import { useActivosController } from '../../../controllers/useActivosController';
import {
  Button, Card, EstadoBadge, CriticidadBadge, ConfidencialidadBadge, Badge, Table, Th, Td
} from '../../components/ui/index';
import { ArrowLeft, User, Calendar, FileText, AlertTriangle } from 'lucide-react';

interface Props { equipoId: string; onVolver: () => void; }

export function ActivoDetalle({ equipoId, onVolver }: Props) {
  const ctrl = useActivosController();
  const equipo = ctrl.equipos.find((e) => e.id === equipoId);
  if (!equipo) return <div className="p-8 text-slate-400">Activo no encontrado.</div>;

  const responsable = ctrl.getResponsableActual(equipoId);
  const historial = ctrl.getHistorialEquipo(equipoId);

  return (
    <div className="space-y-6">
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onVolver}>Volver a Activos</Button>

      {/* Cabecera */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{equipo.tipo_equipo}</p>
            <h2 className="text-2xl font-bold text-slate-800 font-mono">{equipo.placa}</h2>
            {equipo.marca && <p className="text-slate-500 mt-1">{equipo.marca} {equipo.modelo}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <EstadoBadge estado={equipo.estado} />
            <CriticidadBadge criticidad={equipo.criticidad} />
            <ConfidencialidadBadge valor={equipo.confidencialidad} />
            {equipo.es_rentado && <Badge variant="purple">Rentado</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información técnica */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-600 rounded-full" />
            Información técnica
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Serial', equipo.serial],
              ['Sistema operativo', equipo.sistema_operativo],
              ['Versión SO', equipo.version_so],
              ['RAM', equipo.ram],
              ['Disco', equipo.disco],
              ['Proveedor', equipo.proveedor],
              ['Fecha de compra', equipo.fecha_compra],
              ['Fecha registro', equipo.fecha_registro],
              ['Costo', equipo.costo ? `$${equipo.costo.toLocaleString()}` : undefined],
            ].map(([k, v]) =>
              v ? (
                <div key={String(k)}>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">{k}</dt>
                  <dd className="font-medium text-slate-700">{v}</dd>
                </div>
              ) : null
            )}
          </dl>
          {equipo.observaciones && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg flex gap-2 text-sm text-amber-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {equipo.observaciones}
            </div>
          )}
        </Card>

        {/* Responsable actual */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full" />
            Responsable actual
          </h3>
          {responsable ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {responsable.nombre.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{responsable.nombre}</p>
                  <p className="text-xs text-slate-500">{responsable.cargo}</p>
                </div>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="text-xs text-slate-400">Área</dt><dd className="font-medium">{responsable.area}</dd></div>
                <div><dt className="text-xs text-slate-400">Proceso</dt><dd className="font-medium">{responsable.proceso}</dd></div>
                <div><dt className="text-xs text-slate-400">Correo</dt><dd className="font-medium text-blue-600">{responsable.correo}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <User size={32} />
              <p className="text-sm">Sin responsable asignado</p>
            </div>
          )}
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Calendar size={16} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Historial de asignaciones</h3>
          <Badge variant="blue" size="sm">{historial.length}</Badge>
        </div>
        {historial.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Sin historial de asignaciones</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Área</Th>
                <Th>Fecha asignación</Th>
                <Th>Fecha devolución</Th>
                <Th>Estado</Th>
                <Th>Documentos</Th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{h.usuario?.nombre ?? '—'}</Td>
                  <Td>{h.usuario?.area ?? '—'}</Td>
                  <Td>{h.fecha_asignacion}</Td>
                  <Td>{h.fecha_devolucion ?? <span className="text-emerald-600 font-medium">Activa</span>}</Td>
                  <Td>
                    <Badge variant={h.estado === 'Activa' ? 'green' : h.estado === 'Devuelta' ? 'blue' : 'red'}>
                      {h.estado}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {h.acta_pdf && <Badge variant="blue"><FileText size={10} className="mr-1" />Acta</Badge>}
                      {h.hoja_vida_pdf && <Badge variant="green"><FileText size={10} className="mr-1" />H. Vida</Badge>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
