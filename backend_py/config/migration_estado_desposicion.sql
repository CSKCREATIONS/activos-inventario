-- =========================================================
-- MIGRACION: Agregar estado Desposicion a equipos
-- Ejecutar en phpMyAdmin o consola MySQL si la columna estado es ENUM
-- =========================================================

USE inventory_system;

ALTER TABLE equipos
  MODIFY COLUMN estado ENUM(
    'Disponible',
    'Asignado',
    'Dañado',
    'Baja',
    'En revisión',
    'Rentado',
    'Desposicion'
  ) NOT NULL DEFAULT 'Disponible';
