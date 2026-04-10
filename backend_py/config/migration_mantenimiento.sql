-- =========================================================
-- MIGRACIÓN: Agregar campo ultimo_mantenimiento a equipos
-- Ejecutar en phpMyAdmin o consola MySQL
-- =========================================================

USE inventory_system;

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS ultimo_mantenimiento DATE DEFAULT NULL AFTER placa_monitor;
