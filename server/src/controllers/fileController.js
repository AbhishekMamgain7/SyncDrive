import { getPool } from '../db.js';
import { broadcastFileOperation } from '../websocket.js';
import { logAudit } from '../services/auditLogger.js';
import { notifyFileOperation, notifyError } from '../services/notificationService.js';
import { createFileVersion } from '../services/versionService.js';
import fs from 'fs';

/**
 * List files and folders for authenticated user
 * GET /api/files?parentId=<id>
 */
export const listFiles = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT middleware
    const { parentId } = req.query;

    const conn = await getPool().getConnection();
    try {
      let query;
      let params;

      // If parentId is not provided, null, or 'null', fetch root directory items
      if (!parentId || parentId === 'null' || parentId === 'undefined') {
        query = `
          SELECT 
            id,
            name,
            type,
            path,
            size,
            mime_type as mimeType,
            user_id as userId,
            parent_id as parentId,
            created_at as createdAt,
            updated_at as updatedAt
          FROM files
          WHERE user_id = ? AND parent_id IS NULL
          ORDER BY type DESC, name ASC
        `;
        params = [userId];
      } else {
        // Fetch items with specific parent_id
        query = `
          SELECT 
            id,
            name,
            type,
            path,
            size,
            mime_type as mimeType,
            user_id as userId,
            parent_id as parentId,
            created_at as createdAt,
            updated_at as updatedAt
          FROM files
          WHERE user_id = ? AND parent_id = ?
          ORDER BY type DESC, name ASC
        `;
        params = [userId, parseInt(parentId)];
      }

      const [rows] = await conn.query(query, params);

      // Return the list of files and folders
      res.json({
        success: true,
        data: rows,
        count: rows.length
      });
      
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch files and folders' 
    });
  }
};

/**
 * Create a new folder
 * POST /api/files/folder
 */
