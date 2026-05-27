// VIEW: Página Asignaciones
import { useState } from 'react';
import { useAsignacionesController } from '../../../controllers/useAsignacionesController';

import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, RotateCcw, Link2, FileDown, Eye, X, Edit2 } from 'lucide-react';

const ASIGNACION_VARIANT = {
  Activa: 'green',
  Devuelta: 'blue',
  Extraviada: 'red',
} as const;

export function AsignacionesPage() {
  const ctrl = useAsignacionesController();
  const formatDate = (v?: string | null) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return v;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return v;
    }
  };
  const [form, setForm] = useState({
    usuario_id: '',
    equipo_id: '',
    fecha_asignacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    accesorios_entregados: [] as { id: string; nombre: string; placa?: string; tipo_equipo?: string }[],
  });
  const [error, setError] = useState('');
  
  // Estados para edición
  const [modalEditAbierto, setModalEditAbierto] = useState(false);
  const [editForm, setEditForm] = useState({
    usuarios_ids: [] as string[],
    accesorios_entregados: [] as { id: string; nombre: string; placa?: string; tipo_equipo?: string }[],
    observaciones: '',
  });

  const toggleAccesorio = (accesorio: { id: string; nombre: string; placa?: string; tipo_equipo?: string }) => {
    setForm((f) => {
      const existe = f.accesorios_entregados.some((a) => a.id === accesorio.id);
      return {
        ...f,
        accesorios_entregados: existe
          ? f.accesorios_entregados.filter((a) => a.id !== accesorio.id)
          : [...f.accesorios_entregados, accesorio],
      };
    });
  };

  const handleCrear = async () => {
    if (!form.usuario_id || !form.equipo_id) { setError('Usuario y equipo son requeridos.'); return; }

    const resultado = await ctrl.crearAsignacion({
      usuario_id: form.usuario_id,
      equipo_id: form.equipo_id,
      fecha_asignacion: form.fecha_asignacion,
      observaciones: form.observaciones,
      accesorios_entregados: form.accesorios_entregados,
    });
    if (resultado.error) { setError(resultado.error); return; }
    setError('');
  };

  const abrirModalEditar = (asignacion: any) => {
    setEditForm({
      usuarios_ids: asignacion.usuarios_ids || [asignacion.usuario_id],
      accesorios_entregados: Array.isArray(asignacion.accesorios_entregados)
        ? asignacion.accesorios_entregados.map((a: any) => ({
            id: a.id || a,
            nombre: typeof a === 'string' ? a : (a.nombre || a.tipo_equipo || a),
            placa: a.placa,
            tipo_equipo: a.tipo_equipo,
          }))
        : [],
      observaciones: asignacion.observaciones || '',
    });
    ctrl.setSelectedAsignacion(asignacion);
    setModalEditAbierto(true);
  };

  const toggleUsuarioEditar = (usuarioId: string) => {
    setEditForm((f) => {
      const existe = f.usuarios_ids.includes(usuarioId);
      return {
        ...f,
        usuarios_ids: existe
          ? f.usuarios_ids.filter((id) => id !== usuarioId)
          : [...f.usuarios_ids, usuarioId],
      };
    });
  };

  const toggleAccesorioEditar = (accesorio: { id: string; nombre: string; placa?: string; tipo_equipo?: string }) => {
    setEditForm((f) => {
      const existe = f.accesorios_entregados.some((a) => a.id === accesorio.id);
      return {
        ...f,
        accesorios_entregados: existe
          ? f.accesorios_entregados.filter((a) => a.id !== accesorio.id)
          : [...f.accesorios_entregados, accesorio],
      };
    });
  };

  const handleGuardarEdicion = async () => {
    if (!ctrl.selectedAsignacion) return;
    
    const resultado = await ctrl.editarAsignacion(ctrl.selectedAsignacion.id, {
      usuarios_ids: editForm.usuarios_ids,
      accesorios_entregados: editForm.accesorios_entregados,
      observaciones: editForm.observaciones,
    });
    
    if (!resultado?.error) {
      setModalEditAbierto(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{ctrl.asignacionesActivas}</p>
          <p className="text-xs text-slate-500 mt-1">Asignaciones activas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{ctrl.totalAsignaciones}</p>
          <p className="text-xs text-slate-500 mt-1">Total historial</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{ctrl.equiposDisponibles.length}</p>
          <p className="text-xs text-slate-500 mt-1">Equipos disponibles</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={ctrl.busqueda} onChange={ctrl.setBusqueda} placeholder="Buscar por usuario o placa..." />
        <select
          value={ctrl.filtroEstado}
          onChange={(e) => ctrl.setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="Activa">Activa</option>
          <option value="Devuelta">Devuelta</option>
          <option value="Extraviada">Extraviada</option>
        </select>
        <div className="sm:ml-auto">
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setForm({
                usuario_id: '',
                equipo_id: '',
                fecha_asignacion: new Date().toISOString().split('T')[0],
                observaciones: '',
                accesorios_entregados: [],
              });
              setError('');
              ctrl.setModalAbierto(true);
            }}
            className="w-full sm:w-auto"
          >
            Nueva asignación
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        {ctrl.asignaciones.length === 0 ? (
          <EmptyState mensaje="No se encontraron asignaciones." icon={<Link2 size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Área</Th>
                <Th>Equipo</Th>
                <Th>Tipo</Th>
                <Th>Fecha asignación</Th>
                <Th>Fecha devolución</Th>
                <Th>Estado</Th>
                <Th>Documentos</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {ctrl.asignaciones.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <Td className="font-medium">
                    <div>{a.usuario?.nombre ?? '—'}</div>
                    <div className="text-xs text-slate-500">{a.usuario?.cargo ?? ''}</div>
                  </Td>
                    <Td>{a.usuario?.area ?? '—'}</Td>
                    <Td className="font-mono text-blue-700">
                      <div>{a.equipo?.placa ?? '—'}</div>
                      <div className="text-xs text-slate-500">{[a.equipo?.marca, a.equipo?.modelo].filter(Boolean).join(' ')}</div>
                    </Td>
                    <Td>{a.equipo?.tipo_equipo ?? '—'}</Td>
                    <Td>{formatDate(a.fecha_asignacion)}</Td>
                    <Td>{a.fecha_devolucion ? formatDate(a.fecha_devolucion) : <span className="text-emerald-600 font-medium">Activa</span>}</Td>
                  <Td>
                    <Badge variant={ASIGNACION_VARIANT[a.estado] ?? 'gray'}>
                      {a.estado}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye size={12} />}
                        onClick={() => ctrl.previsualizarActa(a.id)}
                      >
                        Previsualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<FileDown size={12} />}
                        onClick={() => ctrl.descargarActa(a.id)}
                      >
                        Acta
                      </Button>
                      {a.equipo_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<FileDown size={12} />}
                          onClick={() => ctrl.descargarHojaVida(a.equipo_id, a.equipo?.placa)}
                        >
                          H.Vida
                        </Button>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {a.estado === 'Activa' && a.equipo_id && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Edit2 size={12} />}
                          onClick={() => abrirModalEditar(a)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<RotateCcw size={12} />}
                          onClick={() => ctrl.registrarDevolucion(a.id)}
                        >
                          Devolver
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal nueva asignación */}
      <Modal abierto={ctrl.modalAbierto} onCerrar={() => ctrl.setModalAbierto(false)} titulo="Nueva asignación" size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <SelectField
            label="Usuario *"
            value={form.usuario_id}
            onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
            options={ctrl.usuarios.map((u) => ({ value: u.id, label: `${u.nombre} – ${u.area}` }))}
          />
          <SelectField
            label="Equipo disponible *"
            value={form.equipo_id}
            onChange={(e) => setForm((f) => ({ ...f, equipo_id: e.target.value }))}
            options={ctrl.equiposDisponibles.map((e) => ({ value: e.id, label: `${e.placa} – ${e.tipo_equipo} ${e.marca ?? ''}` }))}
          />
          <Field
            label="Fecha de asignación *"
            type="date"
            value={form.fecha_asignacion}
            onChange={(e) => setForm((f) => ({ ...f, fecha_asignacion: e.target.value }))}
          />
          <Field
            label="Observaciones"
            value={form.observaciones}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
          />

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Accesorios/Equipos adicionales</p>
            
            {Object.keys(ctrl.accesoriosDisponiblesAgrupados).length === 0 ? (
              <p className="text-sm text-slate-500 italic">No hay accesorios disponibles para asignar</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {Object.entries(ctrl.accesoriosDisponiblesAgrupados).map(([tipo, accesorios]) => (
                  <div key={tipo} className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{tipo}</h4>
                    <div className="space-y-2 pl-2">
                      {accesorios.map((acc) => (
                        <label
                          key={acc.id}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={form.accesorios_entregados.some((a) => a.id === acc.id)}
                            onChange={() => toggleAccesorio({
                              id: acc.id,
                              nombre: acc.tipo_equipo || 'Accesorio',
                              placa: acc.placa,
                              tipo_equipo: acc.tipo_equipo,
                            })}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700">{acc.marca} {acc.modelo}</div>
                            {acc.placa && <div className="text-xs text-slate-500">Placa: {acc.placa}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumen de seleccionados */}
            {form.accesorios_entregados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {form.accesorios_entregados.map((acc) => (
                    <div
                      key={acc.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      <span>{acc.nombre} {acc.placa && `(${acc.placa})`}</span>
                      <button
                        type="button"
                        onClick={() => toggleAccesorio(acc)}
                        className="hover:text-blue-900"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => ctrl.setModalAbierto(false)}>Cancelar</Button>
          <Button onClick={handleCrear}>
            Registrar asignación {form.accesorios_entregados.length > 0 && `(+${form.accesorios_entregados.length})`}
          </Button>
        </div>
      </Modal>

      {/* Modal editar asignación */}
      <Modal abierto={modalEditAbierto} onCerrar={() => setModalEditAbierto(false)} titulo="Editar asignación" size="md">
        <div className="space-y-4">
          {/* Usuarios adicionales */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Usuarios asignados</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {ctrl.usuarios.map((usuario) => (
                <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={editForm.usuarios_ids.includes(usuario.id)}
                    onChange={() => toggleUsuarioEditar(usuario.id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">{usuario.nombre}</div>
                    <div className="text-xs text-slate-500">{usuario.cargo} – {usuario.area}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Accesorios */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Accesorios/Equipos adicionales</p>
            {Object.keys(ctrl.accesoriosDisponiblesAgrupados).length === 0 ? (
              <p className="text-sm text-slate-500 italic">No hay accesorios disponibles</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {Object.entries(ctrl.accesoriosDisponiblesAgrupados).map(([tipo, accesorios]) => (
                  <div key={tipo} className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{tipo}</h4>
                    <div className="space-y-2 pl-2">
                      {accesorios.map((acc) => (
                        <label
                          key={acc.id}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={editForm.accesorios_entregados.some((a) => a.id === acc.id)}
                            onChange={() => toggleAccesorioEditar({
                              id: acc.id,
                              nombre: acc.tipo_equipo || 'Accesorio',
                              placa: acc.placa,
                              tipo_equipo: acc.tipo_equipo,
                            })}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700">{acc.marca} {acc.modelo}</div>
                            {acc.placa && <div className="text-xs text-slate-500">Placa: {acc.placa}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editForm.accesorios_entregados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {editForm.accesorios_entregados.map((acc) => (
                    <div
                      key={acc.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      <span>{acc.nombre} {acc.placa && `(${acc.placa})`}</span>
                      <button
                        type="button"
                        onClick={() => toggleAccesorioEditar(acc)}
                        className="hover:text-blue-900"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <Field
            label="Observaciones"
            value={editForm.observaciones}
            onChange={(e) => setEditForm((f) => ({ ...f, observaciones: e.target.value }))}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => setModalEditAbierto(false)}>Cancelar</Button>
          <Button onClick={handleGuardarEdicion} loading={ctrl.loading}>Guardar cambios</Button>
        </div>
      </Modal>
    </div>
  );
}
