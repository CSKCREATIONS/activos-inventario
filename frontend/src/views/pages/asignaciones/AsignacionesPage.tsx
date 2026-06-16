// VIEW: Página Asignaciones
import { useMemo, useState } from 'react';
import { useAsignacionesController } from '../../../controllers/useAsignacionesController';
import type { Asignacion, AccesorioAsignado, Equipo, TipoEquipo } from '../../../models/types/index';

import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, RotateCcw, Link2, FileDown, Eye, X, Edit2, PenTool,Mail, Key } from 'lucide-react';
import { asignacionesApi, equiposApi } from '../../../services/api';
import { SignaturePad } from '../../components/ui/SignaturePad';
import { SEDES } from '../../../constants/sedes';



const ASIGNACION_VARIANT = {
  Activa: 'green',
  Devuelta: 'blue',
  Extraviada: 'red',
} as const;

const TIPOS_CON_HV = new Set<TipoEquipo>(['Laptop', 'Desktop', 'All-in-one']);

type AccesorioTexto = {
  referencia?: string;
  nombre?: string;
  nombre_equipo?: string;
  tipo_equipo?: string;
  marca?: string;
  modelo?: string;
};

const formatearAccesorio = (valor: string | AccesorioTexto | null | undefined): string => {
  if (!valor) return 'Accesorio';
  if (typeof valor === 'string') return valor.trim() || 'Accesorio';

  const referencia = valor.referencia?.trim();
  if (referencia) return referencia;

  // Solo usar marca y modelo, NO el tipo_equipo
  const partes = [valor.marca, valor.modelo]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));

  if (partes.length > 0) return partes.join(' ');

  const nombre = valor.nombre?.trim();
  if (nombre) return nombre;

  const nombreEquipo = valor.nombre_equipo?.trim();
  if (nombreEquipo) return nombreEquipo;

  return 'Accesorio';
};

const crearAccesorioAsignado = (equipo: Equipo): AccesorioAsignado => {
  const referencia = formatearAccesorio(equipo);
  return {
    id: equipo.id,
    nombre: referencia,
    referencia,
    tipo_equipo: equipo.tipo_equipo,
    marca: equipo.marca,
    modelo: equipo.modelo,
    placa: equipo.placa,
    nombre_equipo: equipo.nombre_equipo,
  };
};

