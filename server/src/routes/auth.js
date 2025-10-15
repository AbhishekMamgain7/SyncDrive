import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../db.js';
import crypto from 'node:crypto';

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
    const conn = await getPool().getConnection();
    try {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

      const id = crypto.randomUUID();
      const password_hash = await bcrypt.hash(password, 10);
      await conn.query(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, name, email, password_hash, 'user']
      );

      const user = { id, name, email, role: 'user' };
      const token = jwt.sign(user, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
      res.json({ user, token });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid password' });
      const user = publicUser(row);
      const token = jwt.sign(user, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
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
