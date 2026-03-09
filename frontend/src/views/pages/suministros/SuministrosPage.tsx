// VIEW: Página Suministros — Toners, Licencias, Cables
// Tabs por tipo de suministro con CRUD completo

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button, SearchInput, Table, Th, Td, Modal, Card, EmptyState, Field, SelectField, Badge
} from '../../components/ui/index';
import { Plus, Printer, Key, Cable, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import type { Suministro, TipoSuministro, EstadoSuministro } from '../../../models/types/index';
import { suministrosApi } from '../../../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS: { tipo: TipoSuministro; label: string; icon: React.ReactNode; path: string }[] = [
  { tipo: 'Toner',    label: 'Toners',    icon: <Printer size={16} />, path: '/suministros/toners'    },
  { tipo: 'Licencia', label: 'Licencias', icon: <Key     size={16} />, path: '/suministros/licencias' },
  { tipo: 'Cable',    label: 'Cables',    icon: <Cable   size={16} />, path: '/suministros/cables'    },
];

const ESTADOS: EstadoSuministro[] = ['Disponible', 'Agotado', 'Reservado', 'Baja'];

const estadoBadge: Record<EstadoSuministro, 'green' | 'red' | 'yellow' | 'gray'> = {
  Disponible: 'green',
  Agotado:    'red',
  Reservado:  'yellow',
  Baja:       'gray',
};

const TIPO_FROM_PATH: Record<string, TipoSuministro> = {
  toners:    'Toner',
  licencias: 'Licencia',
  cables:    'Cable',
};

const EMPTY_FORM: Partial<Suministro> = {
  cantidad: 1, cantidad_minima: 1, estado: 'Disponible',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function SuministrosPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Inferir pestaña activa desde la URL (/suministros/toners, etc.)
  const segment   = location.pathname.split('/').pop() ?? '';
  const tipoActivo: TipoSuministro = TIPO_FROM_PATH[segment] ?? 'Toner';

  const [items,       setItems]       = useState<Suministro[]>([]);
  const [total,       setTotal]       = useState(0);
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSuministro | ''>('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion,  setModoEdicion]  = useState(false);
  const [selected,     setSelected]    = useState<Suministro | null>(null);
  const [form,         setForm]        = useState<Partial<Suministro>>(EMPTY_FORM);

  // ── Carga ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suministrosApi.getAll({
        tipo:    tipoActivo,
        busqueda: busqueda || undefined,
        estado:  filtroEstado || undefined,
      });
      setItems(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar suministros.');
    } finally {
      setLoading(false);
    }
  }, [tipoActivo, busqueda, filtroEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!form.nombre) return;
    try {
      if (modoEdicion && selected) {
        await suministrosApi.update(selected.id, form);
      } else {
        await suministrosApi.create({ ...EMPTY_FORM, ...form, tipo: tipoActivo } as Omit<Suministro, 'id' | 'fecha_registro' | 'equipo_placa'>);
      }
      setModalAbierto(false);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este suministro?')) return;
    try {
      await suministrosApi.remove(id);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  };

  const abrirCrear = () => {
    setForm({ ...EMPTY_FORM, tipo: tipoActivo });
    setModoEdicion(false);
    setSelected(null);
    setModalAbierto(true);
  };

  const abrirEditar = (item: Suministro) => {
    setForm(item);
    setModoEdicion(true);
    setSelected(item);
    setModalAbierto(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const tipoInfo = TIPOS.find((t) => t.tipo === tipoActivo)!;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TIPOS.map(({ tipo, label, icon, path }) => (
          <button
            key={tipo}
            onClick={() => navigate(path)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tipoActivo === tipo
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder={`Buscar ${tipoInfo.label.toLowerCase()}...`}
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoSuministro | '')}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="sm:ml-auto">
          <Button icon={<Plus size={16} />} onClick={abrirCrear} className="w-full sm:w-auto">
            Nuevo {tipoInfo.label.slice(0, -1)}
          </Button>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-slate-500">
        Mostrando <strong>{items.length}</strong> de <strong>{total}</strong> {tipoInfo.label.toLowerCase()}
      </p>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : null}

        {!loading && items.length === 0 ? (
          <EmptyState
            mensaje={`No se encontraron ${tipoInfo.label.toLowerCase()}.`}
            icon={<span className="text-slate-300">{tipoInfo.icon}</span>}
          />
        ) : null}

        {!loading && items.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                {tipoActivo !== 'Cable' && <Th>Referencia / Modelo</Th>}
                <Th>Marca</Th>
                <Th>Cantidad</Th>
                <Th>Mín.</Th>
                <Th>Estado</Th>
                {tipoActivo === 'Licencia' && <Th>Equipo</Th>}
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <Td className="font-medium">{item.nombre}</Td>
                  {tipoActivo !== 'Cable' && (
                    <Td className="text-slate-500">{item.referencia ?? '—'}</Td>
                  )}
                  <Td>{item.marca ?? '—'}</Td>
                  <Td>
                    <span className={item.cantidad <= item.cantidad_minima ? 'text-red-600 font-semibold' : ''}>
                      {item.cantidad}
                    </span>
                  </Td>
                  <Td className="text-slate-400">{item.cantidad_minima}</Td>
                  <Td>
                    <Badge variant={estadoBadge[item.estado]}>{item.estado}</Badge>
                  </Td>
                  {tipoActivo === 'Licencia' && (
                    <Td>
                      {item.equipo_placa
                        ? <span className="font-mono text-blue-700">{item.equipo_placa}</span>
                        : <span className="text-slate-400">—</span>}
                    </Td>
                  )}
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => abrirEditar(item)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleEliminar(item.id)}
                        className="text-red-500 hover:text-red-700">
                        Eliminar
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {/* Modal Crear / Editar */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={modoEdicion ? `Editar ${tipoInfo.label.slice(0, -1)}` : `Nuevo ${tipoInfo.label.slice(0, -1)}`}
        size="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Nombre *"
            value={form.nombre ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="sm:col-span-2"
          />
          {tipoActivo !== 'Cable' && (
            <Field
              label={tipoActivo === 'Licencia' ? 'Clave / Serial' : 'Referencia / Modelo'}
              value={form.referencia ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
            />
          )}
          <Field
            label="Marca"
            value={form.marca ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
          />
          <Field
            label="Cantidad"
            type="number"
            value={form.cantidad?.toString() ?? '1'}
            onChange={(e) => setForm((f) => ({ ...f, cantidad: Number(e.target.value) }))}
          />
          <Field
            label="Cantidad mínima"
            type="number"
            value={form.cantidad_minima?.toString() ?? '1'}
            onChange={(e) => setForm((f) => ({ ...f, cantidad_minima: Number(e.target.value) }))}
          />
          <SelectField
            label="Estado"
            value={form.estado ?? 'Disponible'}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoSuministro }))}
            options={ESTADOS.map((s) => ({ value: s, label: s }))}
            className="sm:col-span-2"
          />
          <Field
            label="Observaciones"
            value={form.observaciones ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            className="sm:col-span-2"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => setModalAbierto(false)}>Cancelar</Button>
          <Button onClick={handleGuardar}>{modoEdicion ? 'Guardar cambios' : 'Registrar'}</Button>
        </div>
      </Modal>
    </div>
  );
}
