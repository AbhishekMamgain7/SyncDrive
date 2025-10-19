import { getPool } from '../db.js';

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
        'SELECT id, type FROM files WHERE id = ? AND user_id = ?',
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

      res.json({
        success: true,
        message: `${file[0].type === 'folder' ? 'Folder' : 'File'} deleted successfully`
      });
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

      res.json({
        success: true,
        data: updated[0]
      });
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

      res.status(201).json({
        success: true,
        data: newFile[0],
        message: 'File uploaded successfully'
      });
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
