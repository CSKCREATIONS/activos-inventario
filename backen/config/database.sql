-- =========================================================
-- INVENTORY SYSTEM - Esquema de base de datos MySQL (XAMPP)
-- Ejecutar este script en phpMyAdmin o consola MySQL
-- =========================================================

CREATE DATABASE IF NOT EXISTS inventory_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE inventory_system;

-- ─── USUARIOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  cargo       VARCHAR(100) NOT NULL,
  proceso     VARCHAR(100) NOT NULL,
  grupo_asignado VARCHAR(100) NOT NULL,
  area        VARCHAR(100) NOT NULL,
  correo      VARCHAR(150) NOT NULL UNIQUE,
  ubicacion   VARCHAR(100),
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  fecha_registro DATE       NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── EQUIPOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipos (
  id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
  placa               VARCHAR(50)  NOT NULL UNIQUE,
  serial              VARCHAR(100),
  tipo_equipo         ENUM('Laptop','Desktop','Tablet','Impresora','Celular','Monitor','Servidor','Switch','Router','UPS','Otro') NOT NULL,
  marca               VARCHAR(100),
  modelo              VARCHAR(100),
  sistema_operativo   VARCHAR(100),
  version_so          VARCHAR(50),
  ram                 VARCHAR(50),
  disco               VARCHAR(50),
  tecnologia          VARCHAR(100),
  criticidad          ENUM('Baja','Media','Alta','Crítica') NOT NULL DEFAULT 'Media',
  confidencialidad    ENUM('Pública','Interna','Confidencial','Restringida') NOT NULL DEFAULT 'Interna',
  estado              ENUM('Disponible','Asignado','Dañado','Baja','En revisión','Rentado') NOT NULL DEFAULT 'Disponible',
  fecha_registro      DATE NOT NULL,
  fecha_compra        DATE,
  proveedor           VARCHAR(150),
  costo               DECIMAL(12,2),
  es_rentado          TINYINT(1) NOT NULL DEFAULT 0,
  observaciones       TEXT,
  -- Campos para Hoja de Vida (Laptop/Desktop/All-in-one)
  procesador          VARCHAR(150),
  nombre_equipo       VARCHAR(100),
  licenciamiento_so   VARCHAR(150),
  licenciamiento_office VARCHAR(150),
  marca_monitor       VARCHAR(100),
  placa_monitor       VARCHAR(100),
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ASIGNACIONES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignaciones (
  id                VARCHAR(36)  NOT NULL PRIMARY KEY,
  usuario_id        VARCHAR(36)  NOT NULL,
  equipo_id         VARCHAR(36)  NOT NULL,
  fecha_asignacion  DATE         NOT NULL,
  fecha_devolucion  DATE,
  estado            ENUM('Activa','Devuelta','Extraviada') NOT NULL DEFAULT 'Activa',
  observaciones     TEXT,
  acta_pdf          VARCHAR(255),
  hoja_vida_pdf     VARCHAR(255),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_asig_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asig_equipo  FOREIGN KEY (equipo_id)  REFERENCES equipos(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ACCESORIOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accesorios (
  id                    VARCHAR(36)  NOT NULL PRIMARY KEY,
  nombre                VARCHAR(150) NOT NULL,
  placa                 VARCHAR(50),
  serial                VARCHAR(100),
  equipo_principal_id   VARCHAR(36),
  cantidad              INT          NOT NULL DEFAULT 1,
  estado                ENUM('Disponible','Asignado','Dañado','Baja') NOT NULL DEFAULT 'Disponible',
  observaciones         TEXT,
  fecha_registro        DATE NOT NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_acc_equipo FOREIGN KEY (equipo_principal_id) REFERENCES equipos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── DOCUMENTOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,
  tipo          ENUM('Acta','Hoja de vida','Factura','Garantía','Contrato','Manual','Otro') NOT NULL,
  equipo_id     VARCHAR(36),
  asignacion_id VARCHAR(36),
  usuario_id    VARCHAR(36),
  url           VARCHAR(500) NOT NULL,
  version       INT NOT NULL DEFAULT 1,
  fecha_carga   DATE NOT NULL,
  cargado_por   VARCHAR(150),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_equipo     FOREIGN KEY (equipo_id)     REFERENCES equipos(id)      ON DELETE SET NULL,
  CONSTRAINT fk_doc_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id) ON DELETE SET NULL,
  CONSTRAINT fk_doc_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── USUARIOS DEL SISTEMA (login) ────────────────────────
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id             VARCHAR(36)   NOT NULL PRIMARY KEY,
  username       VARCHAR(100)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,
  rol            ENUM('admin','gestor') NOT NULL DEFAULT 'gestor',
  nombre         VARCHAR(150),
  email          VARCHAR(150),
  usuario_id     VARCHAR(36),
  activo         TINYINT(1)    NOT NULL DEFAULT 1,
  ultimo_acceso  TIMESTAMP     NULL,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sysuser_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── SUMINISTROS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suministros (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  nombre            VARCHAR(200)  NOT NULL,
  tipo              ENUM('Toner','Licencia','Cable','Otro') NOT NULL,
  referencia        VARCHAR(150),
  marca             VARCHAR(100),
  modelo            VARCHAR(150),
  cantidad          INT           NOT NULL DEFAULT 0,
  cantidad_minima   INT           NOT NULL DEFAULT 1,
  estado            ENUM('Disponible','Agotado','Reservado','Baja') NOT NULL DEFAULT 'Disponible',
  equipo_id         VARCHAR(36),
  proveedor         VARCHAR(150),
  fecha_vencimiento DATE,
  costo             DECIMAL(12,2),
  observaciones     TEXT,
  fecha_registro    DATE          NOT NULL,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sum_equipo FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ÍNDICES ──────────────────────────────────────────────
CREATE INDEX idx_equipos_estado       ON equipos(estado);
CREATE INDEX idx_equipos_tipo         ON equipos(tipo_equipo);
CREATE INDEX idx_asignaciones_estado  ON asignaciones(estado);
CREATE INDEX idx_asignaciones_equipo  ON asignaciones(equipo_id);
CREATE INDEX idx_asignaciones_usuario ON asignaciones(usuario_id);
CREATE INDEX idx_documentos_equipo    ON documentos(equipo_id);
CREATE INDEX idx_suministros_tipo     ON suministros(tipo);
CREATE INDEX idx_suministros_estado   ON suministros(estado);

-- ─── DATOS DE EJEMPLO (opcional) ──────────────────────────
INSERT INTO usuarios (id, nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion, activo, fecha_registro) VALUES
('u1','Daniel Jiménez','Asesor','Servicio al Cliente','Grupo A','Servicio al Cliente','daniel.jimenez@empresa.com','Piso 2',1,'2023-01-10'),
('u2','Laura Martínez','Coordinadora','Recursos Humanos','Grupo B','Recursos Humanos','laura.martinez@empresa.com','Piso 3',1,'2023-02-15'),
('u3','Carlos Rodríguez','Analista IT','Tecnología','Grupo TI','Tecnología','carlos.rodriguez@empresa.com','Piso 1',1,'2022-11-01'),
('u4','Andrea Gómez','Directora','Gerencia','Directivo','Gerencia','andrea.gomez@empresa.com','Piso 5',1,'2021-06-20'),
('u5','Felipe Torres','Contador','Financiero','Grupo F','Financiero','felipe.torres@empresa.com','Piso 2',1,'2023-03-08'),
('u6','Valentina Cruz','Asesora Comercial','Ventas','Grupo V','Comercial','valentina.cruz@empresa.com','Piso 4',0,'2022-09-12');

INSERT INTO equipos (id, placa, serial, tipo_equipo, marca, modelo, sistema_operativo, version_so, ram, disco, criticidad, confidencialidad, estado, fecha_registro, proveedor, costo, es_rentado) VALUES
('e1','EAC000037','SN20190037','Laptop','Lenovo','ThinkPad L14','Windows 11','23H2','16 GB','512 GB SSD','Alta','Confidencial','Asignado','2022-01-15','TechCorp SAS',3500000,0),
('e2','EAC000137','SN20210137','Laptop','Dell','Latitude 5420','Windows 11','22H2','8 GB','256 GB SSD','Alta','Interna','Asignado','2022-03-20',NULL,NULL,0),
('e3','EAC000205','SN20220205','Desktop','HP','ProDesk 405','Windows 10','21H2','8 GB','1 TB HDD','Media','Interna','Disponible','2022-06-01',NULL,NULL,0),
('e4','EAC000312','SN20230312','Laptop','HP','ProBook 450','Windows 11','23H2','16 GB','512 GB SSD','Alta','Confidencial','Disponible','2023-01-05',NULL,NULL,0),
('e5','EAC000089','SN20180089','Impresora','HP','LaserJet Pro M404dn',NULL,NULL,NULL,NULL,'Baja','Pública','Asignado','2020-08-15',NULL,NULL,0),
('e6','EAC000401','SN20230401','Laptop','Apple','MacBook Pro 14"','macOS','Sonoma 14','16 GB','512 GB SSD','Crítica','Restringida','Asignado','2023-07-10','Apple Colombia',NULL,0),
('e7','EAC000510','SN20240510','Tablet','Samsung','Galaxy Tab S8','Android','13',NULL,NULL,'Media','Interna','En revisión','2024-02-01',NULL,NULL,0),
('e8','RENT-001','SN-RENT-001','Laptop','Lenovo','ThinkBook 14','Windows 11',NULL,'8 GB','256 GB SSD','Media','Interna','Asignado','2024-01-15','Renta Equipos Ltda',NULL,1),
('e9','EAC000003','SN20150003','Desktop','Dell','OptiPlex 3070','Windows 10',NULL,'4 GB','500 GB HDD','Baja','Pública','Baja','2015-05-20',NULL,NULL,0),
('e10','EAC000620','SN20240620','Monitor','LG','27" 4K',NULL,NULL,NULL,NULL,'Baja','Pública','Disponible','2024-03-01',NULL,NULL,0);

INSERT INTO asignaciones (id, usuario_id, equipo_id, fecha_asignacion, estado, acta_pdf, hoja_vida_pdf) VALUES
('a1','u1','e1','2022-02-01','Activa','acta_daniel_EAC000037.pdf','hv_EAC000037.pdf'),
('a2','u1','e5','2022-02-01','Activa','acta_daniel_EAC000089.pdf',NULL),
('a3','u2','e2','2022-04-10','Activa','acta_laura_EAC000137.pdf','hv_EAC000137.pdf'),
('a4','u3','e6','2023-07-15','Activa',NULL,NULL),
('a5','u4','e8','2024-01-20','Activa','acta_andrea_RENT001.pdf',NULL);

INSERT INTO asignaciones (id, usuario_id, equipo_id, fecha_asignacion, fecha_devolucion, estado, observaciones) VALUES
('a6','u5','e7','2024-02-05','2024-03-01','Devuelta','Devuelto para mantenimiento');

INSERT INTO accesorios (id, nombre, placa, equipo_principal_id, cantidad, estado, fecha_registro) VALUES
('ac1','Adaptador de red USB','ACC-RED-001','e1',1,'Asignado','2022-02-01'),
('ac2','Mouse inalámbrico','ACC-MOU-012','e2',1,'Asignado','2022-04-10'),
('ac3','Base portátil','ACC-BASE-003',NULL,1,'Disponible','2023-01-05'),
('ac5','Teclado USB','ACC-TEC-008',NULL,1,'Dañado','2021-06-15'),
('ac6','Audífonos con micrófono','ACC-AUD-021','e4',1,'Disponible','2023-01-05');

INSERT INTO accesorios (id, nombre, cantidad, estado, fecha_registro) VALUES
('ac4','Cable HDMI',5,'Disponible','2022-01-01');

INSERT INTO documentos (id, nombre, tipo, equipo_id, asignacion_id, usuario_id, url, version, fecha_carga, cargado_por) VALUES
('d1','Acta entrega EAC000037','Acta','e1','a1','u1','/uploads/acta_daniel_EAC000037.pdf',1,'2022-02-01','Carlos Rodríguez'),
('d2','Hoja de vida EAC000037','Hoja de vida','e1',NULL,NULL,'/uploads/hv_EAC000037.pdf',2,'2023-06-01','Carlos Rodríguez'),
('d3','Acta entrega EAC000137','Acta','e2','a3','u2','/uploads/acta_laura_EAC000137.pdf',1,'2022-04-10','Carlos Rodríguez'),
('d4','Factura MacBook Pro','Factura','e6',NULL,NULL,'/uploads/factura_macbook.pdf',1,'2023-07-10','Carlos Rodríguez'),
('d5','Garantía Dell Latitude','Garantía','e2',NULL,NULL,'/uploads/garantia_dell.pdf',1,'2022-04-10',NULL);

-- ─── SUMINISTROS DE EJEMPLO ───────────────────────────────
-- Toners
INSERT INTO suministros (id, nombre, tipo, referencia, marca, modelo, cantidad, cantidad_minima, estado, equipo_id, proveedor, costo, fecha_registro) VALUES
('s1','Toner Negro HP 26A','Toner','CF226A','HP','LaserJet Pro M402/M426',3,2,'Disponible','e5','TechSupplies SAS',85000,'2024-01-10'),
('s2','Toner Cian Brother TN-310C','Toner','TN-310C','Brother','HL-4150CDN',1,2,'Disponible',NULL,'Suministros Bogotá',92000,'2024-02-05'),
('s3','Toner Negro Samsung MLT-D101S','Toner','MLT-D101S','Samsung','ML-2160/SCX-3405',0,1,'Agotado',NULL,'TechSupplies SAS',67000,'2023-11-20');

-- Licencias
INSERT INTO suministros (id, nombre, tipo, referencia, marca, modelo, cantidad, cantidad_minima, estado, equipo_id, proveedor, costo, fecha_vencimiento, observaciones, fecha_registro) VALUES
('s4','Microsoft Office 365 Business','Licencia','OFF365-BUS','Microsoft','Office 365',10,5,'Disponible',NULL,'Microsoft Colombia',2800000,'2027-03-01','Licencia anual corporativa - 10 usuarios','2024-03-01'),
('s5','Windows 11 Pro OEM','Licencia','WIN11-PRO-OEM','Microsoft','Windows 11 Pro',5,2,'Disponible',NULL,'TechCorp SAS',450000,'2029-12-31','Licencias OEM vinculadas a hardware','2023-06-15'),
('s6','Antivirus ESET Endpoint Security','Licencia','ESET-EES-1Y','ESET','Endpoint Security',15,5,'Disponible',NULL,'Seguridad Digital Ltda',320000,'2027-01-15','Renovación anual - 15 equipos','2024-01-15'),
('s7','Adobe Acrobat Pro DC','Licencia','ACRO-PRO-1Y','Adobe','Acrobat Pro DC',2,1,'Disponible',NULL,'Adobe Colombia',890000,'2027-02-28','Licencia suscripción anual','2024-02-28');

-- Cables
INSERT INTO suministros (id, nombre, tipo, referencia, marca, modelo, cantidad, cantidad_minima, estado, equipo_id, proveedor, costo, observaciones, fecha_registro) VALUES
('s8','Cable HDMI 2.0 1.8m','Cable','CAB-HDMI-18','Ugreen','HDMI 2.0',8,3,'Disponible',NULL,'Cables y Más',25000,'4K@60Hz, alta velocidad','2024-01-20'),
('s9','Cable USB-A a USB-B para impresora','Cable','CAB-USB-AB-2M','Anker','USB 2.0',4,2,'Disponible','e5','Cables y Más',15000,'Longitud 2m','2024-01-20'),
('s10','Cable DisplayPort 1.4 1.5m','Cable','CAB-DP-15','Ugreen','DisplayPort 1.4',3,2,'Disponible',NULL,'Suministros Bogotá',32000,'Soporte 4K@144Hz','2024-03-01'),
('s11','Cable de red Cat6 Patch 2m','Cable','CAB-CAT6-2M','APC','Cat6',12,5,'Disponible',NULL,'Cables y Más',8000,'RJ45 blindado','2023-09-10'),
('s12','Cable USB-C a USB-C 1m','Cable','CAB-USBC-1M','Anker','USB-C 3.1',6,3,'Disponible',NULL,'TechCorp SAS',22000,'100W carga rápida','2024-02-15');

-- ─── USUARIO ADMIN POR DEFECTO ────────────────────────────
-- Contraseña: admin123  (hash bcrypt generado con passlib cost=12)
-- CAMBIA la contraseña después del primer inicio de sesión.
-- Si necesitas regenerarla: POST /api/auth/setup  (solo funciona si la tabla está vacía)
INSERT INTO usuarios_sistema (id, username, password_hash, rol, nombre, email, activo)
VALUES (
  'sys-admin-001',
  'admin',
  '$2b$12$Lgl6oUA7uLL7sY96sY7mfOvelB6TycVu/RtvYt5BBg1nZgUA1TUAO',
  'admin',
  'Administrador',
  'admin@empresa.com',
  1
);
