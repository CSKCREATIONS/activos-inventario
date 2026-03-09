// VIEW: Página de inicio de sesión
import { useState } from 'react';
import { Monitor, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthController } from '../../../controllers/useAuthController';

export function LoginPage() {
  const { login, loading, error } = useAuthController();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    login(username.trim(), password);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      {/* Card central */}
      <div className="w-full max-w-md">

        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Monitor size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ITAM</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestión de Inventario TI</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Usuario */}
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} — Área de Tecnología
        </p>
      </div>
    </div>
  );
}
