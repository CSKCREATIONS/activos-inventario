// VIEW: Página Activos (lista de equipos con filtros y CRUD)
// Consume useActivosController — solo renderiza, nada de lógica.

import { useState } from 'react';
import { useActivosController } from '../../../controllers/useActivosController';
import {
  Button, SearchInput, Table, Th, Td, EstadoBadge, CriticidadBadge,
  ConfidencialidadBadge, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, Pencil, Eye, Laptop } from 'lucide-react';
import type { Equipo, TipoEquipo, EstadoEquipo, Criticidad, Confidencialidad } from '../../../models/types/index';
import { ActivoDetalle } from './ActivoDetalle';

const TIPOS: TipoEquipo[] = ['Laptop','Desktop','Tablet','Impresora','Celular','Monitor','Servidor','Switch','Router','UPS','Otro'];
const ESTADOS: EstadoEquipo[] = ['Disponible','Asignado','Dañado','Baja','En revisión','Rentado'];
const CRITICIDADES: Criticidad[] = ['Baja','Media','Alta','Crítica'];
const CONF: Confidencialidad[] = ['Pública','Interna','Confidencial','Restringida'];

export function ActivosPage() {
  const ctrl = useActivosController();
  const [vistaDetalle, setVistaDetalle] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Equipo>>({});

  const handleAbrirCrear = () => { setForm({}); ctrl.abrirCrear(); };
  const handleAbrirEditar = (e: Equipo) => { setForm(e); ctrl.abrirEditar(e); };
  const handleGuardar = () => {
    if (!form.placa || !form.tipo_equipo || !form.criticidad || !form.confidencialidad || !form.estado) return;
    if (ctrl.modoEdicion && ctrl.selectedEquipo) {
      ctrl.editarEquipo(ctrl.selectedEquipo.id, form);
    } else {
      ctrl.crearEquipo(form as Omit<Equipo, 'id' | 'fecha_registro'>);
    }
  };

  if (vistaDetalle) {
    return <ActivoDetalle equipoId={vistaDetalle} onVolver={() => setVistaDetalle(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput
          value={ctrl.filtros.busqueda}
          onChange={(v) => ctrl.setFiltros((f) => ({ ...f, busqueda: v }))}
          placeholder="Buscar por placa, marca, modelo..."
        />
        <select
          value={ctrl.filtros.estado}
          onChange={(e) => ctrl.setFiltros((f) => ({ ...f, estado: e.target.value as EstadoEquipo | '' }))}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={ctrl.filtros.criticidad}
          onChange={(e) => ctrl.setFiltros((f) => ({ ...f, criticidad: e.target.value as Criticidad | '' }))}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toda criticidad</option>
          {CRITICIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={handleAbrirCrear} className="w-full sm:w-auto">Nuevo activo</Button>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-slate-500">
        Mostrando <strong>{ctrl.equipos.length}</strong> de <strong>{ctrl.totalEquipos}</strong> activos
      </p>

      {/* Tabla */}
      <Card>
        {ctrl.equipos.length === 0 ? (
          <EmptyState mensaje="No se encontraron activos con los filtros actuales." icon={<Laptop size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Placa</Th>
                <Th>Tipo</Th>
                <Th>Marca / Modelo</Th>
                <Th>SO</Th>
                <Th>Criticidad</Th>
                <Th>Confidencialidad</Th>
                <Th>Estado</Th>
                <Th>Rentado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {ctrl.equipos.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <Td><span className="font-mono font-medium text-blue-700">{e.placa}</span></Td>
                  <Td>{e.tipo_equipo}</Td>
                  <Td className="text-slate-600">{[e.marca, e.modelo].filter(Boolean).join(' ') || '—'}</Td>
                  <Td>{e.sistema_operativo ?? '—'}</Td>
                  <Td><CriticidadBadge criticidad={e.criticidad} /></Td>
                  <Td><ConfidencialidadBadge valor={e.confidencialidad} /></Td>
                  <Td><EstadoBadge estado={e.estado} /></Td>
                  <Td>{e.es_rentado ? <Badge variant="purple">Sí</Badge> : <span className="text-slate-400">—</span>}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setVistaDetalle(e.id)}>Ver</Button>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => handleAbrirEditar(e)}>Editar</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal Crear/Editar */}
      <Modal
        abierto={ctrl.modalAbierto}
        onCerrar={ctrl.cerrarModal}
        titulo={ctrl.modoEdicion ? `Editar activo – ${ctrl.selectedEquipo?.placa}` : 'Registrar nuevo activo'}
        size="xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Placa *" value={form.placa ?? ''} onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value }))} placeholder="EAC000000" />
          <Field label="Serial" value={form.serial ?? ''} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} />
          <SelectField label="Tipo de activo *" value={form.tipo_equipo ?? ''} onChange={(e) => setForm((f) => ({ ...f, tipo_equipo: e.target.value as TipoEquipo }))} options={TIPOS.map((t) => ({ value: t, label: t }))} />
          <Field label="Marca" value={form.marca ?? ''} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
          <Field label="Modelo" value={form.modelo ?? ''} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} />
          <Field label="Sistema operativo" value={form.sistema_operativo ?? ''} onChange={(e) => setForm((f) => ({ ...f, sistema_operativo: e.target.value }))} />
          <Field label="Versión SO" value={form.version_so ?? ''} onChange={(e) => setForm((f) => ({ ...f, version_so: e.target.value }))} />
          <Field label="RAM" value={form.ram ?? ''} onChange={(e) => setForm((f) => ({ ...f, ram: e.target.value }))} placeholder="8 GB" />
          <Field label="Disco" value={form.disco ?? ''} onChange={(e) => setForm((f) => ({ ...f, disco: e.target.value }))} placeholder="256 GB SSD" />
          <SelectField label="Criticidad *" value={form.criticidad ?? ''} onChange={(e) => setForm((f) => ({ ...f, criticidad: e.target.value as Criticidad }))} options={CRITICIDADES.map((c) => ({ value: c, label: c }))} />
          <SelectField label="Confidencialidad *" value={form.confidencialidad ?? ''} onChange={(e) => setForm((f) => ({ ...f, confidencialidad: e.target.value as Confidencialidad }))} options={CONF.map((c) => ({ value: c, label: c }))} />
          <SelectField label="Estado *" value={form.estado ?? ''} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoEquipo }))} options={ESTADOS.map((s) => ({ value: s, label: s }))} />
          <Field label="Proveedor" value={form.proveedor ?? ''} onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))} />
          <Field label="Fecha de compra" type="date" value={form.fecha_compra ?? ''} onChange={(e) => setForm((f) => ({ ...f, fecha_compra: e.target.value }))} />
          <Field label="Costo" type="number" value={form.costo?.toString() ?? ''} onChange={(e) => setForm((f) => ({ ...f, costo: Number(e.target.value) }))} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="rentado" checked={form.es_rentado ?? false} onChange={(e) => setForm((f) => ({ ...f, es_rentado: e.target.checked }))} className="rounded" />
            <label htmlFor="rentado" className="text-sm font-medium text-slate-700">Equipo rentado</label>
          </div>
          <Field label="Observaciones" value={form.observaciones ?? ''} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={ctrl.cerrarModal}>Cancelar</Button>
          <Button onClick={handleGuardar}>{ctrl.modoEdicion ? 'Guardar cambios' : 'Registrar activo'}</Button>
        </div>
      </Modal>
    </div>
  );
}
