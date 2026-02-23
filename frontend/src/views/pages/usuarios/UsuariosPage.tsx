// VIEW: Página Usuarios
import { useState } from 'react';
import { useUsuariosController } from '../../../controllers/useUsuariosController';
import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, Badge
} from '../../components/ui/index';
import { Plus, Pencil, Eye, Users } from 'lucide-react';
import type { Usuario } from '../../../models/types/index';
import { UsuarioDetalle } from './UsuarioDetalle';

export function UsuariosPage() {
  const ctrl = useUsuariosController();
  const [vistaDetalle, setVistaDetalle] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Usuario>>({ activo: true });

  const handleGuardar = () => {
    if (!form.nombre || !form.area || !form.correo) return;
    if (ctrl.modoEdicion && ctrl.selectedUsuario) {
      ctrl.editarUsuario(ctrl.selectedUsuario.id, form);
    } else {
      ctrl.crearUsuario(form as Omit<Usuario, 'id' | 'fecha_registro'>);
    }
  };

  if (vistaDetalle) {
    return <UsuarioDetalle usuarioId={vistaDetalle} onVolver={() => setVistaDetalle(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={ctrl.busqueda} onChange={ctrl.setBusqueda} placeholder="Buscar por nombre, correo, área..." />
        <select
          value={ctrl.filtroArea}
          onChange={(e) => ctrl.setFiltroArea(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las áreas</option>
          {ctrl.areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={() => { setForm({ activo: true }); ctrl.abrirCrear(); }} className="w-full sm:w-auto">
            Nuevo usuario
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Mostrando <strong>{ctrl.usuarios.length}</strong> de <strong>{ctrl.totalUsuarios}</strong> usuarios
      </p>

      <Card>
        {ctrl.usuarios.length === 0 ? (
          <EmptyState mensaje="No se encontraron usuarios." icon={<Users size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Cargo</Th>
                <Th>Área</Th>
                <Th>Proceso</Th>
                <Th>Correo</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {ctrl.usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {u.nombre.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{u.nombre}</span>
                    </div>
                  </Td>
                  <Td>{u.cargo}</Td>
                  <Td><Badge variant="indigo">{u.area}</Badge></Td>
                  <Td>{u.proceso}</Td>
                  <Td className="text-blue-600">{u.correo}</Td>
                  <Td>
                    <Badge variant={u.activo ? 'green' : 'gray'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setVistaDetalle(u.id)}>Ver</Button>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => { setForm(u); ctrl.abrirEditar(u); }}>Editar</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        abierto={ctrl.modalAbierto}
        onCerrar={ctrl.cerrarModal}
        titulo={ctrl.modoEdicion ? `Editar usuario – ${ctrl.selectedUsuario?.nombre}` : 'Registrar nuevo usuario'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo *" value={form.nombre ?? ''} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="sm:col-span-2" />
          <Field label="Cargo" value={form.cargo ?? ''} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
          <Field label="Área *" value={form.area ?? ''} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
          <Field label="Proceso" value={form.proceso ?? ''} onChange={(e) => setForm((f) => ({ ...f, proceso: e.target.value }))} />
          <Field label="Grupo asignado" value={form.grupo_asignado ?? ''} onChange={(e) => setForm((f) => ({ ...f, grupo_asignado: e.target.value }))} />
          <Field label="Correo *" type="email" value={form.correo ?? ''} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} />
          <Field label="Ubicación" value={form.ubicacion ?? ''} onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="uactivo" checked={form.activo ?? true} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} className="rounded" />
            <label htmlFor="uactivo" className="text-sm font-medium text-slate-700">Usuario activo</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={ctrl.cerrarModal}>Cancelar</Button>
          <Button onClick={handleGuardar}>{ctrl.modoEdicion ? 'Guardar cambios' : 'Registrar usuario'}</Button>
        </div>
      </Modal>
    </div>
  );
}
