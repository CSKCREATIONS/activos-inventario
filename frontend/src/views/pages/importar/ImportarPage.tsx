// VIEW: Importar CSV — carga masiva de datos
import { useRef } from 'react';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useImportarController } from '../../../controllers/useImportarController';
import type { EntidadImportable } from '../../../services/api';

const ENTIDADES: { value: EntidadImportable; label: string; descripcion: string }[] = [
  { value: 'equipos',    label: 'Activos / Equipos', descripcion: 'Laptops, desktops, impresoras y otros equipos' },
  { value: 'usuarios',   label: 'Usuarios',           descripcion: 'Responsables de activos TI' },
  { value: 'suministros',label: 'Suministros',        descripcion: 'Toners, licencias y cables' },
  { value: 'accesorios', label: 'Accesorios',         descripcion: 'Periféricos y dispositivos complementarios' },
];

export function ImportarPage() {
  const {
    entidad, archivo, loading, resultado, error,
    handleFile, handleEntidad, handleImportar, descargarPlantilla, reset,
  } = useImportarController();

  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
    // Reset para permitir re-seleccionar el mismo archivo
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Selector de entidad */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">1. Selecciona qué quieres importar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ENTIDADES.map(({ value, label, descripcion }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleEntidad(value)}
              className={clsx(
                'text-left p-3 rounded-lg border-2 transition-all',
                entidad === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              )}
            >
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs mt-0.5 opacity-70">{descripcion}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Zona de carga */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">2. Sube tu archivo CSV</h2>
          <button
            type="button"
            onClick={descargarPlantilla}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Download size={15} />
            Descargar plantilla
          </button>
        </div>

        {/* Drop zone — label is a native interactive element */}
        <label
          htmlFor="csv-input"
          onDrop={onDrop}
          onDragOver={onDragOver}
          className={clsx(
            'block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
            archivo
              ? 'border-green-400 bg-green-50'
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/40'
          )}
        >
          <input
            ref={inputRef}
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          {archivo ? (
            <div className="flex flex-col items-center gap-2 text-green-700">
              <FileText size={36} className="text-green-500" />
              <p className="font-medium">{archivo.name}</p>
              <p className="text-xs text-green-600">{(archivo.size / 1024).toFixed(1)} KB — listo para importar</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Upload size={36} className="text-slate-400" />
              <p className="font-medium text-slate-600">Arrastra un CSV aquí o haz clic para seleccionar</p>
              <p className="text-xs">Solo archivos .csv</p>
            </div>
          )}
        </label>

        {/* Acciones */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleImportar}
            disabled={!archivo || loading}
            className={clsx(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              archivo && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Importando…</span>
              </>
            ) : (
              <>
                <Upload size={15} />
                Importar
              </>
            )}
          </button>

          {(archivo || resultado) && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Error HTTP */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Resultado de la importación</h2>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{resultado.total}</p>
              <p className="text-xs text-slate-500 mt-0.5">Filas leídas</p>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{resultado.insertados}</p>
              <p className="text-xs text-green-600 mt-0.5">Insertados</p>
            </div>
            <div className={clsx(
              'rounded-lg border p-4 text-center',
              resultado.errores.length > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-slate-50 border-slate-200'
            )}>
              <p className={clsx(
                'text-2xl font-bold',
                resultado.errores.length > 0 ? 'text-red-700' : 'text-slate-400'
              )}>{resultado.errores.length}</p>
              <p className={clsx('text-xs mt-0.5', resultado.errores.length > 0 ? 'text-red-500' : 'text-slate-400')}>
                Con error
              </p>
            </div>
          </div>

          {/* Banner de éxito total */}
          {resultado.errores.length === 0 && resultado.insertados > 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Todos los registros fueron importados con éxito.</span>
            </div>
          )}

          {/* Tabla de errores */}
          {resultado.errores.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-red-600 mb-2">
                <XCircle size={15} />
                <span className="text-sm font-medium">Filas con error ({resultado.errores.length})</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-red-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-red-50 text-red-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold w-16">Fila</th>
                      <th className="px-3 py-2 text-left font-semibold">Error</th>
                      <th className="px-3 py-2 text-left font-semibold">Datos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {resultado.errores.map((e) => (
                      <tr key={e.fila} className="bg-white hover:bg-red-50/40">
                        <td className="px-3 py-2 font-mono text-slate-500">{e.fila}</td>
                        <td className="px-3 py-2 text-red-700">{e.error}</td>
                        <td className="px-3 py-2 text-slate-500 max-w-xs">
                          <span className="font-mono truncate block"
                            title={Object.entries(e.campos).map(([k, v]) => `${k}: ${v}`).join(', ')}>
                            {Object.entries(e.campos)
                              .filter(([, v]) => v)
                              .slice(0, 3)
                              .map(([k, v]) => `${k}=${v}`)
                              .join(', ')}
                            {Object.keys(e.campos).length > 3 ? '…' : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
