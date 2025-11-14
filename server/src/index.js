import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import auditRouter from './routes/audit.js';
import adminRouter from './routes/admin.js';
import notificationsRouter from './routes/notifications.js';
import versionsRouter from './routes/versions.js';
import searchRouter from './routes/search.js';
import sharingRouter from './routes/sharing.js';
import { ensureDatabase, ensureUsersTable, ensureFilesTable, ensureAuditLogsTable, ensureRolesTable, ensureNotificationsTable, ensureUserPreferencesTable, ensureFileVersionsTable, ensureSharedFoldersTable } from './db.js';
import { initializeWebSocket } from './websocket.js';
import { initEmailTransporter } from './services/notificationService.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/versions', versionsRouter);
app.use('/api/search', searchRouter);
app.use('/api/sharing', sharingRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;

// Initialize database and tables
ensureDatabase()
  .then(() => ensureUsersTable())
  .then(() => ensureRolesTable())
  .then(() => ensureUserPreferencesTable())
  .then(() => ensureFilesTable())
  .then(() => ensureFileVersionsTable())
  .then(() => ensureSharedFoldersTable())
  .then(() => ensureAuditLogsTable())
  .then(() => ensureNotificationsTable())
  .then(() => {
    // Initialize WebSocket
    initializeWebSocket(server);
    
    // Initialize email transporter
    initEmailTransporter();
    
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
      console.log('✓ Database initialized');
      console.log('✓ Users table ready');
      console.log('✓ Roles table ready');
      console.log('✓ Preferences table ready');
      console.log('✓ Files table ready');
      console.log('✓ File versions table ready');
      console.log('✓ Shared folders table ready');
      console.log('✓ Audit logs table ready');
      console.log('✓ Notifications table ready');
      console.log('✓ WebSocket ready');
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
