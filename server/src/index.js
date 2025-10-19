import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import { ensureDatabase, ensureUsersTable, ensureFilesTable } from './db.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;

// Initialize database and tables
ensureDatabase()
  .then(() => ensureUsersTable())
  .then(() => ensureFilesTable())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log('✓ Database initialized');
      console.log('✓ Users table ready');
      console.log('✓ Files table ready');
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
