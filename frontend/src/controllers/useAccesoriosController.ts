// CONTROLLER: Accesorios
import { useState, useMemo } from 'react';
import { useAccesoriosStore } from '../models/stores/useAccesoriosStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import type { Accesorio } from '../models/types/index';
import { v4 as uuidv4 } from 'uuid';

export function useAccesoriosController() {
  const { accesorios, addAccesorio, updateAccesorio, deleteAccesorio } = useAccesoriosStore();
  const equipos = useEquiposStore((s) => s.equipos);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [selected, setSelected] = useState<Accesorio | null>(null);

  const accesoriosFiltrados = useMemo(() => {
    return accesorios.filter((a) => {
      const b = busqueda.toLowerCase();
      const match = !b || a.nombre.toLowerCase().includes(b) || a.placa?.toLowerCase().includes(b);
      const matchEstado = !filtroEstado || a.estado === filtroEstado;
      return match && matchEstado;
    });
  }, [accesorios, busqueda, filtroEstado]);

  const accesoriosEnriquecidos = useMemo(() => {
    return accesoriosFiltrados.map((a) => ({
      ...a,
      equipo_principal: a.equipo_principal_id
        ? equipos.find((e) => e.id === a.equipo_principal_id)
        : null,
    }));
  }, [accesoriosFiltrados, equipos]);

  const crear = (data: Omit<Accesorio, 'id' | 'fecha_registro'>) => {
    addAccesorio({ ...data, id: uuidv4(), fecha_registro: new Date().toISOString().split('T')[0] });
    setModalAbierto(false);
  };

  const editar = (id: string, data: Partial<Accesorio>) => {
    updateAccesorio(id, data);
    setModalAbierto(false);
  };

  return {
    accesorios: accesoriosEnriquecidos,
    busqueda, setBusqueda,
    filtroEstado, setFiltroEstado,
    modalAbierto, setModalAbierto,
    selected, setSelected,
    equipos,
    crear, editar, deleteAccesorio,
  };
}
