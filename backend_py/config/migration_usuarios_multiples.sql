-- Permitir múltiples usuarios asignados a una asignación
-- Agrega columna usuarios_ids para almacenar IDs de usuarios como JSON

ALTER TABLE asignaciones ADD COLUMN usuarios_ids LONGTEXT DEFAULT NULL COMMENT 'JSON con IDs de usuarios adicionales asignados';

-- Por ahora, copiar el usuario_id actual a usuarios_ids para compatibilidad
UPDATE asignaciones SET usuarios_ids = JSON_ARRAY(usuario_id) WHERE usuario_id IS NOT NULL AND usuarios_ids IS NULL;
