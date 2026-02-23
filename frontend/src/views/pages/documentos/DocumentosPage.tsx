// VIEW: Página Documentos
import { useState } from 'react';
import { useDocumentosController } from '../../../controllers/useDocumentosController';
import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, FileText, Download } from 'lucide-react';
import type { TipoDocumento } from '../../../models/types/index';

const TIPOS: TipoDocumento[] = ['Acta','Hoja de vida','Factura','Garantía','Contrato','Manual','Otro'];

export function DocumentosPage() {
  const ctrl = useDocumentosController();
  const [form, setForm] = useState<{ nombre: string; tipo: TipoDocumento | ''; equipo_id: string; usuario_id: string; url: string; cargado_por: string }>({
    nombre: '', tipo: '', equipo_id: '', usuario_id: '', url: '', cargado_por: 'Admin',
  });

  const handleSubir = () => {
    if (!form.nombre || !form.tipo) return;
    ctrl.subir({ nombre: form.nombre, tipo: form.tipo as TipoDocumento, equipo_id: form.equipo_id || undefined, usuario_id: form.usuario_id || undefined, url: form.url || '#', cargado_por: form.cargado_por });
  };

  const tipoVariant: Record<TipoDocumento, 'blue' | 'green' | 'orange' | 'purple' | 'indigo' | 'gray' | 'yellow'> = {
    Acta: 'blue', 'Hoja de vida': 'green', Factura: 'orange', Garantía: 'purple', Contrato: 'indigo', Manual: 'yellow', Otro: 'gray',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={ctrl.busqueda} onChange={ctrl.setBusqueda} placeholder="Buscar documentos..." />
        <select value={ctrl.filtroTipo} onChange={(e) => ctrl.setFiltroTipo(e.target.value as TipoDocumento | '')}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={() => { setForm({ nombre: '', tipo: '', equipo_id: '', usuario_id: '', url: '', cargado_por: 'Admin' }); ctrl.setModalAbierto(true); }} className="w-full sm:w-auto">
            Subir documento
          </Button>
        </div>
      </div>

      <Card>
        {ctrl.documentos.length === 0 ? (
          <EmptyState mensaje="No se encontraron documentos." icon={<FileText size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Equipo</Th>
                <Th>Usuario</Th>
                <Th>Versión</Th>
                <Th>Fecha carga</Th>
                <Th>Cargado por</Th>
                <Th>Acción</Th>
              </tr>
            </thead>
            <tbody>
              {ctrl.documentos.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <Td className="font-medium">{d.nombre}</Td>
                  <Td><Badge variant={tipoVariant[d.tipo]}>{d.tipo}</Badge></Td>
                  <Td>{d.equipo ? <span className="font-mono text-blue-700">{d.equipo.placa}</span> : '—'}</Td>
                  <Td>{d.usuario?.nombre ?? '—'}</Td>
                  <Td><Badge variant="gray">v{d.version}</Badge></Td>
                  <Td>{d.fecha_carga}</Td>
                  <Td>{d.cargado_por ?? '—'}</Td>
                  <Td>
                    <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => window.open(d.url, '_blank')}>
                      Descargar
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal abierto={ctrl.modalAbierto} onCerrar={() => ctrl.setModalAbierto(false)} titulo="Subir documento" size="md">
        <div className="space-y-4">
          <Field label="Nombre del documento *" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          <SelectField label="Tipo *" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoDocumento }))} options={TIPOS.map((t) => ({ value: t, label: t }))} />
          <SelectField label="Equipo relacionado" value={form.equipo_id} onChange={(e) => setForm((f) => ({ ...f, equipo_id: e.target.value }))}
            options={ctrl.equipos.map((e) => ({ value: e.id, label: `${e.placa} – ${e.tipo_equipo}` }))} />
          <SelectField label="Usuario relacionado" value={form.usuario_id} onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
            options={ctrl.usuarios.map((u) => ({ value: u.id, label: u.nombre }))} />
          <Field label="URL / Ruta del archivo" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="/docs/archivo.pdf" />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => ctrl.setModalAbierto(false)}>Cancelar</Button>
          <Button onClick={handleSubir}>Subir documento</Button>
        </div>
      </Modal>
    </div>
  );
}
