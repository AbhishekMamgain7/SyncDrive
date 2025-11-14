import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getPool } from '../db.js';
import { broadcastFileOperation } from '../websocket.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * Share a folder with a user
 * POST /api/sharing/share
 */
router.post('/share', async (req, res) => {
  try {
    const { folderId, userEmail, permission = 'viewer' } = req.body;
    const ownerId = req.user.id;
    const ownerName = req.user.name;

    console.log('📤 Share request:', { folderId, userEmail, permission, ownerId, ownerName });

    if (!folderId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Folder ID and user email are required'
      });
    }

    const conn = await getPool().getConnection();
    try {
      // Verify folder exists and user is owner
      const [folders] = await conn.query(
        'SELECT id, name, user_id FROM files WHERE id = ? AND type = ?',
        [folderId, 'folder']
      );

      if (folders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found'
        });
      }

      const folder = folders[0];

      // Check if user has permission (owner or has admin permission)
      if (folder.user_id !== ownerId) {
        const [permissions] = await conn.query(
          'SELECT permission FROM shared_folders WHERE folder_id = ? AND shared_with_user_id = ?',
          [folderId, ownerId]
        );

        if (permissions.length === 0 || permissions[0].permission !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to share this folder'
          });
        }
      }

      // Find user by email
      const [users] = await conn.query(
        'SELECT id, name FROM users WHERE email = ?',
        [userEmail]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const sharedWithUserId = users[0].id;
      const sharedWithUserName = users[0].name;

      console.log('👤 Found user to share with:', { sharedWithUserId, sharedWithUserName });

      // Don't allow sharing with self
      if (sharedWithUserId === ownerId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot share folder with yourself'
        });
      }

      // Check if already shared
      const [existing] = await conn.query(
        'SELECT id, permission FROM shared_folders WHERE folder_id = ? AND shared_with_user_id = ?',
        [folderId, sharedWithUserId]
      );

      if (existing.length > 0) {
        // Update permission
        await conn.query(
          'UPDATE shared_folders SET permission = ? WHERE id = ?',
          [permission, existing[0].id]
        );

        return res.json({
          success: true,
          message: 'Folder sharing updated',
          data: { permission }
        });
      }

      // Create new share
      await conn.query(
        'INSERT INTO shared_folders (folder_id, owner_id, shared_with_user_id, permission) VALUES (?, ?, ?, ?)',
        [folderId, folder.user_id, sharedWithUserId, permission]
      );

      console.log('✅ Folder shared in database');

      // Notify the user
      const notifResult = await createNotification({
        userId: sharedWithUserId,
        type: 'share',
        title: 'Folder Shared With You',
        message: `${ownerName} shared folder "${folder.name}" with you`,
        priority: 'normal',
        data: { folderId, permission, ownerName }
      });

      console.log('📬 Notification created:', notifResult);

      // Broadcast to WebSocket
      broadcastFileOperation('share', folder, null, ownerId, ownerName);

      // Log audit
      await logAudit({
        userId: ownerId,
        userName: ownerName,
        userEmail: req.user.email,
        operationType: 'share',
        entityType: 'folder',
        entityId: folderId.toString(),
        entityName: folder.name,
        details: { sharedWith: userEmail, sharedWithUserName, permission }
      });

      res.json({
        success: true,
        message: 'Folder shared successfully',
        data: { sharedWithUserName, permission }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Share folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share folder'
    });
  }
});

/**
 * Get folders shared with current user
 * GET /api/sharing/shared-with-me
 */
