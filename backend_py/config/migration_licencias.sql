-- =========================================================
-- MIGRACIÓN: Sistema de Licencias (2 tablas)
-- Ejecutar en phpMyAdmin o consola MySQL
-- =========================================================

USE inventory_system;

-- ── Tabla 1: Tipos de licencia ────────────────────────────
CREATE TABLE IF NOT EXISTS licencias (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  nombre           VARCHAR(200)  NOT NULL,
  marca            VARCHAR(100),
  modelo           VARCHAR(150),
  cantidad_total   INT           NOT NULL DEFAULT 1,
  cantidad_minima  INT           NOT NULL DEFAULT 1,
  observaciones    TEXT,
  fecha_registro   DATE          NOT NULL,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabla 2: Asignaciones individuales de licencia ────────
CREATE TABLE IF NOT EXISTS licencias_asignadas (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  licencia_id      VARCHAR(36)   NOT NULL,
  serial           VARCHAR(200),
  equipo_id        VARCHAR(36),
  usuario          VARCHAR(200),
  estado           ENUM('Activa','Liberada','Vencida') NOT NULL DEFAULT 'Activa',
  fecha_asignacion DATE          NOT NULL,
  fecha_vencimiento DATE,
  observaciones    TEXT,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lic_asig_licencia FOREIGN KEY (licencia_id) REFERENCES licencias(id) ON DELETE CASCADE,
  CONSTRAINT fk_lic_asig_equipo   FOREIGN KEY (equipo_id)   REFERENCES equipos(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_licencias_asignadas_licencia ON licencias_asignadas(licencia_id);
CREATE INDEX IF NOT EXISTS idx_licencias_asignadas_equipo   ON licencias_asignadas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_licencias_asignadas_estado   ON licencias_asignadas(estado);
