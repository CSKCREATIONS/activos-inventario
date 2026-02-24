import { create } from 'zustand';
import type { Equipo } from '../types/index';

interface EquiposState {
  equipos: Equipo[];
  selectedEquipo: Equipo | null;
  setEquipos: (equipos: Equipo[]) => void;
  setSelectedEquipo: (equipo: Equipo | null) => void;
  addEquipo: (equipo: Equipo) => void;
  updateEquipo: (id: string, data: Partial<Equipo>) => void;
  deleteEquipo: (id: string) => void;
}

export const useEquiposStore = create<EquiposState>((set) => ({
  equipos: [],
  setEquipos: (equipos) => set({ equipos }),
  selectedEquipo: null,
  setSelectedEquipo: (equipo) => set({ selectedEquipo: equipo }),
  addEquipo: (equipo) => set((s) => ({ equipos: [...s.equipos, equipo] })),
  updateEquipo: (id, data) =>
    set((s) => ({
      equipos: s.equipos.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),
  deleteEquipo: (id) =>
    set((s) => ({ equipos: s.equipos.filter((e) => e.id !== id) })),
}));
