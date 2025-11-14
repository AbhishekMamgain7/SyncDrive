import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = process.env.DB_NAME || 'syncdrive';

let pool;

export async function ensureDatabase() {
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await conn.end();
  }
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function ensureUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      is_locked BOOLEAN DEFAULT FALSE,
      locked_reason TEXT NULL,
      locked_at TIMESTAMP NULL,
      locked_by VARCHAR(36) NULL,
      last_login TIMESTAMP NULL,
      login_attempts INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_role (role),
      INDEX idx_email (email),
      INDEX idx_locked (is_locked)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
    
    // Add new columns if they don't exist (migration for existing tables)
    const columns = [
      { name: 'is_locked', definition: 'BOOLEAN DEFAULT FALSE' },
      { name: 'locked_reason', definition: 'TEXT NULL' },
      { name: 'locked_at', definition: 'TIMESTAMP NULL' },
      { name: 'locked_by', definition: 'VARCHAR(36) NULL' },
      { name: 'last_login', definition: 'TIMESTAMP NULL' },
      { name: 'login_attempts', definition: 'INT DEFAULT 0' }
    ];
    
    // Check which columns exist
    const [existingColumns] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [DB_NAME]
    );
    const existingColumnNames = existingColumns.map(col => col.COLUMN_NAME);
    
    // Add missing columns
    for (const col of columns) {
      if (!existingColumnNames.includes(col.name)) {
        try {
          await conn.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`✓ Added column users.${col.name}`);
        } catch (err) {
          console.error(`Migration error adding ${col.name}:`, err.message);
        }
      }
    }
  } finally {
    conn.release();
  }
}

export async function ensureFilesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type ENUM('file', 'folder') NOT NULL,
      path VARCHAR(1024) NULL,
      size BIGINT NULL,
      mime_type VARCHAR(255) NULL,
      user_id VARCHAR(36) NOT NULL,
      parent_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE,
      INDEX idx_user_parent (user_id, parent_id),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

export async function ensureAuditLogsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      user_name VARCHAR(100) NOT NULL,
      user_email VARCHAR(191) NOT NULL,
      operation_type ENUM('create', 'delete', 'rename', 'upload', 'download', 'share', 'move', 'login', 'logout', 'search') NOT NULL,
      entity_type ENUM('file', 'folder', 'user', 'system') NOT NULL,
      entity_id VARCHAR(255) NULL,
      entity_name VARCHAR(255) NULL,
      parent_folder_id INT NULL,
      parent_folder_name VARCHAR(255) NULL,
      details JSON NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      status ENUM('success', 'failure', 'error') DEFAULT 'success',
      error_message TEXT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user (user_id),
      INDEX idx_operation (operation_type),
      INDEX idx_entity (entity_type, entity_id),
      INDEX idx_timestamp (timestamp),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
    
    // Check if we need to add 'search' to operation_type ENUM
    try {
      const [columns] = await conn.query(
        "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'operation_type'",
        [DB_NAME]
      );
      
      if (columns.length > 0 && !columns[0].COLUMN_TYPE.includes('search')) {
        await conn.query(
          "ALTER TABLE audit_logs MODIFY COLUMN operation_type ENUM('create', 'delete', 'rename', 'upload', 'download', 'share', 'move', 'login', 'logout', 'search') NOT NULL"
        );
        console.log('✓ Updated audit_logs operation_type ENUM');
      }
    } catch (err) {
      // Table might not exist yet, ignore
    }
  } finally {
    conn.release();
  }
}

export async function ensureRolesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description TEXT NULL,
      permissions JSON NULL,
      is_system BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
    
    // Insert default roles
    await conn.query(`
      INSERT IGNORE INTO roles (name, description, permissions, is_system) VALUES
      ('admin', 'Full system access', '{"files": ["create", "read", "update", "delete"], "users": ["create", "read", "update", "delete"], "roles": ["create", "read", "update", "delete"], "audit": ["read", "export"], "system": ["manage"]}', true),
      ('user', 'Standard user access', '{"files": ["create", "read", "update", "delete"]}', true),
      ('viewer', 'Read-only access', '{"files": ["read"]}', true)
    `);
  } finally {
    conn.release();
  }
}

export async function ensureNotificationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      type ENUM('upload', 'download', 'delete', 'share', 'quota', 'error', 'success', 'info', 'warning') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSON NULL,
      is_read BOOLEAN DEFAULT FALSE,
      priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
      action_url VARCHAR(512) NULL,
      email_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_read (user_id, is_read),
      INDEX idx_created (created_at),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

export async function ensureUserPreferencesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id VARCHAR(36) PRIMARY KEY,
      email_notifications BOOLEAN DEFAULT TRUE,
      quota_alerts BOOLEAN DEFAULT TRUE,
      upload_notifications BOOLEAN DEFAULT TRUE,
      share_notifications BOOLEAN DEFAULT TRUE,
      error_notifications BOOLEAN DEFAULT TRUE,
      notification_frequency ENUM('realtime', 'hourly', 'daily') DEFAULT 'realtime',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

export async function ensureFileVersionsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS file_versions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_id INT NOT NULL,
      version_number INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(1024) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(255) NULL,
      checksum VARCHAR(64) NULL,
      user_id VARCHAR(36) NOT NULL,
      user_name VARCHAR(100) NOT NULL,
      change_description TEXT NULL,
      is_current BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_file_version (file_id, version_number),
      INDEX idx_current (file_id, is_current),
      INDEX idx_created (created_at),
      UNIQUE KEY unique_file_version (file_id, version_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

export async function ensureSharedFoldersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS shared_folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      folder_id INT NOT NULL,
      owner_id VARCHAR(36) NOT NULL,
      shared_with_user_id VARCHAR(36) NOT NULL,
      permission ENUM('viewer', 'editor', 'admin') DEFAULT 'viewer',
      shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_share (folder_id, shared_with_user_id),
      INDEX idx_shared_with (shared_with_user_id),
      INDEX idx_folder (folder_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const conn = await getPool().getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

export default getPool();
