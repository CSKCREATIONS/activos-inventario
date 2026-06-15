// VIEW: Página Usuarios
import { useState, useMemo } from 'react';
import { useUsuariosController } from '../../../controllers/useUsuariosController';
import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, Pencil, Eye, Users, AlertCircle } from 'lucide-react';
import type { Usuario } from '../../../models/types/index';
import { UsuarioDetalle } from './UsuarioDetalle';

// Áreas fijas (reales)
const AREAS_USUARIOS = [
  'HSEQ', 'TALENTO HUMANO', 'TECNOLOGIA', 'FACTURACION', 'SERVICIO AL CLIENTE',
  'RNDC', 'COMERCIAL', 'GERENCIA', 'ALMACENAMIENTO', 'FLOTA', 'SUMINISTROS',
  'CUMPLIDOS', 'RECEPCION', 'TRAFICO', 'REGISTRO', 'OPERACIONES', 'CONTABILIDAD',
  'TESORERIA', 'FISCAL'
];

const SEDES = ['Bogota', 'Yumbo', 'Sabaneta', 'La Estrella', 'Cartagena', 'Barranquilla', 'inHouse'];

export function UsuariosPage() {
  const ctrl = useUsuariosController();
  const [vistaDetalle, setVistaDetalle] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Usuario>>({
    activo: true,
    area: '__SIN_AREA__',        // valor especial para "Sin área"
    tipo_usuario: 'empleado'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filtroTipoUsuario, setFiltroTipoUsuario] = useState('');

  // Filtros combinados
  const usuariosFiltrados = useMemo(() => {
    let filtered = ctrl.usuarios;

    if (ctrl.busqueda) {
      const q = ctrl.busqueda.toLowerCase();
      filtered = filtered.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        (u.correo && u.correo.toLowerCase().includes(q)) ||
        (u.area && u.area.toLowerCase().includes(q))
      );
    }

    if (ctrl.filtroArea) {
      filtered = filtered.filter(u => u.area === ctrl.filtroArea);
    }

    if (ctrl.filtroSede) {
      filtered = filtered.filter(u => u.sede === ctrl.filtroSede);
    }

    if (filtroTipoUsuario) {
      filtered = filtered.filter(u => u.tipo_usuario === filtroTipoUsuario);
    }

    return filtered;
  }, [ctrl.usuarios, ctrl.busqueda, ctrl.filtroArea, ctrl.filtroSede, filtroTipoUsuario]);

  const canSave = !!form.nombre; // Solo el nombre es obligatorio; área siempre tiene valor

  const handleGuardar = () => {
    const newErrors: Record<string, string> = {};
    if (!form.nombre) newErrors.nombre = "El nombre es requerido";
    // No validamos área porque siempre tendrá un valor (__SIN_AREA__ o un área real)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // Convertir __SIN_AREA__ a null para la base de datos
    const areaParaBackend = form.area === '__SIN_AREA__' ? null : form.area;
    const payload = {
      ...form,
      area: areaParaBackend,
      correo: form.correo?.trim() || '',
      tipo_usuario: form.tipo_usuario || 'empleado',
    };
    if (ctrl.modoEdicion && ctrl.selectedUsuario) {
      ctrl.editarUsuario(ctrl.selectedUsuario.id, payload);
    } else {
      ctrl.crearUsuario(payload as Omit<Usuario, 'id' | 'fecha_registro'>);
    }
  };

  if (vistaDetalle) {
    return <UsuarioDetalle usuarioId={vistaDetalle} onVolver={() => setVistaDetalle(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
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
        <select
          value={ctrl.filtroSede}
          onChange={(e) => ctrl.setFiltroSede(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las sedes</option>
          {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filtroTipoUsuario}
          onChange={(e) => setFiltroTipoUsuario(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="empleado">Empleado</option>
          <option value="cliente">Cliente</option>
          <option value="proyecto">Proyecto</option>
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={() => { setForm({ activo: true, area: '__SIN_AREA__', tipo_usuario: 'empleado' }); setErrors({}); ctrl.abrirCrear(); }} className="w-full sm:w-auto">
            Nuevo usuario
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Mostrando <strong>{usuariosFiltrados.length}</strong> de <strong>{ctrl.totalUsuarios}</strong> usuarios
      </p>

      {/* Tabla de usuarios */}
      <Card>
        {usuariosFiltrados.length === 0 ? (
          <EmptyState mensaje="No se encontraron usuarios." icon={<Users size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Cargo</Th>
                <Th>Área</Th>
                <Th>Sede</Th>
                <Th>Proceso</Th>
                <Th>Correo</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {u.nombre.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{u.nombre}</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={
                      u.tipo_usuario === 'empleado' ? 'blue' :
                      u.tipo_usuario === 'cliente' ? 'green' : 'orange'
                    }>
                      {u.tipo_usuario === 'empleado' ? 'Empleado' :
                       u.tipo_usuario === 'cliente' ? 'Cliente' : 'Proyecto'}
                    </Badge>
                  </Td>
                  <Td>{u.cargo}</Td>
                  <Td><Badge variant="indigo">{u.area || '—'}</Badge></Td>
                  <Td>{u.sede || '-'}</Td>
                  <Td>{u.proceso}</Td>
                  <Td className="text-blue-600">{u.correo || '-'}</Td>
                  <Td>
                    <Badge variant={u.activo ? 'green' : 'gray'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setVistaDetalle(u.id)}>Ver</Button>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => { setForm({ ...u, area: u.area || '__SIN_AREA__', tipo_usuario: u.tipo_usuario || 'empleado' }); setErrors({}); ctrl.abrirEditar(u); }}>Editar</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal de creación/edición */}
      <Modal
        abierto={ctrl.modalAbierto}
        onCerrar={() => { ctrl.cerrarModal(); setErrors({}); }}
        titulo={ctrl.modoEdicion ? `Editar usuario – ${ctrl.selectedUsuario?.nombre}` : 'Registrar nuevo usuario'}
        size="lg"
      >
        {ctrl.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <span className="text-red-700 text-sm">{ctrl.error}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nombre completo *" value={form.nombre ?? ''} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={errors.nombre ? "border-red-500" : ""} />
            {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
          </div>
          <Field label="Cargo" value={form.cargo ?? ''} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />

          {/* Área con opción "Sin área" (valor especial '__SIN_AREA__') */}
          <SelectField
            label="Área *"
            value={form.area ?? '__SIN_AREA__'}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            options={[
              { value: '__SIN_AREA__', label: 'Sin área' },
              ...AREAS_USUARIOS.map(a => ({ value: a, label: a }))
            ]}
          />

          {/* Tipo de usuario */}
          <SelectField
            label="Tipo de usuario"
            value={form.tipo_usuario ?? 'empleado'}
            onChange={(e) => setForm((f) => ({ ...f, tipo_usuario: e.target.value as 'empleado' | 'cliente' | 'proyecto' }))}
            options={[
              { value: 'empleado', label: 'Empleado' },
              { value: 'cliente', label: 'Cliente' },
              { value: 'proyecto', label: 'Proyecto' }
            ]}
          />

          <SelectField
            label="Sede"
            value={form.sede ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, sede: e.target.value }))}
            options={[{ value: '', label: 'Seleccione una sede' }, ...SEDES.map((s) => ({ value: s, label: s }))]}
          />
          <Field label="Proceso" value={form.proceso ?? ''} onChange={(e) => setForm((f) => ({ ...f, proceso: e.target.value }))} />
          <Field label="Grupo asignado" value={form.grupo_asignado ?? ''} onChange={(e) => setForm((f) => ({ ...f, grupo_asignado: e.target.value }))} />
          <Field label="Correo" type="email" value={form.correo ?? ''} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} />
          <Field label="Ubicación" value={form.ubicacion ?? ''} onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="uactivo" checked={form.activo ?? true} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} className="rounded" />
            <label htmlFor="uactivo" className="text-sm font-medium text-slate-700">Usuario activo</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => { ctrl.cerrarModal(); setErrors({}); }}>Cancelar</Button>
          <Button disabled={!canSave || ctrl.loading} onClick={handleGuardar}>{ctrl.modoEdicion ? 'Guardar cambios' : 'Registrar usuario'}</Button>
        </div>
      </Modal>
    </div>
  );
}