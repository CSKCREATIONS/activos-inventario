// VIEW: Header — responsive con hamburger para móvil
import { Bell, User, Menu } from 'lucide-react';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  onMenuClick: () => void;
}

export function Header({ titulo, subtitulo, onMenuClick }: HeaderProps) {
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
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700">Admin</p>
            <p className="text-xs text-slate-400">Tecnología</p>
          </div>
        </div>
      </div>
    </header>
  );
}
