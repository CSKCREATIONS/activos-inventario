// VIEW: Reportes
import { useReportesController } from '../../../controllers/useReportesController';
import { Card, Button, Table, Th, Td, Badge } from '../../components/ui/index';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

// Interfaz local para los items del inventario (coincide con lo que devuelve el controlador)
interface InventarioItem {
  placa: string;
  serial: string;
  tipo: string;
  marca: string;
  modelo: string;
  so: string;
  sede?: string;
  destino?: string;
  criticidad: string;
  estado: string;
  responsable: string;
  area: string;
}

export function ReportesPage() {
  const { reporteInventario, reporteSinDocs, reporteHistorial, exportarCSV, loading, error } = useReportesController();
  const [showAllInventory, setShowAllInventory] = useState(false);
  const displayedInventory = showAllInventory ? reporteInventario : reporteInventario.slice(0, 10);

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
        <Button icon={<FileSpreadsheet size={16} />} onClick={handleExportSinDocs} variant="outline">
          Exportar equipos sin documentos
        </Button>
        <Button icon={<FileText size={16} />} onClick={handleExportHistorial} variant="outline">
          Exportar historial de asignaciones
        </Button>
      </div>

      {/* ─── REPORTE: INVENTARIO COMPLETO ─────────────────────────────────── */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-semibold text-slate-700">Inventario completo</h2>
          <Badge variant="blue">{reporteInventario.length} equipos</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Placa</Th>
                <Th>Serial</Th>
                <Th>Tipo</Th>
                <Th>Marca/Modelo</Th>
                <Th>SO</Th>
                <Th>Sede</Th>
                <Th>Criticidad</Th>
                <Th>Estado</Th>
                <Th>Responsable</Th>
                <Th>Tipo responsable</Th>
                <Th>Área</Th>
              </tr>
            </thead>
            <tbody>
              {displayedInventory.map((eq, idx) => {
                const item = eq as InventarioItem;
                return (
                  <tr key={idx}>
                    <Td className="font-mono font-medium">{item.placa}</Td>
                    <Td>{item.serial}</Td>
                    <Td>{item.tipo}</Td>
                    <Td>{item.marca} {item.modelo}</Td>
                    <Td>{item.so}</Td>
                    <Td>{item.sede || '—'}</Td>

                    <Td><Badge variant={item.criticidad === 'Crítica' ? 'red' : 'gray'}>{item.criticidad}</Badge></Td>
                    <Td><Badge variant={item.estado === 'Asignado' ? 'green' : 'blue'}>{item.estado}</Badge></Td>
                    <Td>{item.responsable}</Td>
                    <Td>
                      <Badge variant={
                        eq.tipo_responsable === 'Empleado' ? 'blue' :
                        eq.tipo_responsable === 'Cliente' ? 'green' : 'orange'
                      }>
                        {eq.tipo_responsable}
                      </Badge>
                    </Td>
                    <Td>{item.area}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        {reporteInventario.length > 10 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t flex justify-between items-center">
            <span>Mostrando {showAllInventory ? reporteInventario.length : 10} de {reporteInventario.length} registros</span>
            <Button variant="outline" size="sm" onClick={() => setShowAllInventory(!showAllInventory)}>
              {showAllInventory ? 'Mostrar menos' : 'Ver todos'}
            </Button>
          </div>
        )}
      </Card>

      {/* ─── REPORTE: EQUIPOS SIN DOCUMENTOS ──────────────────────────────── */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700">Equipos sin acta o sin hoja de vida</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Placa</Th><Th>Tipo</Th><Th>Estado</Th><Th>Sin acta</Th><Th>Sin hoja de vida</Th>
            </tr>
          </thead>
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

      {/* ─── REPORTE: HISTORIAL DE ASIGNACIONES ───────────────────────────── */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700">Historial de asignaciones</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Equipo</Th><Th>Tipo</Th><Th>Usuario</Th><Th>Área</Th>
              <Th>Fecha asignación</Th><Th>Fecha devolución</Th><Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {reporteHistorial.slice(0, 20).map((h, idx) => (
              <tr key={idx}>
                <Td>{h.equipo_placa}</Td>
                <Td>{h.equipo_tipo}</Td>
                <Td>{h.usuario}</Td>
                <Td>{h.area}</Td>
                <Td>{h.fecha_asignacion}</Td>
                <Td>{h.fecha_devolucion}</Td>
                <Td><Badge variant={h.estado === 'Activa' ? 'green' : 'gray'}>{h.estado}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {reporteHistorial.length > 20 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t">
            Mostrando 20 de {reporteHistorial.length} registros
          </div>
        )}
      </Card>
    </div>
  );
}