const normalizarAccesorioAsignado = (valor: string | AccesorioAsignado): AccesorioAsignado => {
  if (typeof valor === 'string') {
    const referencia = valor.trim() || 'Accesorio';
    return { id: referencia, nombre: referencia, referencia };
  }
  const referencia = valor.referencia?.trim() || formatearAccesorio(valor);
  return {
    id: valor.id || referencia,
    nombre: referencia,
    referencia,
    tipo_equipo: valor.tipo_equipo,
    marca: valor.marca,
    modelo: valor.modelo,
    placa: valor.placa,
    nombre_equipo: valor.nombre_equipo,
  };
};

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

  // Estado del formulario de creación
  const [form, setForm] = useState({
    usuario_id: '',
    equipo_id: '',
    fecha_asignacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    accesorios_entregados: [] as AccesorioAsignado[],
    generar_hoja_vida: false,
    sede: '',
  });
  const [error, setError] = useState('');
  const equipoSeleccionado = ctrl.equiposDisponibles.find((e) => e.id === form.equipo_id);
  const puedeGenerarHojaVida = equipoSeleccionado ? TIPOS_CON_HV.has(equipoSeleccionado.tipo_equipo) : false;

  // Usuarios adicionales para nueva asignación
  const [usuariosAdicionales, setUsuariosAdicionales] = useState<string[]>([]);

  // Firma múltiple
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureAsignacionId, setSignatureAsignacionId] = useState<string | null>(null);
  const [selectedUsuarioFirma, setSelectedUsuarioFirma] = useState<{ id: string; nombre: string } | null>(null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [currentAsignacionParaFirma, setCurrentAsignacionParaFirma] = useState<Asignacion | null>(null);

  // Estado del modal de edición
  const [modalEditAbierto, setModalEditAbierto] = useState(false);
  const [editForm, setEditForm] = useState({
    usuarios_ids: [] as string[],
    accesorios_entregados: [] as AccesorioAsignado[],
    observaciones: '',
    sede: '',
    equipo_id: '',
  });
  const [originalEquipoId, setOriginalEquipoId] = useState<string | null>(null);

  // Modal de devolución de accesorios (antes "devolución múltiple")
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [devolucionAsignacion, setDevolucionAsignacion] = useState<Asignacion | null>(null);
  const [accesoriosSeleccionadosDevolucion, setAccesoriosSeleccionadosDevolucion] = useState<Set<string>>(new Set());

  // Filtros
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroTipoResponsable, setFiltroTipoResponsable] = useState('');

  // Aplicar filtros
  const asignacionesFiltradas = useMemo(() => {
    let filtradas = ctrl.asignaciones;
    if (filtroSede) {
      filtradas = filtradas.filter(a => a.sede === filtroSede);
    }
    if (filtroTipoResponsable) {
      filtradas = filtradas.filter(a => a.tipo_usuario_asignado === filtroTipoResponsable);
    }
    return filtradas;
  }, [ctrl.asignaciones, filtroSede, filtroTipoResponsable]);

  // Handlers
  const toggleAccesorio = (accesorio: AccesorioAsignado) => {
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

  const toggleAccesorioEditar = (accesorio: AccesorioAsignado) => {
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

  const handleCrear = async () => {
    if (!form.usuario_id || !form.equipo_id) {
      setError('Usuario y equipo son requeridos.');
      return;
    }
    const resultado = await ctrl.crearAsignacion({
      usuario_id: form.usuario_id,
      equipo_id: form.equipo_id,
      fecha_asignacion: form.fecha_asignacion,
      observaciones: form.observaciones,
      accesorios_entregados: form.accesorios_entregados,
      generar_hoja_vida: form.generar_hoja_vida,
      sede: form.sede,
      usuarios_ids: usuariosAdicionales,
    });
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    setError('');
  };

  const abrirModalEditar = (asignacion: Asignacion) => {
    setOriginalEquipoId(asignacion.equipo_id);
    setEditForm({
      usuarios_ids: asignacion.usuarios_ids || [asignacion.usuario_id],
      accesorios_entregados: Array.isArray(asignacion.accesorios_entregados)
        ? asignacion.accesorios_entregados.map((a) => normalizarAccesorioAsignado(a as string | AccesorioAsignado))
        : [],
      observaciones: asignacion.observaciones || '',
      sede: asignacion.sede || '',
      equipo_id: asignacion.equipo_id || '',
    });
    ctrl.setSelectedAsignacion(asignacion);
    setModalEditAbierto(true);
  };

  const handleGuardarEdicion = async () => {
    if (!ctrl.selectedAsignacion) return;
    const asignacionId = ctrl.selectedAsignacion.id;

    if (editForm.equipo_id && editForm.equipo_id !== originalEquipoId) {
      const confirmar = window.confirm('Se ha cambiado el equipo principal. ¿Deseas devolver el equipo anterior y asignar el nuevo?');
      if (!confirmar) return;
      try {
        // Liberar el equipo anterior
        await equiposApi.update(originalEquipoId!, { estado: 'Disponible' });
        // Asignar el nuevo equipo
        await equiposApi.update(editForm.equipo_id, { estado: 'Asignado' });
        // Actualizar la asignación
        await ctrl.editarAsignacion(asignacionId, {
          equipo_id: editForm.equipo_id,
          usuarios_ids: editForm.usuarios_ids,
          accesorios_entregados: editForm.accesorios_entregados,
          observaciones: editForm.observaciones,
          sede: editForm.sede,
        });
        await ctrl.refetch();
      } catch (err) {
        console.error(err);
        alert('Error al cambiar el equipo. Intente de nuevo.');
        return;
      }
    } else {
      const resultado = await ctrl.editarAsignacion(asignacionId, {
        usuarios_ids: editForm.usuarios_ids,
        accesorios_entregados: editForm.accesorios_entregados,
        observaciones: editForm.observaciones,
        sede: editForm.sede,
        equipo_id: editForm.equipo_id,
      });
      if (resultado?.error) {
        alert(resultado.error);
        return;
      }
    }
    setModalEditAbierto(false);
    // Si la previsualización estaba abierta, cerrarla y recargar
    if (ctrl.previewUrl) {
      ctrl.cerrarPreview();
      setTimeout(() => ctrl.obtenerUrlActa(asignacionId), 500);
    }
  };

  // Abrir modal para devolver solo accesorios (sin el equipo principal)
  const abrirDevolucionAccesorios = (asignacion: Asignacion) => {
    setDevolucionAsignacion(asignacion);
    // Seleccionar todos los accesorios por defecto (opcional)
    const allAccesoriosIds = new Set<string>();
    (asignacion.accesorios_entregados || []).forEach((acc: any) => {
      if (acc.id) allAccesoriosIds.add(acc.id);
    });
    setAccesoriosSeleccionadosDevolucion(allAccesoriosIds);
    setShowDevolucionModal(true);
  };

  const toggleAccesorioDevolucion = (id: string) => {
    setAccesoriosSeleccionadosDevolucion(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDevolverAccesorios = async () => {
    if (!devolucionAsignacion) return;
    const ids = Array.from(accesoriosSeleccionadosDevolucion);
    if (ids.length === 0) {
      alert('Selecciona al menos un accesorio para devolver.');
      return;
    }
    try {
      await asignacionesApi.devolucionMultiple(devolucionAsignacion.id, ids);
      await ctrl.refetch();
      setShowDevolucionModal(false);
      setDevolucionAsignacion(null);
      setAccesoriosSeleccionadosDevolucion(new Set());
      if (ctrl.previewUrl) {
        ctrl.cerrarPreview();
        setTimeout(() => ctrl.obtenerUrlActa(devolucionAsignacion.id), 500);
      }
      alert(`${ids.length} accesorio(s) devuelto(s).`);
    } catch (err) {
      console.error(err);
      alert('Error al devolver los accesorios.');
    }
  };

  // Funciones para firmas
  const getUsuariosAsignados = (asignacion: Asignacion) => {
    const principal = ctrl.usuarios.find(u => u.id === asignacion.usuario_id);
    const adicionales = (asignacion.usuarios_ids || [])
      .map(id => ctrl.usuarios.find(u => u.id === id))
      .filter(Boolean) as any[];
    return [
      { id: asignacion.usuario_id, nombre: principal?.nombre || 'Usuario principal' },
      ...adicionales.map(u => ({ id: u.id, nombre: u.nombre })),
    ];
  };

  const iniciarFirma = (asignacion: Asignacion) => {
    setCurrentAsignacionParaFirma(asignacion);
    setSignatureAsignacionId(asignacion.id);
    setShowUserSelector(true);
  };

  const seleccionarUsuarioParaFirma = (usuario: { id: string; nombre: string }) => {
    setSelectedUsuarioFirma(usuario);
    setShowUserSelector(false);
    setShowSignatureModal(true);
  };
    const handleReenviarFirma = async (asignacionId: string) => {
    if (!confirm('¿Reenviar el correo de firma a los usuarios responsables?')) return;
    try {
      await asignacionesApi.reenviarFirma(asignacionId);
      alert('Correo de firma reenviado correctamente');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al reenviar el correo');
    }
  };

  const handleMostrarToken = async (asignacionId: string) => {
    try {
      const res = await asignacionesApi.obtenerTokenFirma(asignacionId);
      prompt('Token para firmar (copia para pruebas en Postman):', res.token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al obtener el token');
    }
  };

  const handleFirmar = async (firmaDataUrl: string) => {
    if (!signatureAsignacionId || !selectedUsuarioFirma) return;
    try {
      await asignacionesApi.firmar(signatureAsignacionId, { usuario_id: selectedUsuarioFirma.id, firma: firmaDataUrl });
      await ctrl.refetch();
      setShowSignatureModal(false);
      setSignatureAsignacionId(null);
      setSelectedUsuarioFirma(null);
      if (ctrl.previewUrl) {
        await ctrl.obtenerUrlActa(signatureAsignacionId);
      }
    } catch (err) {
      console.error(err);
      alert('Error al firmar el acta');
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

      {/* Toolbar con filtros */}
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
        <select
          value={filtroSede}
          onChange={(e) => setFiltroSede(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las sedes</option>
          {SEDES.map(sede => <option key={sede} value={sede}>{sede}</option>)}
        </select>
        <select
          value={filtroTipoResponsable}
          onChange={(e) => setFiltroTipoResponsable(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="empleado">Empleado</option>
          <option value="cliente">Cliente</option>
          <option value="proyecto">Proyecto</option>
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
                generar_hoja_vida: false,
                sede: '',
              });
              setUsuariosAdicionales([]);
              setError('');
              ctrl.setModalAbierto(true);
            }}
            className="w-full sm:w-auto"
          >
            Nueva asignación
          </Button>
        </div>
      </div>

      {/* Tabla de asignaciones */}
      <Card>
        {ctrl.asignaciones.length === 0 ? (
          <EmptyState mensaje="No se encontraron asignaciones." icon={<Link2 size={40} />} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Usuario(s)</Th>
                  <Th>Firmas</Th>
                  <Th>Tipo responsable</Th>
                  <Th>Área</Th>
                  <Th>Sede</Th>
                  <Th>Equipo</Th>
                  <Th>Tipo</Th>
                  <Th>Fecha asignación</Th>
                  <Th>Fecha devolución</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {asignacionesFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <Td className="font-medium">
                      <div>{a.todos_usuarios || '—'}</div>
                      {a.cantidad_adicionales > 0 && (
                        <div className="text-xs text-slate-500">
                          {a.cantidad_adicionales} usuario(s) adicional(es)
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">
                          Firmas: {(a.firmas?.length || 0)} / {(a.usuarios_ids?.length || 0) + 1}
                        </span>
                        {a.firmas?.map((f: any) => (
                          <Badge key={f.user_id} variant="green" size="sm">
                            ✓ {f.nombre}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={
                        a.tipo_usuario_asignado === 'empleado' ? 'blue' :
                        a.tipo_usuario_asignado === 'cliente' ? 'green' : 'orange'
                      }>
                        {a.tipo_usuario_asignado === 'empleado' ? 'Empleado' :
                        a.tipo_usuario_asignado === 'cliente' ? 'Cliente' : 'Proyecto'}
                      </Badge>
                    </Td>
                    <Td>{a.usuario?.area ?? '—'}</Td>
                    <Td>{a.sede || '—'}</Td>
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
                          onClick={() => ctrl.obtenerUrlActa(a.id)}
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
                        <Button
                              variant="ghost"
                              size="sm"
                              icon={<Mail size={12} />}
                              onClick={() => handleReenviarFirma(a.id)}
                              title="Reenviar correo de firma"
                            />
                            {/* ✅ Botón obtener token */}
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Key size={12} />}
                              onClick={() => handleMostrarToken(a.id)}
                              title="Obtener token para pruebas"
                            />
                        {a.estado === 'Activa' && (
                          <>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<RotateCcw size={12} />}
                              onClick={() => abrirDevolucionAccesorios(a)}
                            >
                              Devolver accesorios
                            </Button>
                          </>
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
                            icon={<PenTool size={12} />}
                            onClick={() => iniciarFirma(a)}
                          >
                            Firmar
                          </Button>
                                <Button 
        variant="outline" 
        size="sm" 
        icon={<RotateCcw size={12} />} 
        onClick={async () => {
          if (confirm(`¿Devolver completamente la asignación? Se marcará como devuelta y el equipo principal y todos los accesorios quedarán disponibles.`)) {
            try {
              await asignacionesApi.devolucion(a.id);
              await ctrl.refetch();
              if (ctrl.previewUrl) {
                ctrl.cerrarPreview();
              }
              alert('Devolución completada exitosamente');
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Error al devolver');
            }
          }
        }}
      >
        Devolver todo
      </Button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="text-sm text-slate-500 px-4 py-3 border-t">
              Mostrando <strong>{asignacionesFiltradas.length}</strong> de <strong>{ctrl.asignaciones.length}</strong> asignaciones
            </p>
          </>
        )}
      </Card>

      {/* Modal de previsualización */}
      {ctrl.previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh]">
            <button
              onClick={ctrl.cerrarPreview}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
            >
              <X size={20} />
            </button>
            <iframe src={ctrl.previewUrl} className="w-full h-full rounded-xl" title="Acta de entrega" />
          </div>
        </div>
      )}

      {/* Modal nueva asignación (sin cambios) */}
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
            onChange={(e) => setForm((f) => ({ ...f, equipo_id: e.target.value, generar_hoja_vida: false }))}
            options={ctrl.equiposDisponibles.map((e) => ({ value: e.id, label: `${e.placa} – ${e.tipo_equipo} ${e.marca ?? ''}` }))}
          />
          <SelectField label="Sede" value={form.sede ?? ''} onChange={(e) => setForm((f) => ({ ...f, sede: e.target.value }))} options={SEDES.map((s) => ({ value: s, label: s }))} />
          {puedeGenerarHojaVida && (
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.generar_hoja_vida}
                onChange={(e) => setForm((f) => ({ ...f, generar_hoja_vida: e.target.checked }))}
                className="rounded"
              />
              Generar hoja de vida para este equipo
            </label>
          )}
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Usuarios adicionales (opcional)</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {ctrl.usuarios.map((usuario) => (
                <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={usuariosAdicionales.includes(usuario.id)}
                    onChange={() => {
                      if (usuariosAdicionales.includes(usuario.id)) {
                        setUsuariosAdicionales(prev => prev.filter(id => id !== usuario.id));
                      } else {
                        if (usuario.id === form.usuario_id) {
                          alert('El usuario principal no puede ser seleccionado como adicional.');
                          return;
                        }
                        setUsuariosAdicionales(prev => [...prev, usuario.id]);
                      }
                    }}
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
                              ...crearAccesorioAsignado(acc),
                              placa: acc.placa,
                            })}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700">{formatearAccesorio(acc)}</div>
                            {acc.placa && <div className="text-xs text-slate-500">Placa: {acc.placa}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form.accesorios_entregados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {form.accesorios_entregados.map((acc) => (
                    <div
                      key={acc.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      <span>{formatearAccesorio(acc)} {acc.placa && `(${acc.placa})`}</span>
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Usuarios asignados</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {ctrl.usuarios.map((usuario) => (
                <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={editForm.usuarios_ids.includes(usuario.id)}
                    onChange={() => {
                      const existe = editForm.usuarios_ids.includes(usuario.id);
                      if (existe) {
                        setEditForm(f => ({ ...f, usuarios_ids: f.usuarios_ids.filter(id => id !== usuario.id) }));
                      } else {
                        setEditForm(f => ({ ...f, usuarios_ids: [...f.usuarios_ids, usuario.id] }));
                      }
                    }}
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
          <SelectField
            label="Equipo principal"
            value={editForm.equipo_id}
            onChange={(e) => setEditForm(f => ({ ...f, equipo_id: e.target.value }))}
            options={ctrl.equiposDisponibles.map(e => ({ value: e.id, label: `${e.placa} - ${e.tipo_equipo} ${e.marca || ''}` }))}
          />
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
                            onChange={() => toggleAccesorioEditar(crearAccesorioAsignado(acc))}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700">{formatearAccesorio(acc)}</div>
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
                      <span>{formatearAccesorio(acc)} {acc.placa && `(${acc.placa})`}</span>
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
          <Field
            label="Observaciones"
            value={editForm.observaciones}
            onChange={(e) => setEditForm((f) => ({ ...f, observaciones: e.target.value }))}
          />
          <SelectField
            label="Sede"
            value={editForm.sede ?? ''}
            onChange={(e) => setEditForm(f => ({ ...f, sede: e.target.value }))}
            options={SEDES.map((s) => ({ value: s, label: s }))}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalEditAbierto(false)}>Cancelar</Button>
            <Button onClick={handleGuardarEdicion} loading={ctrl.loading}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de devolución de accesorios (sin equipo principal) */}
      <Modal
        abierto={showDevolucionModal}
        onCerrar={() => {
          setShowDevolucionModal(false);
          setDevolucionAsignacion(null);
          setAccesoriosSeleccionadosDevolucion(new Set());
        }}
        titulo="Devolver accesorios"
        size="md"
      >
        {devolucionAsignacion && (
          <div className="space-y-4">
            {(() => {
              const accesorios = devolucionAsignacion.accesorios_entregados || [];
              if (accesorios.length === 0) {
                return <p className="text-slate-500 italic">No hay accesorios asignados para devolver.</p>;
              }

              // Agrupar por tipo_equipo
              const grupos = new Map<string, any[]>();
              accesorios.forEach((acc: any) => {
                const tipo = acc.tipo_equipo || 'Otros';
                if (!grupos.has(tipo)) grupos.set(tipo, []);
                grupos.get(tipo)!.push(acc);
              });

              const orden = ['Monitor', 'Impresora', 'Teclado', 'Mouse', 'Otros'];
              const gruposOrdenados = Array.from(grupos.entries()).sort((a, b) => {
                const idxA = orden.indexOf(a[0]);
                const idxB = orden.indexOf(b[0]);
                return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
              });

              return gruposOrdenados.map(([tipo, items]) => {
                const todosSeleccionados = items.every(item => accesoriosSeleccionadosDevolucion.has(item.id));
                return (
                  <div key={tipo} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-700">{tipo}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const nuevosIds = new Set(accesoriosSeleccionadosDevolucion);
                          if (todosSeleccionados) {
                            items.forEach(item => nuevosIds.delete(item.id));
                          } else {
                            items.forEach(item => nuevosIds.add(item.id));
                          }
                          setAccesoriosSeleccionadosDevolucion(nuevosIds);
                        }}
                      >
                        {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={accesoriosSeleccionadosDevolucion.has(item.id)}
                            onChange={() => toggleAccesorioDevolucion(item.id)}
                            className="h-4 w-4"
                          />
                          <div>
                            <div className="font-medium text-slate-800">{item.nombre || item.placa}</div>
                            {item.placa && <div className="text-xs text-slate-500">Placa: {item.placa}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDevolucionModal(false)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={handleDevolverAccesorios}
                disabled={accesoriosSeleccionadosDevolucion.size === 0}
              >
                Devolver seleccionados ({accesoriosSeleccionadosDevolucion.size})
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal selector de usuario para firmar */}
      <Modal
        abierto={showUserSelector}
        onCerrar={() => setShowUserSelector(false)}
        titulo="¿Quién firma el acta?"
        size="sm"
      >
        <div className="space-y-3">
          {currentAsignacionParaFirma && getUsuariosAsignados(currentAsignacionParaFirma).map((usuario) => {
            const yaFirmo = currentAsignacionParaFirma.firmas?.some((f: any) => f.user_id === usuario.id);
            return (
              <button
                key={usuario.id}
                onClick={() => !yaFirmo && seleccionarUsuarioParaFirma(usuario)}
                disabled={yaFirmo}
                className={`w-full text-left p-3 rounded-lg border transition-all ${yaFirmo
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="font-medium">{usuario.nombre}</div>
                {yaFirmo && <div className="text-xs text-emerald-600">✓ Ya firmó</div>}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowUserSelector(false)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Modal de firma (SignaturePad) */}
      <Modal
        abierto={showSignatureModal}
        onCerrar={() => {
          setShowSignatureModal(false);
          setSelectedUsuarioFirma(null);
          setSignatureAsignacionId(null);
        }}
        titulo={`Firmar acta - ${selectedUsuarioFirma?.nombre || ''}`}
        size="md"
      >
        {selectedUsuarioFirma && (
          <SignaturePad
            onSave={(dataUrl) => {
              if (signatureAsignacionId) handleFirmar(dataUrl);
            }}
            onCancel={() => {
              setShowSignatureModal(false);
              setSelectedUsuarioFirma(null);
              setSignatureAsignacionId(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}