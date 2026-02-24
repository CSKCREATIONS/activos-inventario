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

-- ─── ÍNDICES ──────────────────────────────────────────────
CREATE INDEX idx_equipos_estado      ON equipos(estado);
CREATE INDEX idx_equipos_tipo        ON equipos(tipo_equipo);
CREATE INDEX idx_asignaciones_estado ON asignaciones(estado);
CREATE INDEX idx_asignaciones_equipo ON asignaciones(equipo_id);
CREATE INDEX idx_asignaciones_usuario ON asignaciones(usuario_id);
CREATE INDEX idx_documentos_equipo   ON documentos(equipo_id);

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
