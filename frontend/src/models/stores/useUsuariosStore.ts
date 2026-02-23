import { create } from 'zustand';
import type { Usuario } from '../types/index';
import { mockUsuarios } from '../data/mockData';

interface UsuariosState {
  usuarios: Usuario[];
  selectedUsuario: Usuario | null;
  setSelectedUsuario: (u: Usuario | null) => void;
  addUsuario: (u: Usuario) => void;
  updateUsuario: (id: string, data: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;
}

export const useUsuariosStore = create<UsuariosState>((set) => ({
  usuarios: mockUsuarios,
  selectedUsuario: null,
  setSelectedUsuario: (u) => set({ selectedUsuario: u }),
  addUsuario: (u) => set((s) => ({ usuarios: [...s.usuarios, u] })),
  updateUsuario: (id, data) =>
    set((s) => ({
      usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ...data } : u)),
    })),
  deleteUsuario: (id) =>
    set((s) => ({ usuarios: s.usuarios.filter((u) => u.id !== id) })),
}));
