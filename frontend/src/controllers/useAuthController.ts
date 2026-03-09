// CONTROLLER: Lógica de autenticación
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../models/stores/useAuthStore';
import { authApi } from '../services/api';

export function useAuthController() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);
  const logout   = useAuthStore((s) => s.logout);
  const navigate  = useNavigate();

  async function login(username: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(username, password);
      setAuth(data.access_token, data.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return { login, handleLogout, loading, error };
}
