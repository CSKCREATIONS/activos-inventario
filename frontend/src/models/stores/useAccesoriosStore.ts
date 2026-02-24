import { create } from 'zustand';
import type { Accesorio, Documento } from '../types/index';

interface AccesoriosState {
  accesorios: Accesorio[];
  setAccesorios: (accesorios: Accesorio[]) => void;
  addAccesorio: (a: Accesorio) => void;
  updateAccesorio: (id: string, data: Partial<Accesorio>) => void;
  deleteAccesorio: (id: string) => void;
}

export const useAccesoriosStore = create<AccesoriosState>((set) => ({
  accesorios: [],
  setAccesorios: (accesorios) => set({ accesorios }),
  addAccesorio: (a) => set((s) => ({ accesorios: [...s.accesorios, a] })),
  updateAccesorio: (id, data) =>
    set((s) => ({ accesorios: s.accesorios.map((a) => (a.id === id ? { ...a, ...data } : a)) })),
  deleteAccesorio: (id) =>
    set((s) => ({ accesorios: s.accesorios.filter((a) => a.id !== id) })),
}));

interface DocumentosState {
  documentos: Documento[];
  setDocumentos: (documentos: Documento[]) => void;
  addDocumento: (d: Documento) => void;
  deleteDocumento: (id: string) => void;
}

export const useDocumentosStore = create<DocumentosState>((set) => ({
  documentos: [],
  setDocumentos: (documentos) => set({ documentos }),
  addDocumento: (d) => set((s) => ({ documentos: [...s.documentos, d] })),
  deleteDocumento: (id) =>
    set((s) => ({ documentos: s.documentos.filter((d) => d.id !== id) })),
}));
