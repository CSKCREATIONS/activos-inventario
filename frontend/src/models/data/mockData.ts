import type { Usuario, Equipo, Asignacion, Accesorio, Documento } from '../types';

export const mockUsuarios: Usuario[] = [
  { id: 'u1', nombre: 'Daniel Jiménez', cargo: 'Asesor', proceso: 'Servicio al Cliente', grupo_asignado: 'Grupo A', area: 'Servicio al Cliente', correo: 'daniel.jimenez@empresa.com', ubicacion: 'Piso 2', activo: true, fecha_registro: '2023-01-10' },
  { id: 'u2', nombre: 'Laura Martínez', cargo: 'Coordinadora', proceso: 'Recursos Humanos', grupo_asignado: 'Grupo B', area: 'Recursos Humanos', correo: 'laura.martinez@empresa.com', ubicacion: 'Piso 3', activo: true, fecha_registro: '2023-02-15' },
  { id: 'u3', nombre: 'Carlos Rodríguez', cargo: 'Analista IT', proceso: 'Tecnología', grupo_asignado: 'Grupo TI', area: 'Tecnología', correo: 'carlos.rodriguez@empresa.com', ubicacion: 'Piso 1', activo: true, fecha_registro: '2022-11-01' },
  { id: 'u4', nombre: 'Andrea Gómez', cargo: 'Directora', proceso: 'Gerencia', grupo_asignado: 'Directivo', area: 'Gerencia', correo: 'andrea.gomez@empresa.com', ubicacion: 'Piso 5', activo: true, fecha_registro: '2021-06-20' },
  { id: 'u5', nombre: 'Felipe Torres', cargo: 'Contador', proceso: 'Financiero', grupo_asignado: 'Grupo F', area: 'Financiero', correo: 'felipe.torres@empresa.com', ubicacion: 'Piso 2', activo: true, fecha_registro: '2023-03-08' },
  { id: 'u6', nombre: 'Valentina Cruz', cargo: 'Asesora Comercial', proceso: 'Ventas', grupo_asignado: 'Grupo V', area: 'Comercial', correo: 'valentina.cruz@empresa.com', ubicacion: 'Piso 4', activo: false, fecha_registro: '2022-09-12' },
];

export const mockEquipos: Equipo[] = [
  { id: 'e1', placa: 'EAC000037', serial: 'SN20190037', tipo_equipo: 'Laptop', marca: 'Lenovo', modelo: 'ThinkPad L14', sistema_operativo: 'Windows 11', version_so: '23H2', ram: '16 GB', disco: '512 GB SSD', criticidad: 'Alta', confidencialidad: 'Confidencial', estado: 'Asignado', fecha_registro: '2022-01-15', fecha_compra: '2022-01-10', proveedor: 'TechCorp SAS', costo: 3500000, es_rentado: false },
  { id: 'e2', placa: 'EAC000137', serial: 'SN20210137', tipo_equipo: 'Laptop', marca: 'Dell', modelo: 'Latitude 5420', sistema_operativo: 'Windows 11', version_so: '22H2', ram: '8 GB', disco: '256 GB SSD', criticidad: 'Alta', confidencialidad: 'Interna', estado: 'Asignado', fecha_registro: '2022-03-20', es_rentado: false },
  { id: 'e3', placa: 'EAC000205', serial: 'SN20220205', tipo_equipo: 'Desktop', marca: 'HP', modelo: 'ProDesk 405', sistema_operativo: 'Windows 10', version_so: '21H2', ram: '8 GB', disco: '1 TB HDD', criticidad: 'Media', confidencialidad: 'Interna', estado: 'Disponible', fecha_registro: '2022-06-01', es_rentado: false },
  { id: 'e4', placa: 'EAC000312', serial: 'SN20230312', tipo_equipo: 'Laptop', marca: 'HP', modelo: 'ProBook 450', sistema_operativo: 'Windows 11', version_so: '23H2', ram: '16 GB', disco: '512 GB SSD', criticidad: 'Alta', confidencialidad: 'Confidencial', estado: 'Disponible', fecha_registro: '2023-01-05', es_rentado: false },
  { id: 'e5', placa: 'EAC000089', serial: 'SN20180089', tipo_equipo: 'Impresora', marca: 'HP', modelo: 'LaserJet Pro M404dn', criticidad: 'Baja', confidencialidad: 'Pública', estado: 'Asignado', fecha_registro: '2020-08-15', es_rentado: false },
  { id: 'e6', placa: 'EAC000401', serial: 'SN20230401', tipo_equipo: 'Laptop', marca: 'Apple', modelo: 'MacBook Pro 14"', sistema_operativo: 'macOS', version_so: 'Sonoma 14', ram: '16 GB', disco: '512 GB SSD', criticidad: 'Crítica', confidencialidad: 'Restringida', estado: 'Asignado', fecha_registro: '2023-07-10', proveedor: 'Apple Colombia', es_rentado: false },
  { id: 'e7', placa: 'EAC000510', serial: 'SN20240510', tipo_equipo: 'Tablet', marca: 'Samsung', modelo: 'Galaxy Tab S8', sistema_operativo: 'Android', version_so: '13', criticidad: 'Media', confidencialidad: 'Interna', estado: 'En revisión', fecha_registro: '2024-02-01', es_rentado: false },
  { id: 'e8', placa: 'RENT-001', serial: 'SN-RENT-001', tipo_equipo: 'Laptop', marca: 'Lenovo', modelo: 'ThinkBook 14', sistema_operativo: 'Windows 11', ram: '8 GB', disco: '256 GB SSD', criticidad: 'Media', confidencialidad: 'Interna', estado: 'Asignado', fecha_registro: '2024-01-15', proveedor: 'Renta Equipos Ltda', es_rentado: true },
  { id: 'e9', placa: 'EAC000003', serial: 'SN20150003', tipo_equipo: 'Desktop', marca: 'Dell', modelo: 'OptiPlex 3070', sistema_operativo: 'Windows 10', ram: '4 GB', disco: '500 GB HDD', criticidad: 'Baja', confidencialidad: 'Pública', estado: 'Baja', fecha_registro: '2015-05-20', es_rentado: false, observaciones: 'Equipo en baja por obsolescencia' },
  { id: 'e10', placa: 'EAC000620', serial: 'SN20240620', tipo_equipo: 'Monitor', marca: 'LG', modelo: '27" 4K', criticidad: 'Baja', confidencialidad: 'Pública', estado: 'Disponible', fecha_registro: '2024-03-01', es_rentado: false },
];

