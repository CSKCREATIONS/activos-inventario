-- =========================================================
-- MIGRACIÓN: Tabla suministros (Toners, Licencias, Cables)
-- Ejecutar en phpMyAdmin o consola MySQL
-- =========================================================

USE inventory_system;

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

CREATE INDEX IF NOT EXISTS idx_suministros_tipo   ON suministros(tipo);
CREATE INDEX IF NOT EXISTS idx_suministros_estado ON suministros(estado);
