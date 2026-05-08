/*
Simple seed script to insert or update an admin user in the MySQL DB used by the Python backend.
Usage: node seed.js --username admin --password admin123
Environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (defaults to backend_py/.env)
*/

const mysql = require('mysql2/promise');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const crypto = require('crypto');

const argv = yargs(hideBin(process.argv))
  .option('username', { type: 'string', demandOption: true })
  .option('password', { type: 'string', demandOption: true })
  .argv;

const env = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'inventory_system',
};

async function pbkdf2_sha256_hash(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 260000;
  const dk = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  // Format similar to passlib's pbkdf2_sha256: $pbkdf2-sha256$<rounds>$<salt>$<hash>
  return `$pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${dk.toString('base64')}`;
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    const username = argv.username;
    const password = argv.password;
    const hashed = await pbkdf2_sha256_hash(password);

    // Ensure table exists (same DDL used by Python model)
    await conn.execute(`CREATE TABLE IF NOT EXISTS usuarios_sistema (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      rol ENUM('admin','gestor') NOT NULL DEFAULT 'gestor',
      nombre VARCHAR(150),
      email VARCHAR(150),
      usuario_id VARCHAR(36),
      activo TINYINT(1) NOT NULL DEFAULT 1,
      ultimo_acceso TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Upsert admin user
    const id = require('uuid').v4();
    const [rows] = await conn.execute('SELECT id FROM usuarios_sistema WHERE username = ? LIMIT 1', [username]);
    if (rows.length > 0) {
      await conn.execute('UPDATE usuarios_sistema SET password_hash = ?, rol = ?, activo = 1 WHERE username = ?', [hashed, 'admin', username]);
      console.log(`Updated user '${username}' (set as admin).`);
    } else {
      await conn.execute('INSERT INTO usuarios_sistema (id, username, password_hash, rol, nombre, email, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, username, hashed, 'admin', 'Seed Admin', null, null]);
      console.log(`Created user '${username}' with role admin.`);
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
