// VIEW: Página Reportes
import { useReportesController } from '../../../controllers/useReportesController';
import { Button, Card, Table, Th, Td, Badge } from '../../components/ui/index';
import { Download, FileSpreadsheet } from 'lucide-react';

export function ReportesPage() {
  const { reporteInventario, reporteSinDocs, reporteHistorial, exportarCSV } = useReportesController();

  return (
    <div className="space-y-8">

      {/* Reporte 1: Inventario completo */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700">Inventario completo de activos</h3>
            <p className="text-xs text-slate-500">{reporteInventario.length} registros</p>
          </div>
          <Button variant="outline" icon={<Download size={14} />} onClick={() => exportarCSV(reporteInventario as never, 'inventario_activos')}>
            Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <Table>
            <thead>
              <tr>
                <Th>Placa</Th><Th>Tipo</Th><Th>Marca/Modelo</Th><Th>SO</Th>
                <Th>Criticidad</Th><Th>Estado</Th><Th>Responsable</Th><Th>Área</Th><Th>Rentado</Th>
              </tr>
            </thead>
            <tbody>
              {reporteInventario.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td className="font-mono text-blue-700">{r.placa}</Td>
                  <Td>{r.tipo}</Td>
                  <Td>{[r.marca, r.modelo].filter(Boolean).join(' ')}</Td>
                  <Td>{r.so || '—'}</Td>
                  <Td>
                    <Badge variant={r.criticidad === 'Alta' ? 'orange' : r.criticidad === 'Crítica' ? 'red' : r.criticidad === 'Media' ? 'yellow' : 'green'}>
                      {r.criticidad}
                    </Badge>
                  </Td>
                  <Td>{r.estado}</Td>
                  <Td>{r.responsable}</Td>
                  <Td>{r.area || '—'}</Td>
                  <Td>{r.es_rentado === 'Sí' ? <Badge variant="purple">Rentado</Badge> : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Reporte 2: Sin documentos */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              Activos con documentos faltantes
              {reporteSinDocs.length > 0 && <Badge variant="red">{reporteSinDocs.length}</Badge>}
            </h3>
            <p className="text-xs text-slate-500">Equipos sin acta o sin hoja de vida</p>
          </div>
          <Button variant="outline" icon={<Download size={14} />} onClick={() => exportarCSV(reporteSinDocs as never, 'activos_sin_documentos')}>
            Exportar CSV
          </Button>
        </div>
        {reporteSinDocs.length === 0 ? (
          <div className="py-10 text-center text-sm text-emerald-600 font-medium">
            ✓ Todos los activos tienen documentación completa
          </div>
        ) : (
          <Table>
            <thead>
              <tr><Th>Placa</Th><Th>Tipo</Th><Th>Estado</Th><Th>Sin acta</Th><Th>Sin hoja de vida</Th></tr>
            </thead>
            <tbody>
              {reporteSinDocs.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td className="font-mono text-blue-700">{r.placa}</Td>
                  <Td>{r.tipo}</Td>
                  <Td>{r.estado}</Td>
                  <Td>{r.sin_acta === 'Sí' ? <Badge variant="red">Falta</Badge> : <Badge variant="green">OK</Badge>}</Td>
                  <Td>{r.sin_hoja_vida === 'Sí' ? <Badge variant="red">Falta</Badge> : <Badge variant="green">OK</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Reporte 3: Historial de asignaciones */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700">Historial completo de asignaciones</h3>
            <p className="text-xs text-slate-500">{reporteHistorial.length} registros</p>
          </div>
          <Button variant="outline" icon={<FileSpreadsheet size={14} />} onClick={() => exportarCSV(reporteHistorial as never, 'historial_asignaciones')}>
            Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <Table>
            <thead>
              <tr><Th>Placa</Th><Th>Tipo</Th><Th>Usuario</Th><Th>Área</Th><Th>Fecha asignación</Th><Th>Fecha devolución</Th><Th>Estado</Th></tr>
            </thead>
            <tbody>
              {reporteHistorial.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td className="font-mono text-blue-700">{r.equipo_placa}</Td>
                  <Td>{r.equipo_tipo}</Td>
                  <Td>{r.usuario}</Td>
                  <Td>{r.area}</Td>
                  <Td>{r.fecha_asignacion}</Td>
                  <Td>{r.fecha_devolucion === 'Activa' ? <span className="text-emerald-600 font-medium">Activa</span> : r.fecha_devolucion}</Td>
                  <Td><Badge variant={r.estado === 'Activa' ? 'green' : r.estado === 'Devuelta' ? 'blue' : 'red'}>{r.estado}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

    </div>
  );
}
