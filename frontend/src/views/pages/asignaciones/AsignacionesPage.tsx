// VIEW: Página Asignaciones
import { useState } from 'react';
import { useAsignacionesController } from '../../../controllers/useAsignacionesController';

import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, RotateCcw, Link2, FileDown } from 'lucide-react';

const ACCESORIOS_OPCIONES = ['Cargador', 'Mouse', 'Teclado', 'Monitor'];
const ASIGNACION_VARIANT = {
  Activa: 'green',
  Devuelta: 'blue',
  Extraviada: 'red',
} as const;

export function AsignacionesPage() {
  const ctrl = useAsignacionesController();
  const [form, setForm] = useState({
    usuario_id: '',
    equipo_id: '',
    fecha_asignacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    accesorios_entregados: [] as string[],
  });
  const [error, setError] = useState('');
  const [otrosAccesorios, setOtrosAccesorios] = useState('');

  const toggleAccesorio = (nombre: string) => {
    setForm((f) => {
      const existe = f.accesorios_entregados.includes(nombre);
      return {
        ...f,
        accesorios_entregados: existe
          ? f.accesorios_entregados.filter((x) => x !== nombre)
          : [...f.accesorios_entregados, nombre],
      };
    });
  };

  const handleCrear = async () => {
    if (!form.usuario_id || !form.equipo_id) { setError('Usuario y equipo son requeridos.'); return; }
    const extras = otrosAccesorios
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const accesorios_entregados = Array.from(new Set([
      ...form.accesorios_entregados,
      ...extras,
    ]));

    const resultado = await ctrl.crearAsignacion({
      usuario_id: form.usuario_id,
      equipo_id: form.equipo_id,
      fecha_asignacion: form.fecha_asignacion,
      observaciones: form.observaciones,
      accesorios_entregados,
    });
    if (resultado.error) { setError(resultado.error); return; }
    setError('');
    setOtrosAccesorios('');
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
              setOtrosAccesorios('');
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
                  <Td className="font-medium">{a.usuario?.nombre ?? '—'}</Td>
                  <Td>{a.usuario?.area ?? '—'}</Td>
                  <Td className="font-mono text-blue-700">{a.equipo?.placa ?? '—'}</Td>
                  <Td>{a.equipo?.tipo_equipo ?? '—'}</Td>
                  <Td>{a.fecha_asignacion}</Td>
                  <Td>{a.fecha_devolucion ?? <span className="text-emerald-600 font-medium">Activa</span>}</Td>
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
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<RotateCcw size={12} />}
                        onClick={() => ctrl.registrarDevolucion(a.id)}
                      >
                        Devolver
                      </Button>
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Accesorios entregados</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCESORIOS_OPCIONES.map((acc) => (
                <label
                  key={acc}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.accesorios_entregados.includes(acc)}
                    onChange={() => toggleAccesorio(acc)}
                    className="h-4 w-4"
                  />
                  {acc}
                </label>
              ))}
            </div>
          </div>

          <Field
            label="Otros accesorios (separados por coma)"
            value={otrosAccesorios}
            onChange={(e) => setOtrosAccesorios(e.target.value)}
            placeholder="Ej: Base refrigerante, Guaya"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => ctrl.setModalAbierto(false)}>Cancelar</Button>
          <Button onClick={handleCrear}>Registrar asignación</Button>
        </div>
      </Modal>
    </div>
  );
}