export const createFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Folder name is required' 
      });
    }

    const conn = await getPool().getConnection();
    try {
      // Check if folder with same name exists in the same parent
      const checkQuery = `
        SELECT id FROM files 
        WHERE user_id = ? AND name = ? AND type = 'folder' AND ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
      `;
      const checkParams = parentId ? [userId, name.trim(), parseInt(parentId)] : [userId, name.trim()];
      const [existing] = await conn.query(checkQuery, checkParams);

      if (existing.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'A folder with this name already exists in this location' 
        });
      }

      // Insert new folder
      const insertQuery = `
        INSERT INTO files (name, type, user_id, parent_id)
        VALUES (?, 'folder', ?, ?)
      `;
      const insertParams = [name.trim(), userId, parentId ? parseInt(parentId) : null];
      const [result] = await conn.query(insertQuery, insertParams);

      // Fetch the newly created folder
      const [newFolder] = await conn.query(
        `SELECT 
          id,
          name,
          type,
          path,
          size,
          mime_type as mimeType,
          user_id as userId,
          parent_id as parentId,
          created_at as createdAt,
          updated_at as updatedAt
        FROM files WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        data: newFolder[0]
      });

      // Log audit event
      await logAudit({
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'create',
        entityType: 'folder',
        entityId: result.insertId,
        entityName: name.trim(),
        parentFolderId: parentId ? parseInt(parentId) : null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { size: 0, type: 'folder' }
      });

      // Broadcast folder creation
      broadcastFileOperation(
        'create',
        newFolder[0],
        parentId ? parseInt(parentId) : null,
        userId,
        req.user.name
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create folder' 
    });
  }
};

/**
 * Delete file or folder
 * DELETE /api/files/:id
 */
export const deleteFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid file ID is required' 
      });
    }

    const conn = await getPool().getConnection();
    try {
      // Verify the file belongs to the user
      const [file] = await conn.query(
        'SELECT id, name, type, parent_id FROM files WHERE id = ? AND user_id = ?',
        [parseInt(id), userId]
      );

      if (file.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'File or folder not found' 
        });
      }

      // Delete the file (cascade will handle children)
      await conn.query('DELETE FROM files WHERE id = ?', [parseInt(id)]);

      // Log audit event
      await logAudit({
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'delete',
        entityType: file[0].type,
        entityId: parseInt(id),
        entityName: file[0].name,
        parentFolderId: file[0].parent_id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { type: file[0].type }
      });

      res.json({
        success: true,
        message: `${file[0].type === 'folder' ? 'Folder' : 'File'} deleted successfully`
      });

      // Notify user of successful deletion
      await notifyFileOperation(userId, 'delete', file[0].name, true);

      // Broadcast deletion
      const parentId = file[0].parent_id;
      broadcastFileOperation(
        'delete',
        { id: parseInt(id), type: file[0].type, name: file[0].name },
        parentId,
        userId,
        req.user.name
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete file or folder' 
    });
  }
};

/**
 * Rename file or folder
 * PATCH /api/files/:id
 */
export const renameFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid file ID is required' 
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'New name is required' 
      });
    }

    const conn = await getPool().getConnection();
    try {
      // Verify the file belongs to the user and get its parent
      const [file] = await conn.query(
        'SELECT id, parent_id, type FROM files WHERE id = ? AND user_id = ?',
        [parseInt(id), userId]
      );

      if (file.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'File or folder not found' 
        });
      }

      // Check if another file/folder with same name exists in same location
      const checkQuery = `
        SELECT id FROM files 
        WHERE user_id = ? AND name = ? AND id != ? AND ${file[0].parent_id ? 'parent_id = ?' : 'parent_id IS NULL'}
      `;
      const checkParams = file[0].parent_id 
        ? [userId, name.trim(), parseInt(id), file[0].parent_id]
        : [userId, name.trim(), parseInt(id)];
      
      const [existing] = await conn.query(checkQuery, checkParams);

      if (existing.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'A file or folder with this name already exists in this location' 
        });
      }

      // Update the name
      await conn.query(
        'UPDATE files SET name = ? WHERE id = ?',
        [name.trim(), parseInt(id)]
      );

      // Fetch updated file
      const [updated] = await conn.query(
        `SELECT 
          id,
          name,
          type,
          path,
          size,
          mime_type as mimeType,
          user_id as userId,
          parent_id as parentId,
          created_at as createdAt,
          updated_at as updatedAt
        FROM files WHERE id = ?`,
        [parseInt(id)]
      );

      // Log audit event
      await logAudit({
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'rename',
        entityType: file[0].type,
        entityId: parseInt(id),
        entityName: name.trim(),
        parentFolderId: file[0].parent_id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { oldName: file[0].name, newName: name.trim(), type: file[0].type }
      });

      res.json({
        success: true,
        data: updated[0]
      });

      // Broadcast rename
      broadcastFileOperation(
        'rename',
        updated[0],
        file[0].parent_id,
        userId,
        req.user.name
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Rename file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to rename file or folder' 
    });
  }
};

/**
 * Upload a file
 * POST /api/files/upload
 * Uses multer middleware to handle file upload
 */
export const uploadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { parentId } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    const { originalname, mimetype, size, path: filePath } = req.file;

    const conn = await getPool().getConnection();
    try {
      // Check if file with same name exists in the same parent
      const checkQuery = `
        SELECT id FROM files 
        WHERE user_id = ? AND name = ? AND type = 'file' AND ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
      `;
      const checkParams = parentId ? [userId, originalname, parseInt(parentId)] : [userId, originalname];
      const [existing] = await conn.query(checkQuery, checkParams);

      if (existing.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'A file with this name already exists in this location' 
        });
      }

      // Insert file metadata into database
      const insertQuery = `
        INSERT INTO files (name, type, path, size, mime_type, user_id, parent_id)
        VALUES (?, 'file', ?, ?, ?, ?, ?)
      `;
      const insertParams = [
        originalname,
        filePath,
        size,
        mimetype,
        userId,
        parentId ? parseInt(parentId) : null
      ];
      
      const [result] = await conn.query(insertQuery, insertParams);

      // Fetch the newly created file record
      const [newFile] = await conn.query(
        `SELECT 
          id,
          name,
          type,
          path,
          size,
          mime_type as mimeType,
          user_id as userId,
          parent_id as parentId,
          created_at as createdAt,
          updated_at as updatedAt
        FROM files WHERE id = ?`,
        [result.insertId]
      );

      // Log audit event
      await logAudit({
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'upload',
        entityType: 'file',
        entityId: result.insertId,
        entityName: originalname,
        parentFolderId: parentId ? parseInt(parentId) : null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { size, mimeType: mimetype, path: filePath }
      });

      res.status(201).json({
        success: true,
        data: newFile[0],
        message: 'File uploaded successfully'
      });

      // Notify user of successful upload
      await notifyFileOperation(userId, 'upload', originalname, true);

      // Create file version
      await createFileVersion({
        fileId: result.insertId,
        filePath,
        fileName: originalname,
        fileSize: size,
        mimeType: mimetype,
        userId,
        userName: req.user.name,
        changeDescription: 'Initial upload'
      });

      // Broadcast file upload
      broadcastFileOperation(
        'upload',
        newFile[0],
        parentId ? parseInt(parentId) : null,
        userId,
        req.user.name
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload file' 
    });
  }
};

/**
 * Download a file
 * GET /api/files/download/:id
 */
export const downloadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid file ID is required' 
      });
    }

    const conn = await getPool().getConnection();
    try {
      // Verify the file belongs to the user and get file details
      const [file] = await conn.query(
        'SELECT id, name, type, path, mime_type, size FROM files WHERE id = ? AND user_id = ? AND type = "file"',
        [parseInt(id), userId]
      );

      if (file.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'File not found' 
        });
      }

      const fileData = file[0];

      // Check if file exists on disk
      if (!fs.existsSync(fileData.path)) {
        return res.status(404).json({ 
          success: false,
          error: 'File not found on disk' 
        });
      }

      // Log audit event
      await logAudit({
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        operationType: 'download',
        entityType: 'file',
        entityId: parseInt(id),
        entityName: fileData.name,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { size: fileData.size, mimeType: fileData.mime_type }
      });

      // Notify user of successful download
      await notifyFileOperation(userId, 'download', fileData.name, true);

      // Send file
      res.download(fileData.path, fileData.name, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ 
              success: false,
              error: 'Failed to download file' 
            });
          }
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to download file' 
    });
  }
};
