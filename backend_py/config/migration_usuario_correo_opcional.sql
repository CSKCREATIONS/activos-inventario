-- =========================================================
-- MIGRACION: Permitir usuarios sin correo electronico
-- Ejecutar en phpMyAdmin o consola MySQL si la columna correo es NOT NULL
-- =========================================================

USE inventory_system;

ALTER TABLE usuarios
  MODIFY COLUMN correo VARCHAR(150) NULL DEFAULT NULL;
