-- =========================================================
-- MIGRACIÓN: Tabla usuarios_sistema (Login / Autenticación)
-- Ejecutar en phpMyAdmin o consola MySQL
-- =========================================================

USE inventory_system;

CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id             VARCHAR(36)   NOT NULL PRIMARY KEY,
  username       VARCHAR(100)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,
  rol            ENUM('admin','gestor') NOT NULL DEFAULT 'gestor',
  nombre         VARCHAR(150),
  email          VARCHAR(150),
  usuario_id     VARCHAR(36),
  activo         TINYINT(1)    NOT NULL DEFAULT 1,
  ultimo_acceso  TIMESTAMP     NULL,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sysuser_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_sysuser_username ON usuarios_sistema(username);
CREATE INDEX IF NOT EXISTS idx_sysuser_rol      ON usuarios_sistema(rol);

-- ─── Usuario admin por defecto ────────────────────────────
-- Credenciales: admin / admin123
-- CAMBIA la contraseña después del primer inicio de sesión
-- o usa POST /api/auth/setup si la tabla está vacía.
INSERT IGNORE INTO usuarios_sistema
  (id, username, password_hash, rol, nombre, email, activo)
VALUES (
  'sys-admin-001',
  'admin',
  '$2b$12$Lgl6oUA7uLL7sY96sY7mfOvelB6TycVu/RtvYt5BBg1nZgUA1TUAO',
  'admin',
  'Administrador',
  'admin@empresa.com',
  1
);
