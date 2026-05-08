-- =========================================================
-- MIGRACIÓN: Acta de entrega + checklist accesorios (Asignaciones)
-- Ejecutar en phpMyAdmin o consola MySQL si la BD ya existe
-- =========================================================

USE inventory_system;

ALTER TABLE asignaciones
  ADD COLUMN IF NOT EXISTS accesorios_entregados TEXT DEFAULT NULL AFTER observaciones,
  ADD COLUMN IF NOT EXISTS acta_pdf             VARCHAR(255) DEFAULT NULL AFTER accesorios_entregados,
  ADD COLUMN IF NOT EXISTS hoja_vida_pdf        VARCHAR(255) DEFAULT NULL AFTER acta_pdf;
