// CONTROLLER: Documentos
import { useState, useMemo } from 'react';
import { useDocumentosStore } from '../models/stores/useAccesoriosStore';
import { useEquiposStore } from '../models/stores/useEquiposStore';
import { useUsuariosStore } from '../models/stores/useUsuariosStore';
import type { Documento, TipoDocumento } from '../models/types/index';
import { v4 as uuidv4 } from 'uuid';

export function useDocumentosController() {
  const { documentos, addDocumento, deleteDocumento } = useDocumentosStore();
  const equipos = useEquiposStore((s) => s.equipos);
  const usuarios = useUsuariosStore((s) => s.usuarios);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | ''>('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const documentosEnriquecidos = useMemo(() => {
    return documentos
      .filter((d) => {
        const b = busqueda.toLowerCase();
        const match = !b || d.nombre.toLowerCase().includes(b);
        const matchTipo = !filtroTipo || d.tipo === filtroTipo;
        return match && matchTipo;
      })
      .map((d) => ({
        ...d,
        equipo: d.equipo_id ? equipos.find((e) => e.id === d.equipo_id) : null,
        usuario: d.usuario_id ? usuarios.find((u) => u.id === d.usuario_id) : null,
      }));
  }, [documentos, busqueda, filtroTipo, equipos, usuarios]);

  const subir = (data: Omit<Documento, 'id' | 'fecha_carga' | 'version'>) => {
    const existente = documentos.find(
      (d) => d.tipo === data.tipo && d.equipo_id === data.equipo_id
    );
    const nuevo: Documento = {
      ...data,
      id: uuidv4(),
      fecha_carga: new Date().toISOString().split('T')[0],
      version: existente ? existente.version + 1 : 1,
    };
    addDocumento(nuevo);
    setModalAbierto(false);
  };

  return {
    documentos: documentosEnriquecidos,
    busqueda, setBusqueda,
    filtroTipo, setFiltroTipo,
    modalAbierto, setModalAbierto,
    equipos, usuarios,
    subir, deleteDocumento,
  };
}
