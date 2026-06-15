// VIEW: Detalle de un Activo
// Muestra ficha completa, responsable actual, historial de asignaciones y mantenimientos.

import { useState, useEffect } from 'react';
import { useActivosController } from '../../../controllers/useActivosController';
import { asignacionesApi, equiposApi, mantenimientosApi } from '../../../services/api';
import {
  Button, Card, EstadoBadge, CriticidadBadge, ConfidencialidadBadge, Badge, Table, Th, Td, Modal, Field, SelectField
} from '../../components/ui/index';
import { ArrowLeft, User, Calendar, FileText, AlertTriangle, Wrench } from 'lucide-react';

interface Props { equipoId: string; onVolver: () => void; }

export function ActivoDetalle({ equipoId, onVolver }: Props) {
  // 1. TODOS LOS HOOKS PRIMERO (sin condiciones)
  const ctrl = useActivosController();
  const [mantenimientos, setMantenimientos] = useState<any[]>([]);
  const [loadingMant, setLoadingMant] = useState(false);
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
  const [formMant, setFormMant] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'preventivo',
    descripcion: '',
    realizado_por: '',
    costo: '',
    proximo_mantenimiento: ''
  });

  // Cargar mantenimientos (efecto)
  useEffect(() => {
    const cargar = async () => {
      setLoadingMant(true);
      try {
        const res = await mantenimientosApi.listar(equipoId);
        setMantenimientos(res.data);
      } catch (error) {
        console.error('Error cargando mantenimientos:', error);
      } finally {
        setLoadingMant(false);
      }
    };
    cargar();
  }, [equipoId]);

  // 2. VALIDACIÓN DEL EQUIPO (después de los hooks)
  const equipo = ctrl.equipos.find((e) => e.id === equipoId);
  if (!equipo) return <div className="p-8 text-slate-400">Activo no encontrado.</div>;

  // 3. FUNCIONES (pueden ir después de la validación o antes, da igual)
  const responsable = ctrl.getResponsableActual(equipoId);
  const historial = ctrl.getHistorialEquipo(equipoId);

  const descargarActa = async (asignacionId: string) => {
    try {
      const { blob, filename } = await asignacionesApi.downloadActa(asignacionId, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando acta:', error);
      alert('No se pudo descargar el acta.');
    }
  };

  const descargarHojaVida = async (equipoId: string, placa: string) => {
    try {
      const blob = await equiposApi.getHojaVidaPdf(equipoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hoja_vida_${placa}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando hoja de vida:', error);
      alert('No se pudo descargar la hoja de vida.');
    }
  };

  const registrarMantenimiento = async () => {
    if (!formMant.fecha || !formMant.tipo) {
      alert('Fecha y tipo son obligatorios');
      return;
    }
    try {
      await mantenimientosApi.registrar(equipoId, {
        fecha: formMant.fecha,
        tipo: formMant.tipo,
        descripcion: formMant.descripcion,
        realizado_por: formMant.realizado_por,
        costo: formMant.costo ? parseFloat(formMant.costo) : null,
        proximo_mantenimiento: formMant.proximo_mantenimiento || null
      });
      alert('Mantenimiento registrado correctamente');
      setShowMantenimientoModal(false);
      // Resetear formulario
      setFormMant({
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'preventivo',
        descripcion: '',
        realizado_por: '',
        costo: '',
        proximo_mantenimiento: ''
      });
      // Recargar la lista de mantenimientos
      const res = await mantenimientosApi.listar(equipoId);
      setMantenimientos(res.data);
      // Opcional: recargar el equipo para actualizar último mantenimiento
      if (ctrl.refetch) ctrl.refetch();
    } catch (error) {
      console.error('Error registrando mantenimiento:', error);
      alert('Error al registrar mantenimiento');
    }
  };

  // 4. RENDERIZADO
  return (
    <div className="space-y-6">
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onVolver}>Volver a Activos</Button>

      {/* Cabecera */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{equipo.tipo_equipo}</p>
            <h2 className="text-2xl font-bold text-slate-800 font-mono">{equipo.placa}</h2>
            {equipo.marca && <p className="text-slate-500 mt-1">{equipo.marca} {equipo.modelo}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <EstadoBadge estado={equipo.estado} />
            <CriticidadBadge criticidad={equipo.criticidad} />
            <ConfidencialidadBadge valor={equipo.confidencialidad} />
            {equipo.es_rentado && <Badge variant="purple">Rentado</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información técnica */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-600 rounded-full" />
            Información técnica
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Serial', equipo.serial],
              ['Sistema operativo', equipo.sistema_operativo],
              ['Versión SO', equipo.version_so],
              ['RAM', equipo.ram],
              ['Disco', equipo.disco],
              ['Proveedor', equipo.proveedor],
              ['Fecha de compra', equipo.fecha_compra],
              ['Fecha registro', equipo.fecha_registro],
              ['Costo', equipo.costo ? `$${equipo.costo.toLocaleString()}` : undefined],
            ].map(([k, v]) =>
              v ? (
                <div key={String(k)}>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">{k}</dt>
                  <dd className="font-medium text-slate-700">{v}</dd>
                </div>
              ) : null
            )}
          </dl>
          {equipo.observaciones && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg flex gap-2 text-sm text-amber-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {equipo.observaciones}
            </div>
          )}
        </Card>

        {/* Responsable actual */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full" />
            Responsable actual
          </h3>
          {responsable ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {responsable.nombre.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{responsable.nombre}</p>
                  <p className="text-xs text-slate-500">{responsable.cargo}</p>
                </div>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="text-xs text-slate-400">Área</dt><dd className="font-medium">{responsable.area}</dd></div>
                <div><dt className="text-xs text-slate-400">Proceso</dt><dd className="font-medium">{responsable.proceso}</dd></div>
                <div><dt className="text-xs text-slate-400">Correo</dt><dd className="font-medium text-blue-600">{responsable.correo || '-'}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <User size={32} />
              <p className="text-sm">Sin responsable asignado</p>
            </div>
          )}
        </Card>
      </div>

      {/* Historial de asignaciones */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Calendar size={16} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Historial de asignaciones</h3>
          <Badge variant="blue" size="sm">{historial.length}</Badge>
        </div>
        {historial.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Sin historial de asignaciones</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Área</Th>
                <Th>Fecha asignación</Th>
                <Th>Fecha devolución</Th>
                <Th>Estado</Th>
                <Th>Documentos</Th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{h.usuario?.nombre ?? '—'}</Td>
                  <Td>{h.usuario?.area ?? '—'}</Td>
                  <Td>{h.fecha_asignacion}</Td>
                  <Td>{h.fecha_devolucion ?? <span className="text-emerald-600 font-medium">Activa</span>}</Td>
                  <Td>
                    <Badge variant={h.estado === 'Activa' ? 'green' : h.estado === 'Devuelta' ? 'blue' : 'red'}>
                      {h.estado}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {h.acta_pdf && (
                        <button
                          onClick={() => descargarActa(h.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <FileText size={10} /> Acta
                        </button>
                      )}
                      {h.hoja_vida_pdf && (
                        <button
                          onClick={() => descargarHojaVida(equipo.id, equipo.placa)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          <FileText size={10} /> H. Vida
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Historial de mantenimientos */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-700">Historial de mantenimientos</h3>
            <Badge variant="blue" size="sm">{mantenimientos.length}</Badge>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowMantenimientoModal(true)}>
            + Registrar mantenimiento
          </Button>
        </div>
        {loadingMant ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando mantenimientos...</div>
        ) : mantenimientos.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Sin mantenimientos registrados</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Tipo</Th>
                <Th>Descripción</Th>
                <Th>Realizado por</Th>
                <Th>Costo</Th>
                <Th>Próximo mantenimiento</Th>
              </tr>
            </thead>
            <tbody>
              {mantenimientos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <Td>{m.fecha}</Td>
                  <Td>
                    <Badge variant={m.tipo === 'preventivo' ? 'green' : 'orange'}>
                      {m.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo'}
                    </Badge>
                  </Td>
                  <Td>{m.descripcion || '—'}</Td>
                  <Td>{m.realizado_por || '—'}</Td>
                  <Td>{m.costo ? `$${m.costo.toLocaleString()}` : '—'}</Td>
                  <Td>{m.proximo_mantenimiento || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal para registrar mantenimiento */}
      <Modal
        abierto={showMantenimientoModal}
        onCerrar={() => setShowMantenimientoModal(false)}
        titulo="Registrar mantenimiento"
        size="md"
      >
        <div className="space-y-4">
          <Field
            label="Fecha *"
            type="date"
            value={formMant.fecha}
            onChange={(e) => setFormMant({ ...formMant, fecha: e.target.value })}
          />
          <SelectField
            label="Tipo *"
            value={formMant.tipo}
            onChange={(e) => setFormMant({ ...formMant, tipo: e.target.value })}
            options={[
              { value: 'preventivo', label: 'Preventivo' },
              { value: 'correctivo', label: 'Correctivo' }
            ]}
          />
          <Field
            label="Descripción"
            value={formMant.descripcion}
            onChange={(e) => setFormMant({ ...formMant, descripcion: e.target.value })}
            placeholder="Detalle del mantenimiento realizado"
          />
          <Field
            label="Realizado por"
            value={formMant.realizado_por}
            onChange={(e) => setFormMant({ ...formMant, realizado_por: e.target.value })}
            placeholder="Nombre del técnico o empresa"
          />
          <Field
            label="Costo"
            type="number"
            step="0.01"
            value={formMant.costo}
            onChange={(e) => setFormMant({ ...formMant, costo: e.target.value })}
            placeholder="0.00"
          />
          <Field
            label="Próximo mantenimiento"
            type="date"
            value={formMant.proximo_mantenimiento}
            onChange={(e) => setFormMant({ ...formMant, proximo_mantenimiento: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => setShowMantenimientoModal(false)}>Cancelar</Button>
          <Button onClick={registrarMantenimiento}>Guardar mantenimiento</Button>
        </div>
      </Modal>
    </div>
  );
}