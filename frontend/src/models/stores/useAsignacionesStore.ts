import { create } from 'zustand';
import type { Asignacion } from '../types/index';
import { mockAsignaciones } from '../data/mockData';

interface AsignacionesState {
  asignaciones: Asignacion[];
  addAsignacion: (a: Asignacion) => void;
  updateAsignacion: (id: string, data: Partial<Asignacion>) => void;
  devolverEquipo: (id: string, fecha: string) => void;
}

export const useAsignacionesStore = create<AsignacionesState>((set) => ({
  asignaciones: mockAsignaciones,
  addAsignacion: (a) => set((s) => ({ asignaciones: [...s.asignaciones, a] })),
  updateAsignacion: (id, data) =>
    set((s) => ({
      asignaciones: s.asignaciones.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),
  devolverEquipo: (id, fecha) =>
    set((s) => ({
      asignaciones: s.asignaciones.map((a) =>
        a.id === id ? { ...a, estado: 'Devuelta', fecha_devolucion: fecha } : a
      ),
    })),
}));
