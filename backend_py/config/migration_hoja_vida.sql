-- =========================================================
-- MIGRACIÓN: Agregar columnas para Hoja de Vida de Equipos
-- Ejecutar en phpMyAdmin o consola MySQL si la BD ya existe
-- =========================================================

USE inventory_system;

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS procesador           VARCHAR(150)  DEFAULT NULL AFTER observaciones,
  ADD COLUMN IF NOT EXISTS nombre_equipo        VARCHAR(100)  DEFAULT NULL AFTER procesador,
  ADD COLUMN IF NOT EXISTS licenciamiento_so    VARCHAR(150)  DEFAULT NULL AFTER nombre_equipo,
  ADD COLUMN IF NOT EXISTS licenciamiento_office VARCHAR(150) DEFAULT NULL AFTER licenciamiento_so,
  ADD COLUMN IF NOT EXISTS marca_monitor        VARCHAR(100)  DEFAULT NULL AFTER licenciamiento_office,
  ADD COLUMN IF NOT EXISTS placa_monitor        VARCHAR(100)  DEFAULT NULL AFTER marca_monitor;
