import { useReportesController } from '../../../controllers/useReportesController';
import { Card, Button, Table, Th, Td, Badge } from '../../components/ui/index';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export function ReportesPage() {
  const { reporteInventario, reporteSinDocs, reporteHistorial, exportarCSV, loading, error } = useReportesController();

  const handleExportInventario = () => exportarCSV(reporteInventario, 'inventario_completo');
  const handleExportSinDocs = () => exportarCSV(reporteSinDocs, 'equipos_sin_documentos');
  const handleExportHistorial = () => exportarCSV(reporteHistorial, 'historial_asignaciones');

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando reportes...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>

      {/* Botones de exportación */}
      <div className="flex flex-wrap gap-3">
        <Button icon={<Download size={16} />} onClick={handleExportInventario} className="bg-blue-600 text-white">
          Exportar inventario (CSV)
        </Button>
        <Button icon={<FileSpreadsheet size={16} />} onClick={handleExportSinDocs} variant="outline">Exportar equipos sin documentos</Button>
        <Button icon={<FileText size={16} />} onClick={handleExportHistorial} variant="outline">Exportar historial de asignaciones</Button>
      </div>

      {/* Reporte: inventario completo */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-700">Inventario completo</h2>
          <Badge variant="blue">{reporteInventario.length} equipos</Badge>
        </div>
        <Table>
          <thead><tr><Th>Placa</Th><Th>Serial</Th><Th>Tipo</Th><Th>Marca/Modelo</Th><Th>SO</Th><Th>Criticidad</Th><Th>Estado</Th><Th>Responsable</Th><Th>Área</Th></tr></thead>
          <tbody>
            {reporteInventario.slice(0, 10).map((eq, idx) => (
              <tr key={idx}>
                <Td className="font-mono font-medium">{eq.placa}</Td>
                <Td>{eq.serial}</Td>
                <Td>{eq.tipo}</Td>
                <Td>{eq.marca} {eq.modelo}</Td>
                <Td>{eq.so}</Td><Td><Badge variant={eq.criticidad === 'Crítica' ? 'red' : 'gray'}>{eq.criticidad}</Badge></Td>
                <Td><Badge variant={eq.estado === 'Asignado' ? 'green' : 'blue'}>{eq.estado}</Badge></Td>
                <Td>{eq.responsable}</Td><Td>{eq.area}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {reporteInventario.length > 10 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t">
            Mostrando 10 de {reporteInventario.length} registros
          </div>
        )}
      </Card>

      {/* Reporte: equipos sin documentos */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700">Equipos sin acta o sin hoja de vida</h2>
        </div>
        <Table>
          <thead><tr><Th>Placa</Th><Th>Tipo</Th><Th>Estado</Th><Th>Sin acta</Th><Th>Sin hoja de vida</Th></tr></thead>
          <tbody>
            {reporteSinDocs.map((eq, idx) => (
              <tr key={idx}>
                <Td className="font-mono">{eq.placa}</Td>
                <Td>{eq.tipo}</Td>
                <Td>{eq.estado}</Td>
                <Td>{eq.sin_acta === 'Sí' ? <Badge variant="red">Sí</Badge> : <Badge variant="green">No</Badge>}</Td>
                <Td>{eq.sin_hoja_vida === 'Sí' ? <Badge variant="red">Sí</Badge> : <Badge variant="green">No</Badge>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Reporte: historial de asignaciones */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700">Historial de asignaciones</h2>
        </div>
        <Table>
          <thead><tr><Th>Equipo</Th><Th>Tipo</Th><Th>Usuario</Th><Th>Área</Th><Th>Fecha asignación</Th><Th>Fecha devolución</Th><Th>Estado</Th></tr></thead>
          <tbody>
            {reporteHistorial.slice(0, 20).map((h, idx) => (
              <tr key={idx}>
                <Td>{h.equipo_placa}</Td><Td>{h.equipo_tipo}</Td><Td>{h.usuario}</Td><Td>{h.area}</Td>
                <Td>{h.fecha_asignacion}</Td><Td>{h.fecha_devolucion}</Td>
                <Td><Badge variant={h.estado === 'Activa' ? 'green' : 'gray'}>{h.estado}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}