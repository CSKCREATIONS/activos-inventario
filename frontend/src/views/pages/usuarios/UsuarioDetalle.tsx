// VIEW: Perfil completo de usuario
import { useUsuariosController } from '../../../controllers/useUsuariosController';
import { Button, Card, Badge, EstadoBadge, Table, Th, Td } from '../../components/ui/index';
import { ArrowLeft, Monitor, FileText, Mail, MapPin } from 'lucide-react';

interface Props { usuarioId: string; onVolver: () => void; }

export function UsuarioDetalle({ usuarioId, onVolver }: Props) {
  const ctrl = useUsuariosController();
  const usuario = ctrl.usuarios.find((u) => u.id === usuarioId);
  if (!usuario) return <div className="p-8 text-slate-400">Usuario no encontrado.</div>;

  const { equiposActivos, historialCompleto, docsUsuario } = ctrl.getPerfilUsuario(usuarioId);

  return (
    <div className="space-y-6">
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onVolver}>Volver a Usuarios</Button>

      {/* Cabecera usuario */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {usuario.nombre.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{usuario.nombre}</h2>
            <p className="text-slate-500">{usuario.cargo}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Mail size={14} />{usuario.correo}</span>
              {usuario.ubicacion && <span className="flex items-center gap-1"><MapPin size={14} />{usuario.ubicacion}</span>}
              <Badge variant="indigo">{usuario.area}</Badge>
              <Badge variant={usuario.activo ? 'green' : 'gray'}>{usuario.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipos activos */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Monitor size={16} className="text-blue-600" />
            Equipos asignados actualmente
            <Badge variant="blue">{equiposActivos.length}</Badge>
          </h3>
          {equiposActivos.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin equipos asignados</p>
          ) : (
            <div className="space-y-2">
              {equiposActivos.map((e) => e && (
                <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-mono font-semibold text-blue-700">{e.placa}</p>
                    <p className="text-xs text-slate-500">{e.tipo_equipo} – {e.marca} {e.modelo}</p>
                  </div>
                  <EstadoBadge estado={e.estado} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Documentos */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            Documentos firmados
          </h3>
          {docsUsuario.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin documentos registrados</p>
          ) : (
            <div className="space-y-2">
              {docsUsuario.map((d) => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-sm">
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-medium text-slate-700 truncate">{d.nombre}</p>
                    <p className="text-xs text-slate-400">{d.tipo} · v{d.version}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Historial completo */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-700">Historial de equipos</h3>
        </div>
        {historialCompleto.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">Sin historial</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Placa</Th>
                <Th>Tipo</Th>
                <Th>Fecha asignación</Th>
                <Th>Fecha devolución</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {historialCompleto.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <Td className="font-mono font-medium text-blue-700">{h.equipo?.placa ?? '—'}</Td>
                  <Td>{h.equipo?.tipo_equipo ?? '—'}</Td>
                  <Td>{h.fecha_asignacion}</Td>
                  <Td>{h.fecha_devolucion ?? <span className="text-emerald-600 font-medium">Activa</span>}</Td>
                  <Td>
                    <Badge variant={h.estado === 'Activa' ? 'green' : h.estado === 'Devuelta' ? 'blue' : 'red'}>
                      {h.estado}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
