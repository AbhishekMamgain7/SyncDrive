import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../db.js';
import crypto from 'node:crypto';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isLocked: row.is_locked,
    createdAt: row.created_at,
  };
}

router.post('/signup', async (req, res) => {
  try {
    console.log('Signup request received:', { email: req.body?.email, name: req.body?.name });
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      console.log('Missing fields in signup');
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ error: 'Password too short' });
    }
    const conn = await getPool().getConnection();
    try {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        console.log('Email already exists:', email);
        return res.status(409).json({ error: 'Email already registered' });
      }

      const id = crypto.randomUUID();
      const password_hash = await bcrypt.hash(password, 10);
      await conn.query(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, name, email, password_hash, 'user']
      );
      console.log('User created successfully:', id);

      const user = { id, name, email, role: 'user' };
      const token = jwt.sign(user, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
      
      // Log audit event
      await logAudit({
        userId: id,
        userName: name,
        userEmail: email,
        operationType: 'login',
        entityType: 'user',
        entityId: id,
        entityName: name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { action: 'signup' }
      });
      
      console.log('Signup successful, sending response');
      res.json({ user, token });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const conn = await getPool().getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const row = rows[0];
      
      // Check if account is locked
      if (row.is_locked) {
        return res.status(403).json({ 
          error: 'Account is locked', 
          reason: row.locked_reason || 'Your account has been locked by an administrator',
          lockedAt: row.locked_at
        });
      }
      
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        // Increment login attempts
        await conn.query(
          'UPDATE users SET login_attempts = login_attempts + 1 WHERE id = ?',
          [row.id]
        );
        return res.status(401).json({ error: 'Invalid password' });
      }
      
      // Reset login attempts and update last login
      await conn.query(
        'UPDATE users SET login_attempts = 0, last_login = NOW() WHERE id = ?',
        [row.id]
      );
      
      const user = publicUser(row);
      const token = jwt.sign(user, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
      
      // Log audit event
      await logAudit({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        operationType: 'login',
        entityType: 'user',
        entityId: user.id,
        entityName: user.name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { action: 'login' }
      });
      
      res.json({ user, token });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
