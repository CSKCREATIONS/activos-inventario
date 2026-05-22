-- =========================================================
-- MIGRACIÓN: Tabla usuarios (Empleados del sistema)
-- Ejecutar en phpMyAdmin o consola MySQL
-- =========================================================

USE inventory_system;

CREATE TABLE IF NOT EXISTS usuarios (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  nombre            VARCHAR(150)  NOT NULL,
  cargo             VARCHAR(100),
  proceso           VARCHAR(150),
  grupo_asignado    VARCHAR(100),
  area              VARCHAR(150),
  correo            VARCHAR(150),
  ubicacion         VARCHAR(150),
  sede              VARCHAR(150),
  activo            TINYINT(1)    NOT NULL DEFAULT 1,
  fecha_registro    DATE          NOT NULL,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_nombre (nombre),
  INDEX idx_usuarios_area (area),
  INDEX idx_usuarios_sede (sede)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(nombre);
CREATE INDEX IF NOT EXISTS idx_usuarios_area ON usuarios(area);
CREATE INDEX IF NOT EXISTS idx_usuarios_sede ON usuarios(sede);