export const mockAsignaciones: Asignacion[] = [
  { id: 'a1', usuario_id: 'u1', equipo_id: 'e1', fecha_asignacion: '2022-02-01', estado: 'Activa', acta_pdf: 'acta_daniel_EAC000037.pdf', hoja_vida_pdf: 'hv_EAC000037.pdf' },
  { id: 'a2', usuario_id: 'u1', equipo_id: 'e5', fecha_asignacion: '2022-02-01', estado: 'Activa', acta_pdf: 'acta_daniel_EAC000089.pdf' },
  { id: 'a3', usuario_id: 'u2', equipo_id: 'e2', fecha_asignacion: '2022-04-10', estado: 'Activa', acta_pdf: 'acta_laura_EAC000137.pdf', hoja_vida_pdf: 'hv_EAC000137.pdf' },
  { id: 'a4', usuario_id: 'u3', equipo_id: 'e6', fecha_asignacion: '2023-07-15', estado: 'Activa' },
  { id: 'a5', usuario_id: 'u4', equipo_id: 'e8', fecha_asignacion: '2024-01-20', estado: 'Activa', acta_pdf: 'acta_andrea_RENT001.pdf' },
  { id: 'a6', usuario_id: 'u5', equipo_id: 'e7', fecha_asignacion: '2024-02-05', fecha_devolucion: '2024-03-01', estado: 'Devuelta', observaciones: 'Devuelto para mantenimiento' },
];

export const mockAccesorios: Accesorio[] = [
  { id: 'ac1', nombre: 'Adaptador de red USB', placa: 'ACC-RED-001', equipo_principal_id: 'e1', cantidad: 1, estado: 'Asignado', fecha_registro: '2022-02-01' },
  { id: 'ac2', nombre: 'Mouse inalámbrico', placa: 'ACC-MOU-012', equipo_principal_id: 'e2', cantidad: 1, estado: 'Asignado', fecha_registro: '2022-04-10' },
  { id: 'ac3', nombre: 'Base portátil', placa: 'ACC-BASE-003', cantidad: 1, estado: 'Disponible', fecha_registro: '2023-01-05' },
  { id: 'ac4', nombre: 'Cable HDMI', cantidad: 5, estado: 'Disponible', fecha_registro: '2022-01-01' },
  { id: 'ac5', nombre: 'Teclado USB', placa: 'ACC-TEC-008', cantidad: 1, estado: 'Dañado', fecha_registro: '2021-06-15', observaciones: 'Tecla espaciadora dañada' },
  { id: 'ac6', nombre: 'Audífonos con micrófono', placa: 'ACC-AUD-021', equipo_principal_id: 'e4', cantidad: 1, estado: 'Disponible', fecha_registro: '2023-01-05' },
];

export const mockDocumentos: Documento[] = [
  { id: 'd1', nombre: 'Acta entrega EAC000037', tipo: 'Acta', equipo_id: 'e1', asignacion_id: 'a1', usuario_id: 'u1', url: '/docs/acta_daniel_EAC000037.pdf', version: 1, fecha_carga: '2022-02-01', cargado_por: 'Carlos Rodríguez' },
  { id: 'd2', nombre: 'Hoja de vida EAC000037', tipo: 'Hoja de vida', equipo_id: 'e1', url: '/docs/hv_EAC000037.pdf', version: 2, fecha_carga: '2023-06-01', cargado_por: 'Carlos Rodríguez' },
  { id: 'd3', nombre: 'Acta entrega EAC000137', tipo: 'Acta', equipo_id: 'e2', asignacion_id: 'a3', usuario_id: 'u2', url: '/docs/acta_laura_EAC000137.pdf', version: 1, fecha_carga: '2022-04-10', cargado_por: 'Carlos Rodríguez' },
  { id: 'd4', nombre: 'Factura MacBook Pro', tipo: 'Factura', equipo_id: 'e6', url: '/docs/factura_macbook.pdf', version: 1, fecha_carga: '2023-07-10', cargado_por: 'Carlos Rodríguez' },
  { id: 'd5', nombre: 'Garantía Dell Latitude', tipo: 'Garantía', equipo_id: 'e2', url: '/docs/garantia_dell.pdf', version: 1, fecha_carga: '2022-04-10' },
];
