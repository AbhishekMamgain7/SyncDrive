import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getPool } from '../db.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
  }
  next();
};

// Apply admin check to all routes
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 */
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      isLocked = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const conn = await getPool().getConnection();
    try {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const params = [];
      let whereConditions = [];

      if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      if (role) {
        whereConditions.push('role = ?');
        params.push(role);
      }

      if (isLocked !== '') {
        whereConditions.push('is_locked = ?');
        params.push(isLocked === 'true' ? 1 : 0);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      const allowedSortColumns = ['created_at', 'name', 'email', 'role', 'last_login'];
      const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const [countResult] = await conn.query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      const [users] = await conn.query(
        `SELECT 
          id, name, email, role,
          is_locked as isLocked,
          locked_reason as lockedReason,
          locked_at as lockedAt,
          locked_by as lockedBy,
          last_login as lastLogin,
          login_attempts as loginAttempts,
          created_at as createdAt,
          updated_at as updatedAt
        FROM users
        ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );

      res.json({
        success: true,
        data: users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get a specific user
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await getPool().getConnection();
    
    try {
      const [users] = await conn.query(
        `SELECT id, name, email, role, is_locked as isLocked,
          locked_reason as lockedReason, locked_at as lockedAt,
          locked_by as lockedBy, last_login as lastLogin,
          login_attempts as loginAttempts, created_at as createdAt,
          updated_at as updatedAt
        FROM users WHERE id = ?`,
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: users[0] });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const conn = await getPool().getConnection();
    try {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

      if (existing.length > 0) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      await conn.query(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, name, email, passwordHash, role]
      );

      const [newUser] = await conn.query(
        `SELECT id, name, email, role, is_locked as isLocked, created_at as createdAt
        FROM users WHERE id = ?`,
        [id]
      );

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'create',
        entityType: 'user',
        entityId: id,
        entityName: name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { email, role, action: 'admin_create_user' }
      });

      res.status(201).json({ success: true, data: newUser[0] });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user details
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ success: false, error: 'At least one field required' });
    }

    const conn = await getPool().getConnection();
    try {
      const [user] = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [id]);

      if (user.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (email && email !== user[0].email) {
        const [existing] = await conn.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
        if (existing.length > 0) {
          return res.status(409).json({ success: false, error: 'Email already in use' });
        }
      }

      const updates = [];
      const params = [];

      if (name) {
        updates.push('name = ?');
        params.push(name);
      }

      if (email) {
        updates.push('email = ?');
        params.push(email);
      }

      params.push(id);

      await conn.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const [updated] = await conn.query(
        `SELECT id, name, email, role, is_locked as isLocked, created_at as createdAt, updated_at as updatedAt
        FROM users WHERE id = ?`,
        [id]
      );

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'rename',
        entityType: 'user',
        entityId: id,
        entityName: name || user[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { oldName: user[0].name, newName: name, oldEmail: user[0].email, newEmail: email, action: 'admin_update_user' }
      });

      res.json({ success: true, data: updated[0] });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const conn = await getPool().getConnection();
    try {
      const [user] = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [id]);

      if (user.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      await conn.query('DELETE FROM users WHERE id = ?', [id]);

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'delete',
        entityType: 'user',
        entityId: id,
        entityName: user[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { email: user[0].email, action: 'admin_delete_user' }
      });

      res.json({ success: true, message: 'User deleted successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Change user role
 */
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }

    const validRoles = ['admin', 'user', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const conn = await getPool().getConnection();
    try {
      const [user] = await conn.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);

      if (user.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      await conn.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'rename',
        entityType: 'user',
        entityId: id,
        entityName: user[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { oldRole: user[0].role, newRole: role, action: 'admin_change_role' }
      });

      res.json({ success: true, message: 'User role updated successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ success: false, error: 'Failed to change user role' });
  }
});

/**
 * PATCH /api/admin/users/:id/lock
 * Lock/unlock user account
 */
router.patch('/users/:id/lock', async (req, res) => {
  try {
    const { id } = req.params;
    const { isLocked, reason = '' } = req.body;

    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isLocked must be a boolean' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot lock your own account' });
    }

    const conn = await getPool().getConnection();
    try {
      const [user] = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [id]);

      if (user.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (isLocked) {
        await conn.query(
          'UPDATE users SET is_locked = ?, locked_reason = ?, locked_at = NOW(), locked_by = ? WHERE id = ?',
          [1, reason, req.user.id, id]
        );
      } else {
        await conn.query(
          'UPDATE users SET is_locked = ?, locked_reason = NULL, locked_at = NULL, locked_by = NULL WHERE id = ?',
          [0, id]
        );
      }

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'rename',
        entityType: 'user',
        entityId: id,
        entityName: user[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { locked: isLocked, reason, action: isLocked ? 'admin_lock_account' : 'admin_unlock_account' }
      });

      res.json({ 
        success: true, 
        message: `User account ${isLocked ? 'locked' : 'unlocked'} successfully` 
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Lock/unlock user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user lock status' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const conn = await getPool().getConnection();
    try {
      const [user] = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [id]);

      if (user.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await conn.query('UPDATE users SET password_hash = ?, login_attempts = 0 WHERE id = ?', [passwordHash, id]);

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'rename',
        entityType: 'user',
        entityId: id,
        entityName: user[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { action: 'admin_reset_password' }
      });

      res.json({ success: true, message: 'Password reset successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

/**
 * GET /api/admin/roles
 * Get all roles
 */
router.get('/roles', async (req, res) => {
  try {
    const conn = await getPool().getConnection();
    try {
      const [roles] = await conn.query(
        `SELECT 
          id, name, description, permissions,
          is_system as isSystem,
          created_at as createdAt,
          updated_at as updatedAt
        FROM roles
        ORDER BY is_system DESC, name ASC`
      );

      const parsedRoles = roles.map(role => ({
        ...role,
        permissions: role.permissions ? JSON.parse(role.permissions) : {}
      }));

      res.json({ success: true, data: parsedRoles });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

/**
 * POST /api/admin/roles
 * Create a new role
 */
router.post('/roles', async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }

    const conn = await getPool().getConnection();
    try {
      const [existing] = await conn.query('SELECT id FROM roles WHERE name = ?', [name]);

      if (existing.length > 0) {
        return res.status(409).json({ success: false, error: 'Role already exists' });
      }

      const [result] = await conn.query(
        'INSERT INTO roles (name, description, permissions, is_system) VALUES (?, ?, ?, ?)',
        [name, description || null, JSON.stringify(permissions || {}), false]
      );

      const [newRole] = await conn.query(
        'SELECT id, name, description, permissions, is_system as isSystem, created_at as createdAt FROM roles WHERE id = ?',
        [result.insertId]
      );

      const parsedRole = {
        ...newRole[0],
        permissions: newRole[0].permissions ? JSON.parse(newRole[0].permissions) : {}
      };

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'create',
        entityType: 'system',
        entityId: result.insertId.toString(),
        entityName: name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { permissions, action: 'admin_create_role' }
      });

      res.status(201).json({ success: true, data: parsedRole });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

/**
 * PATCH /api/admin/roles/:id
 * Update role permissions
 */
router.patch('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, permissions } = req.body;

    const conn = await getPool().getConnection();
    try {
      const [role] = await conn.query('SELECT id, name, is_system FROM roles WHERE id = ?', [id]);

      if (role.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      if (role[0].is_system) {
        return res.status(403).json({ success: false, error: 'Cannot modify system roles' });
      }

      const updates = [];
      const params = [];

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }

      if (permissions) {
        updates.push('permissions = ?');
        params.push(JSON.stringify(permissions));
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      params.push(id);

      await conn.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const [updated] = await conn.query(
        'SELECT id, name, description, permissions, is_system as isSystem, updated_at as updatedAt FROM roles WHERE id = ?',
        [id]
      );

      const parsedRole = {
        ...updated[0],
        permissions: updated[0].permissions ? JSON.parse(updated[0].permissions) : {}
      };

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'rename',
        entityType: 'system',
        entityId: id,
        entityName: role[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { permissions, action: 'admin_update_role' }
      });

      res.json({ success: true, data: parsedRole });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/admin/roles/:id
 * Delete a role
 */
router.delete('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const conn = await getPool().getConnection();
    try {
      const [role] = await conn.query('SELECT id, name, is_system FROM roles WHERE id = ?', [id]);

      if (role.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      if (role[0].is_system) {
        return res.status(403).json({ success: false, error: 'Cannot delete system roles' });
      }

      // Check if any users have this role
      const [users] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role[0].name]);

      if (users[0].count > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `Cannot delete role. ${users[0].count} user(s) still have this role` 
        });
      }

      await conn.query('DELETE FROM roles WHERE id = ?', [id]);

      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'delete',
        entityType: 'system',
        entityId: id,
        entityName: role[0].name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { action: 'admin_delete_role' }
      });

      res.json({ success: true, message: 'Role deleted successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const conn = await getPool().getConnection();
    try {
      const [userStats] = await conn.query(`
        SELECT 
          COUNT(*) as totalUsers,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as adminCount,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userCount,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) as lockedCount,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as newToday
        FROM users
      `);

      const [roleStats] = await conn.query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `);

      const [recentUsers] = await conn.query(`
        SELECT id, name, email, role, created_at as createdAt
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `);

      res.json({
        success: true,
        data: {
          users: userStats[0],
          roleDistribution: roleStats,
          recentUsers
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

export default router;
