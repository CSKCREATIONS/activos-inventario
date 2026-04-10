// VIEW: Header — responsive con hamburger para móvil
import { useEffect, useRef, useState } from 'react';
import { Bell, User, Menu, LogOut, Wrench, AlertTriangle, Clock, X } from 'lucide-react';
import { useAuthStore } from '../../models/stores/useAuthStore';
import { useAuthController } from '../../controllers/useAuthController';
import { dashboardApi } from '../../services/api';
import type { EquipoMantenimiento } from '../../models/types/index';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  onMenuClick: () => void;
}

// ── Hook: carga mantenimientos pendientes ─────────────────────────────────────
function useMantenimientosPendientes() {
  const [data, setData] = useState<{ total: number; sin_registro: number; vencidos: number; equipos: EquipoMantenimiento[] }>({
    total: 0, sin_registro: 0, vencidos: 0, equipos: [],
  });

  useEffect(() => {
    let mounted = true;
    const fetch_ = async () => {
      try {
        const res = await dashboardApi.getMantenimientosPendientes();
        if (mounted) setData(res.data);
      } catch {
        // silencioso: la campana simplemente no muestra badge
      }
    };
    fetch_();
    const id = setInterval(fetch_, 5 * 60 * 1000); // refresca cada 5 min
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return data;
}

export function Header({ titulo, subtitulo, onMenuClick }: Readonly<HeaderProps>) {
  const authUser = useAuthStore((s) => s.user);
  const { handleLogout } = useAuthController();
  const [abierto, setAbierto] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const mant = useMantenimientosPendientes();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — solo en móvil/tablet */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold text-slate-800 truncate">{titulo}</h1>
          {subtitulo && <p className="text-xs text-slate-500 hidden sm:block truncate">{subtitulo}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">

        {/* ── Campana de mantenimientos ── */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setAbierto((v) => !v)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Mantenimientos pendientes"
          >
            <Bell size={18} />
            {mant.total > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center
                               rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none">
                {mant.total > 99 ? '99+' : mant.total}
              </span>
            )}
          </button>

          {/* Popover */}
          {abierto && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border
                            border-slate-200 z-50 overflow-hidden">
              {/* Cabecera */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                <div className="flex items-center gap-2">
                  <Wrench size={15} className="text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Mantenimientos pendientes</span>
                </div>
                <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              {/* Contadores */}
              <div className="grid grid-cols-2 gap-2 p-3 border-b bg-white">
                <div className="flex flex-col items-center py-2 bg-red-50 rounded-lg border border-red-100">
                  <span className="text-xl font-bold text-red-600">{mant.sin_registro + mant.vencidos}</span>
                  <span className="text-[10px] text-red-500 font-medium mt-0.5">Sin registro / Vencido</span>
                </div>
                <div className="flex flex-col items-center py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-xl font-bold text-blue-600">{mant.total}</span>
                  <span className="text-[10px] text-blue-500 font-medium mt-0.5">Total pendientes</span>
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {mant.total === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-sm">✅ Todos los equipos al día</p>
                ) : (
                  mant.equipos.slice(0, 6).map((eq) => (
                    <div key={eq.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <span className={`mt-0.5 shrink-0 ${eq.urgencia === 'sin_registro' ? 'text-red-500' : 'text-orange-500'}`}>
                        {eq.urgencia === 'sin_registro'
                          ? <AlertTriangle size={14} />
                          : <Clock size={14} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {eq.placa} — {eq.marca ?? ''} {eq.modelo ?? ''}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {eq.usuario_nombre ?? 'Sin asignar'}{eq.area ? ` · ${eq.area}` : ''}
                        </p>
                        <p className={`text-[10px] font-medium ${eq.urgencia === 'sin_registro' ? 'text-red-500' : 'text-orange-500'}`}>
                          {eq.urgencia === 'sin_registro'
                            ? 'Sin mantenimiento registrado'
                            : `Vencido hace ${eq.dias_vencido} día(s)`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {mant.total > 6 && (
                <div className="px-4 py-2.5 bg-slate-50 border-t text-center">
                  <span className="text-xs text-slate-500">
                    +{mant.total - 6} más · Ver detalles en el Dashboard
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700">{authUser?.nombre ?? 'Usuario'}</p>
            <p className="text-xs text-slate-400 capitalize">{authUser?.rol ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="ml-1 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