router.get('/shared-with-me', async (req, res) => {
  try {
    const userId = req.user.id;

    const conn = await getPool().getConnection();
    try {
      const [sharedFolders] = await conn.query(
        `SELECT 
          f.id,
          f.name,
          f.type,
          f.created_at as createdAt,
          f.updated_at as updatedAt,
          sf.permission,
          sf.added_to_my_files as addedToMyFiles,
          sf.shared_at as sharedAt,
          u.name as ownerName,
          u.email as ownerEmail
        FROM shared_folders sf
        JOIN files f ON sf.folder_id = f.id
        JOIN users u ON sf.owner_id = u.id
        WHERE sf.shared_with_user_id = ?
        ORDER BY sf.shared_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: sharedFolders
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get shared folders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shared folders'
    });
  }
});

/**
 * Get users a folder is shared with
 * GET /api/sharing/folder/:folderId/users
 */
router.get('/folder/:folderId/users', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const conn = await getPool().getConnection();
    try {
      // Verify user has access to folder
      const [folders] = await conn.query(
        'SELECT user_id FROM files WHERE id = ? AND type = ?',
        [folderId, 'folder']
      );

      if (folders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found'
        });
      }

      const isOwner = folders[0].user_id === userId;

      if (!isOwner) {
        // Check if user has access
        const [permissions] = await conn.query(
          'SELECT permission FROM shared_folders WHERE folder_id = ? AND shared_with_user_id = ?',
          [folderId, userId]
        );

        if (permissions.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }

      // Get list of shared users
      const [sharedUsers] = await conn.query(
        `SELECT 
          u.id,
          u.name,
          u.email,
          sf.permission,
          sf.shared_at as sharedAt
        FROM shared_folders sf
        JOIN users u ON sf.shared_with_user_id = u.id
        WHERE sf.folder_id = ?
        ORDER BY sf.shared_at DESC`,
        [folderId]
      );

      res.json({
        success: true,
        data: sharedUsers
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get folder users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folder users'
    });
  }
});

/**
 * Remove user from shared folder
 * DELETE /api/sharing/folder/:folderId/user/:userId
 */
router.delete('/folder/:folderId/user/:userId', async (req, res) => {
  try {
    const { folderId, userId: targetUserId } = req.params;
    const currentUserId = req.user.id;

    const conn = await getPool().getConnection();
    try {
      // Verify folder exists and user is owner or admin
      const [folders] = await conn.query(
        'SELECT user_id, name FROM files WHERE id = ? AND type = ?',
        [folderId, 'folder']
      );

      if (folders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found'
        });
      }

      const isOwner = folders[0].user_id === currentUserId;

      if (!isOwner) {
        const [permissions] = await conn.query(
          'SELECT permission FROM shared_folders WHERE folder_id = ? AND shared_with_user_id = ?',
          [folderId, currentUserId]
        );

        if (permissions.length === 0 || permissions[0].permission !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to remove users'
          });
        }
      }

      // Remove sharing
      const [result] = await conn.query(
        'DELETE FROM shared_folders WHERE folder_id = ? AND shared_with_user_id = ?',
        [folderId, targetUserId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Sharing not found'
        });
      }

      // Notify the user
      await createNotification({
        userId: targetUserId,
        type: 'info',
        title: 'Folder Access Removed',
        message: `Your access to folder "${folders[0].name}" has been removed`,
        priority: 'normal'
      });

      // Broadcast
      broadcastFileOperation('unshare', { id: folderId, name: folders[0].name }, null, currentUserId, req.user.name);

      res.json({
        success: true,
        message: 'User removed from shared folder'
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Remove user from folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove user'
    });
  }
});

/**
 * Add shared folder to My Files
 * POST /api/sharing/add-to-my-files/:folderId
 */
router.post('/add-to-my-files/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const conn = await getPool().getConnection();
    try {
      // Check if folder is shared with user
      const [sharing] = await conn.query(
        'SELECT id FROM shared_folders WHERE folder_id = ? AND shared_with_user_id = ?',
        [folderId, userId]
      );

      if (sharing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not shared with you'
        });
      }

      // Update added_to_my_files flag
      await conn.query(
        'UPDATE shared_folders SET added_to_my_files = TRUE WHERE id = ?',
        [sharing[0].id]
      );

      res.json({
        success: true,
        message: 'Folder added to My Files'
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Add to my files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add folder'
    });
  }
});

/**
 * Remove shared folder from My Files
 * DELETE /api/sharing/remove-from-my-files/:folderId
 */
router.delete('/remove-from-my-files/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const conn = await getPool().getConnection();
    try {
      // Update added_to_my_files flag
      const [result] = await conn.query(
        'UPDATE shared_folders SET added_to_my_files = FALSE WHERE folder_id = ? AND shared_with_user_id = ?',
        [folderId, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found'
        });
      }

      res.json({
        success: true,
        message: 'Folder removed from My Files'
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Remove from my files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove folder'
    });
  }
});

export default router;
