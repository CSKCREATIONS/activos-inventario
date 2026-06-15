// VIEW: Página Suministros — CRUD + Kardex de movimientos (completo)
import { useState, useEffect, useCallback } from 'react';
import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, History, Package, AlertTriangle, Pencil, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { suministrosApi, usuariosApi, movimientosApi, solicitantesApi } from '../../../services/api';
import type { Usuario } from '../../../models/types/index';
import { useAuthStore } from '../../../models/stores/useAuthStore';

interface SuministroConStock {
  id: string;
  nombre: string;
  tipo: string;
  referencia?: string;
  marca?: string;
  modelo?: string;
  cantidad: number;
  cantidad_minima: number;
  estado: string;
  proveedor?: string;
  observaciones?: string;
  stock_actual?: number;
}

interface Movimiento {
  id: string;
  suministro_id: string;
  tipo_movimiento: 'entrada' | 'salida';
  cantidad: number;
  fecha: string;
  usuario_sistema_nombre?: string;
  solicitante_nombre?: string;
  area_solicitante?: string;
  motivo?: string;
  comprobante?: string;
  observaciones?: string;
  saldo_parcial?: number;
}

export function SuministrosPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.rol === 'admin';

  // Estados listado suministros
  const [items, setItems] = useState<SuministroConStock[]>([]);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [solicitantes, setSolicitantes] = useState<{ id: string; nombre: string }[]>([]);

  // Estados para Kardex
  const [kardexSuministro, setKardexSuministro] = useState<SuministroConStock | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showMovimientoForm, setShowMovimientoForm] = useState(false);
  const [movimientoLoading, setMovimientoLoading] = useState(false);
  const [movimientosTotal, setMovimientosTotal] = useState(0);
  const [movimientosPage, setMovimientosPage] = useState(0);
  const [movimientosLimit] = useState(20);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // Formulario de movimiento
  const [formMovimiento, setFormMovimiento] = useState({
    tipo: 'entrada' as 'entrada' | 'salida',
    cantidad: 1,
    solicitante_id: '',
    area: '',
    motivo: '',
    comprobante: '',
    observaciones: ''
  });

  // Editar movimiento
  const [editandoMovimiento, setEditandoMovimiento] = useState<Movimiento | null>(null);
  const [showEditMovimientoForm, setShowEditMovimientoForm] = useState(false);
  const [editForm, setEditForm] = useState({
    tipo: 'entrada' as 'entrada' | 'salida',
    cantidad: 1,
    solicitante_id: '',
    area: '',
    motivo: '',
    comprobante: '',
    observaciones: ''
  });

  // CRUD suministros
  const [showSuministroModal, setShowSuministroModal] = useState(false);
  const [editandoSuministro, setEditandoSuministro] = useState<SuministroConStock | null>(null);
  const [suministroForm, setSuministroForm] = useState({
    nombre: '',
    tipo: 'Toner' as 'Toner' | 'Licencia' | 'Cable' | 'Rollo' | 'Otro',
    referencia: '',
    marca: '',
    modelo: '',
    cantidad: 1,
    cantidad_minima: 1,
    estado: 'Disponible' as 'Disponible' | 'Agotado' | 'Reservado' | 'Baja',
    proveedor: '',
    observaciones: ''
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Carga inicial
  // ──────────────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suministrosApi.getAll({
        busqueda: busqueda || undefined,
        estado: filtroEstado || undefined,
      });
      setItems(res.data as SuministroConStock[]);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar suministros');
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroEstado]);

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await usuariosApi.getAll();
      setUsuarios(res.data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }, []);

  const fetchSolicitantes = useCallback(async () => {
    try {
      const res = await solicitantesApi.getAll();
      setSolicitantes(res.data);
    } catch (err) {
      console.error('Error cargando solicitantes:', err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchUsuarios();
    fetchSolicitantes();
  }, [fetchItems, fetchUsuarios, fetchSolicitantes]);

  // ──────────────────────────────────────────────────────────────────────────
  // Funciones de movimientos (Kardex)
  // ──────────────────────────────────────────────────────────────────────────
  const fetchMovimientos = async (suministroId: string, page: number = 0) => {
    setMovimientoLoading(true);
    try {
      const params: any = { limit: movimientosLimit, offset: page * movimientosLimit };
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      const res = await movimientosApi.getBySuministro(suministroId, params);
      setMovimientos(res.data);
      setMovimientosTotal(res.total);
      setMovimientosPage(page);
    } catch (err) {
      console.error(err);
      alert('No se pudieron cargar los movimientos');
    } finally {
      setMovimientoLoading(false);
    }
  };

  const verHistorial = async (suministro: SuministroConStock) => {
    setKardexSuministro(suministro);
    setMovimientosPage(0);
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    await fetchMovimientos(suministro.id, 0);
    setShowKardexModal(true);
  };

  const handleCrearMovimiento = async () => {
    if (formMovimiento.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (formMovimiento.tipo === 'salida' && kardexSuministro && formMovimiento.cantidad > (kardexSuministro.cantidad || 0)) {
      alert('No hay suficiente stock disponible');
      return;
    }
    try {
      await movimientosApi.create(kardexSuministro!.id, {
        tipo: formMovimiento.tipo,
        cantidad: formMovimiento.cantidad,
        motivo: formMovimiento.motivo,
        solicitante_id: formMovimiento.solicitante_id || null,
        area: formMovimiento.area || null,
        comprobante: formMovimiento.comprobante || null,
        observaciones: formMovimiento.observaciones || null
      });
      alert('Movimiento registrado correctamente');
      setShowMovimientoForm(false);
      setFormMovimiento({
        tipo: 'entrada',
        cantidad: 1,
        solicitante_id: '',
        area: '',
        motivo: '',
        comprobante: '',
        observaciones: ''
      });
      await fetchMovimientos(kardexSuministro!.id, movimientosPage);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar movimiento');
    }
  };

  const handleEditMovimiento = async () => {
    if (!editandoMovimiento) return;
    try {
      await movimientosApi.update(editandoMovimiento.id, {
        tipo: editForm.tipo,
        cantidad: editForm.cantidad,
        motivo: editForm.motivo,
        solicitante_id: editForm.solicitante_id || null,
        area_solicitante: editForm.area || null,
        comprobante: editForm.comprobante || null,
        observaciones: editForm.observaciones || null
      });
      alert('Movimiento actualizado');
      setShowEditMovimientoForm(false);
      await fetchMovimientos(kardexSuministro!.id, movimientosPage);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar movimiento');
    }
  };

  const handleDeleteMovimiento = async (movimiento: Movimiento) => {
    if (!confirm('¿Eliminar este movimiento? Se ajustará el stock automáticamente.')) return;
    try {
      await movimientosApi.remove(movimiento.id);
      alert('Movimiento eliminado');
      await fetchMovimientos(kardexSuministro!.id, movimientosPage);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar movimiento');
    }
  };

  const exportarMovimientos = async () => {
    if (!kardexSuministro) return;
    try {
      const params: any = {};
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      const blob = await movimientosApi.exportCsv(kardexSuministro.id, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimientos_${kardexSuministro.id}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CRUD suministros (crear, editar, eliminar)
  // ──────────────────────────────────────────────────────────────────────────
  const abrirCrearSuministro = () => {
    setEditandoSuministro(null);
    setSuministroForm({
      nombre: '',
      tipo: 'Toner',
      referencia: '',
      marca: '',
      modelo: '',
      cantidad: 1,
      cantidad_minima: 1,
      estado: 'Disponible',
      proveedor: '',
      observaciones: ''
    });
    setShowSuministroModal(true);
  };

  const abrirEditarSuministro = (suministro: SuministroConStock) => {
    setEditandoSuministro(suministro);
    setSuministroForm({
      nombre: suministro.nombre,
      tipo: suministro.tipo as any,
      referencia: suministro.referencia || '',
      marca: suministro.marca || '',
      modelo: suministro.modelo || '',
      cantidad: suministro.cantidad,
      cantidad_minima: suministro.cantidad_minima,
      estado: suministro.estado as any,
      proveedor: suministro.proveedor || '',
      observaciones: suministro.observaciones || ''
    });
    setShowSuministroModal(true);
  };

  const guardarSuministro = async () => {
    if (!suministroForm.nombre) {
      alert('El nombre es obligatorio');
      return;
    }
    try {
      const dataParaApi = { ...suministroForm, tipo: suministroForm.tipo as any };
      if (editandoSuministro) {
        await suministrosApi.update(editandoSuministro.id, dataParaApi);
        alert('Suministro actualizado correctamente');
      } else {
        await suministrosApi.create(dataParaApi);
        alert('Suministro creado correctamente');
      }
      setShowSuministroModal(false);
      fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar suministro');
    }
  };

  const eliminarSuministro = async (suministro: SuministroConStock) => {
    if (confirm(`¿Eliminar el suministro "${suministro.nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        await suministrosApi.remove(suministro.id);
        alert('Suministro eliminado');
        fetchItems();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar suministro');
      }
    }
  };

  const formatearFecha = (fecha: any): string => {
    if (!fecha) return '—';
    try {
      let date: Date;
      if (typeof fecha === 'string') {
        const timestamp = Date.parse(fecha);
        if (isNaN(timestamp)) return 'Fecha inválida';
        date = new Date(timestamp);
      } else if (fecha instanceof Date) {
        date = fecha;
      } else {
        return '—';
      }
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-CO');
    } catch {
      return '—';
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar suministros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar suministros..." />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
          <option value="">Todos los estados</option>
          <option value="Disponible">Disponible</option>
          <option value="Agotado">Agotado</option>
          <option value="Reservado">Reservado</option>
          <option value="Baja">Baja</option>
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={abrirCrearSuministro}>Nuevo suministro</Button>
        </div>
      </div>

      {/* Tabla de suministros */}
      <Card>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando...</div>
        ) : items.length === 0 ? (
          <EmptyState mensaje="No se encontraron suministros." icon={<Package size={40} />} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th><Th>Tipo</Th><Th>Referencia</Th>
                <Th>Stock actual</Th><Th>Stock mínimo</Th><Th>Estado</Th><Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLowStock = item.cantidad <= item.cantidad_minima;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <Td className="font-medium">{item.nombre}</Td>
                    <Td>{item.tipo}</Td>
                    <Td>{item.referencia || '—'}</Td>
                    <Td className={isLowStock ? 'text-red-600 font-semibold' : ''}>{item.cantidad}</Td>
                    <Td className={isLowStock ? 'text-red-600 font-semibold' : ''}>{item.cantidad_minima}</Td>
                    <Td><Badge variant={item.estado === 'Disponible' ? 'green' : item.estado === 'Agotado' ? 'red' : item.estado === 'Reservado' ? 'yellow' : 'gray'}>{item.estado}</Badge></Td>
                    <Td className="flex gap-1">
                      <Button variant="ghost" size="sm" icon={<History size={14} />} onClick={() => verHistorial(item)} title="Historial" />
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => abrirEditarSuministro(item)} title="Editar" />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => eliminarSuministro(item)} title="Eliminar" className="text-red-500" />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal Kardex */}
      <Modal abierto={showKardexModal} onCerrar={() => setShowKardexModal(false)} titulo={`Movimientos - ${kardexSuministro?.nombre || ''}`} size="xl">
        {kardexSuministro && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
              <div><span className="font-semibold">Stock actual:</span> {kardexSuministro.cantidad}</div>
              <div><span className="font-semibold">Stock mínimo:</span> {kardexSuministro.cantidad_minima}</div>
              <div>{kardexSuministro.cantidad <= kardexSuministro.cantidad_minima && <span className="text-amber-600"><AlertTriangle size={14} /> Stock bajo</span>}</div>
            </div>

            {/* Filtros y acciones */}
            <div className="flex flex-wrap gap-2 items-end">
              <div><label className="text-xs text-slate-500">Desde</label><input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className="border rounded px-2 py-1 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Hasta</label><input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className="border rounded px-2 py-1 text-sm" /></div>
              <Button size="sm" onClick={() => fetchMovimientos(kardexSuministro.id, 0)}>Filtrar</Button>
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={exportarMovimientos}>Exportar CSV</Button>
              <Button variant="primary" size="sm" onClick={() => setShowMovimientoForm(true)}>+ Movimiento</Button>
            </div>

            {movimientoLoading ? (
              <div className="py-6 text-center">Cargando...</div>
            ) : movimientos.length === 0 ? (
              <div className="py-6 text-center text-slate-400">No hay movimientos con estos filtros</div>
            ) : (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>Fecha</Th><Th>Tipo</Th><Th>Cantidad</Th><Th>Saldo</Th>
                      <Th>Responsable</Th><Th>Solicitante/Área</Th><Th>Motivo</Th><Th>Comprobante</Th>
                      {isAdmin && <Th>Acciones</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id}>
                        <Td>{formatearFecha(m.fecha)}</Td>
                        <Td><Badge variant={m.tipo_movimiento === 'entrada' ? 'green' : 'orange'}>{m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'}</Badge></Td>
                        <Td>{m.cantidad}</Td>
                        <Td className="font-mono">{m.saldo_parcial}</Td>
                        <Td>{m.usuario_sistema_nombre || '—'}</Td>
                        <Td>{m.solicitante_nombre || m.area_solicitante || '—'}</Td>
                        <Td>{m.motivo || '—'}</Td>
                        <Td>{m.comprobante || '—'}</Td>
                        {isAdmin && (
                          <Td>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditandoMovimiento(m); setEditForm({ tipo: m.tipo_movimiento, cantidad: m.cantidad, solicitante_id: '', area: m.area_solicitante || '', motivo: m.motivo || '', comprobante: m.comprobante || '', observaciones: m.observaciones || '' }); setShowEditMovimientoForm(true); }} className="text-blue-600"><Pencil size={14} /></button>
                              <button onClick={() => handleDeleteMovimiento(m)} className="text-red-600"><Trash2 size={14} /></button>
                            </div>
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="flex justify-between items-center mt-4">
                  <Button variant="outline" size="sm" disabled={movimientosPage === 0} onClick={() => fetchMovimientos(kardexSuministro.id, movimientosPage - 1)}><ChevronLeft size={14} /> Anterior</Button>
                  <span className="text-sm">Página {movimientosPage + 1} de {Math.ceil(movimientosTotal / movimientosLimit)}</span>
                  <Button variant="outline" size="sm" disabled={(movimientosPage + 1) * movimientosLimit >= movimientosTotal} onClick={() => fetchMovimientos(kardexSuministro.id, movimientosPage + 1)}>Siguiente <ChevronRight size={14} /></Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal crear movimiento (simplificado, pero incluye select de solicitantes) */}
      <Modal abierto={showMovimientoForm} onCerrar={() => setShowMovimientoForm(false)} titulo="Registrar movimiento" size="sm">
        <div className="space-y-4">
          <SelectField label="Tipo" value={formMovimiento.tipo} onChange={(e) => setFormMovimiento({ ...formMovimiento, tipo: e.target.value as 'entrada' | 'salida' })} options={[{ value: 'entrada', label: 'Entrada' }, { value: 'salida', label: 'Salida' }]} />
          <Field label="Cantidad" type="number" value={formMovimiento.cantidad} onChange={(e) => setFormMovimiento({ ...formMovimiento, cantidad: parseInt(e.target.value) || 0 })} />
          <SelectField label="Solicitante" value={formMovimiento.solicitante_id} onChange={(e) => setFormMovimiento({ ...formMovimiento, solicitante_id: e.target.value, area: '' })} options={[{ value: '', label: 'Seleccione...' }, ...solicitantes.map(s => ({ value: s.id, label: s.nombre }))]} />
          <Field label="Área (si no está en lista)" value={formMovimiento.area} onChange={(e) => setFormMovimiento({ ...formMovimiento, area: e.target.value, solicitante_id: '' })} placeholder="Ej: Tecnología" />
          <Field label="Motivo" value={formMovimiento.motivo} onChange={(e) => setFormMovimiento({ ...formMovimiento, motivo: e.target.value })} />
          <Field label="Comprobante" value={formMovimiento.comprobante} onChange={(e) => setFormMovimiento({ ...formMovimiento, comprobante: e.target.value })} />
          <Field label="Observaciones" value={formMovimiento.observaciones} onChange={(e) => setFormMovimiento({ ...formMovimiento, observaciones: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowMovimientoForm(false)}>Cancelar</Button><Button onClick={handleCrearMovimiento}>Guardar</Button></div>
      </Modal>

      {/* Modal editar movimiento (similar) */}
      <Modal abierto={showEditMovimientoForm} onCerrar={() => setShowEditMovimientoForm(false)} titulo="Editar movimiento" size="sm">
        <div className="space-y-4">
          <SelectField label="Tipo" value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value as 'entrada' | 'salida' })} options={[{ value: 'entrada', label: 'Entrada' }, { value: 'salida', label: 'Salida' }]} />
          <Field label="Cantidad" type="number" value={editForm.cantidad} onChange={(e) => setEditForm({ ...editForm, cantidad: parseInt(e.target.value) || 0 })} />
          <SelectField label="Solicitante" value={editForm.solicitante_id} onChange={(e) => setEditForm({ ...editForm, solicitante_id: e.target.value, area: '' })} options={[{ value: '', label: 'Seleccione...' }, ...solicitantes.map(s => ({ value: s.id, label: s.nombre }))]} />
          <Field label="Área" value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })} />
          <Field label="Motivo" value={editForm.motivo} onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })} />
          <Field label="Comprobante" value={editForm.comprobante} onChange={(e) => setEditForm({ ...editForm, comprobante: e.target.value })} />
          <Field label="Observaciones" value={editForm.observaciones} onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowEditMovimientoForm(false)}>Cancelar</Button><Button onClick={handleEditMovimiento}>Actualizar</Button></div>
      </Modal>

      {/* Modal suministro (crear/editar) */}
      <Modal abierto={showSuministroModal} onCerrar={() => setShowSuministroModal(false)} titulo={editandoSuministro ? 'Editar suministro' : 'Nuevo suministro'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre *" value={suministroForm.nombre} onChange={(e) => setSuministroForm({ ...suministroForm, nombre: e.target.value })} className="sm:col-span-2" />
          <SelectField label="Tipo" value={suministroForm.tipo} onChange={(e) => setSuministroForm({ ...suministroForm, tipo: e.target.value as any })} options={[{ value: 'Toner', label: 'Toner' }, { value: 'Licencia', label: 'Licencia' }, { value: 'Cable', label: 'Cable' }, { value: 'Rollo', label: 'Rollo' }, { value: 'Otro', label: 'Otro' }]} />
          <Field label="Referencia" value={suministroForm.referencia} onChange={(e) => setSuministroForm({ ...suministroForm, referencia: e.target.value })} />
          <Field label="Marca" value={suministroForm.marca} onChange={(e) => setSuministroForm({ ...suministroForm, marca: e.target.value })} />
          <Field label="Cantidad" type="number" value={suministroForm.cantidad} onChange={(e) => setSuministroForm({ ...suministroForm, cantidad: parseInt(e.target.value) || 0 })} />
          <Field label="Cantidad mínima" type="number" value={suministroForm.cantidad_minima} onChange={(e) => setSuministroForm({ ...suministroForm, cantidad_minima: parseInt(e.target.value) || 0 })} />
          <SelectField label="Estado" value={suministroForm.estado} onChange={(e) => setSuministroForm({ ...suministroForm, estado: e.target.value as any })} options={[{ value: 'Disponible', label: 'Disponible' }, { value: 'Agotado', label: 'Agotado' }, { value: 'Reservado', label: 'Reservado' }, { value: 'Baja', label: 'Baja' }]} />
          <Field label="Proveedor" value={suministroForm.proveedor} onChange={(e) => setSuministroForm({ ...suministroForm, proveedor: e.target.value })} className="sm:col-span-2" />
          <Field label="Observaciones" value={suministroForm.observaciones} onChange={(e) => setSuministroForm({ ...suministroForm, observaciones: e.target.value })} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowSuministroModal(false)}>Cancelar</Button><Button onClick={guardarSuministro}>Guardar</Button></div>
      </Modal>
    </div>
  );
}