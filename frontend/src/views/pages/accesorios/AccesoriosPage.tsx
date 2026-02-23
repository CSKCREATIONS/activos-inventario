// VIEW: Página Accesorios
import { useState } from 'react';
import { useAccesoriosController } from '../../../controllers/useAccesoriosController';
import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, Package } from 'lucide-react';
import type { Accesorio } from '../../../models/types/index';

export function AccesoriosPage() {
  const ctrl = useAccesoriosController();
  const [form, setForm] = useState<Partial<Accesorio>>({ cantidad: 1, estado: 'Disponible' });
  const [modoEdicion, setModoEdicion] = useState(false);

  const handleGuardar = () => {
    if (!form.nombre) return;
    if (modoEdicion && ctrl.selected) {
      ctrl.editar(ctrl.selected.id, form);
    } else {
      ctrl.crear(form as Omit<Accesorio, 'id' | 'fecha_registro'>);
    }
    setModoEdicion(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={ctrl.busqueda} onChange={ctrl.setBusqueda} placeholder="Buscar accesorios..." />
        <select
          value={ctrl.filtroEstado}
          onChange={(e) => ctrl.setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option>Disponible</option><option>Asignado</option><option>Dañado</option><option>Baja</option>
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={() => { setForm({ cantidad: 1, estado: 'Disponible' }); setModoEdicion(false); ctrl.setModalAbierto(true); }} className="w-full sm:w-auto">
            Nuevo accesorio
          </Button>
        </div>
      </div>

      <Card>
        {ctrl.accesorios.length === 0 ? (
          <EmptyState mensaje="No se encontraron accesorios." icon={<Package size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Placa</Th>
                <Th>Equipo principal</Th>
                <Th>Cantidad</Th>
                <Th>Estado</Th>
                <Th>Observaciones</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {ctrl.accesorios.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <Td className="font-medium">{a.nombre}</Td>
                  <Td>{a.placa ? <span className="font-mono text-blue-700">{a.placa}</span> : '—'}</Td>
                  <Td>{a.equipo_principal ? <span className="font-mono text-slate-600">{a.equipo_principal.placa}</span> : '—'}</Td>
                  <Td>{a.cantidad}</Td>
                  <Td>
                    <Badge variant={a.estado === 'Disponible' ? 'green' : a.estado === 'Asignado' ? 'blue' : a.estado === 'Dañado' ? 'red' : 'gray'}>
                      {a.estado}
                    </Badge>
                  </Td>
                  <Td className="text-slate-500 max-w-xs truncate">{a.observaciones ?? '—'}</Td>
                  <Td>
                    <Button variant="ghost" size="sm" onClick={() => { setForm(a); setModoEdicion(true); ctrl.setSelected(a); ctrl.setModalAbierto(true); }}>Editar</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal abierto={ctrl.modalAbierto} onCerrar={() => ctrl.setModalAbierto(false)} titulo={modoEdicion ? 'Editar accesorio' : 'Nuevo accesorio'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre *" value={form.nombre ?? ''} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="sm:col-span-2" />
          <Field label="Placa" value={form.placa ?? ''} onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value }))} />
          <Field label="Serial" value={form.serial ?? ''} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} />
          <SelectField label="Equipo principal" value={form.equipo_principal_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, equipo_principal_id: e.target.value || undefined }))}
            options={ctrl.equipos.map((e) => ({ value: e.id, label: `${e.placa} – ${e.tipo_equipo}` }))} />
          <Field label="Cantidad" type="number" value={form.cantidad?.toString() ?? '1'} onChange={(e) => setForm((f) => ({ ...f, cantidad: Number(e.target.value) }))} />
          <SelectField label="Estado" value={form.estado ?? 'Disponible'} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as Accesorio['estado'] }))}
            options={['Disponible','Asignado','Dañado','Baja'].map((s) => ({ value: s, label: s }))} className="sm:col-span-2" />
          <Field label="Observaciones" value={form.observaciones ?? ''} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => ctrl.setModalAbierto(false)}>Cancelar</Button>
          <Button onClick={handleGuardar}>{modoEdicion ? 'Guardar' : 'Registrar'}</Button>
        </div>
      </Modal>
    </div>
  );
}
