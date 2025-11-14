import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getPool } from '../db.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Advanced search with filters
 * GET /api/search?q=query&type=file&dateFrom=...&dateTo=...&owner=...&folder=...
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const {
      q = '',
      type,
      dateFrom,
      dateTo,
      owner,
      folder,
      mimeType,
      minSize,
      maxSize,
      limit = 50,
      offset = 0
    } = req.query;

    const conn = await getPool().getConnection();
    try {
      let query = `
        SELECT 
          f.id,
          f.name,
          f.type,
          f.path,
          f.size,
          f.mime_type as mimeType,
          f.user_id as userId,
          f.parent_id as parentId,
          f.created_at as createdAt,
          f.updated_at as updatedAt,
          u.name as ownerName,
          u.email as ownerEmail,
          (SELECT GROUP_CONCAT(pf.name ORDER BY pf.id SEPARATOR ' > ')
           FROM files pf
           WHERE f.parent_id IS NOT NULL
           AND pf.id IN (
             WITH RECURSIVE parent_folders AS (
               SELECT id, parent_id, name
               FROM files
               WHERE id = f.parent_id
               UNION ALL
               SELECT f2.id, f2.parent_id, f2.name
               FROM files f2
               INNER JOIN parent_folders pf2 ON f2.id = pf2.parent_id
             )
             SELECT id FROM parent_folders
           )
          ) as folderPath
        FROM files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      // User filter: admin can search all, regular users only their files
      if (!isAdmin) {
        query += ' AND f.user_id = ?';
        params.push(userId);
      } else if (owner) {
        query += ' AND f.user_id = ?';
        params.push(owner);
      }

      // Search query with fuzzy matching
      if (q && q.trim()) {
        const searchTerm = `%${q.trim()}%`;
        // Split query into tokens for better matching
        const tokens = q.trim().split(/\s+/).filter(t => t.length > 0);
        
        if (tokens.length > 1) {
          // Multi-token search
          const conditions = tokens.map(() => `(
            f.name LIKE ? OR
            f.mime_type LIKE ? OR
            u.name LIKE ? OR
            u.email LIKE ?
          )`).join(' AND ');
          query += ` AND (${conditions})`;
          tokens.forEach(token => {
            const tokenPattern = `%${token}%`;
            params.push(tokenPattern, tokenPattern, tokenPattern, tokenPattern);
          });
        } else {
          // Single token search with SOUNDEX for phonetic matching
          query += ` AND (
            f.name LIKE ? OR
            f.mime_type LIKE ? OR
            u.name LIKE ? OR
            u.email LIKE ? OR
            SOUNDEX(f.name) = SOUNDEX(?) OR
            SOUNDEX(u.name) = SOUNDEX(?)
          )`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm, q.trim(), q.trim());
        }
      }

      // File type filter
      if (type) {
        query += ' AND f.type = ?';
        params.push(type);
      }

      // MIME type filter
      if (mimeType) {
        query += ' AND f.mime_type LIKE ?';
        params.push(`%${mimeType}%`);
      }

      // Date range filter
      if (dateFrom) {
        query += ' AND f.created_at >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ' AND f.created_at <= ?';
        params.push(dateTo);
      }

      // Size range filter
      if (minSize) {
        query += ' AND f.size >= ?';
        params.push(parseInt(minSize));
      }
      if (maxSize) {
        query += ' AND f.size <= ?';
        params.push(parseInt(maxSize));
      }

      // Folder filter
      if (folder) {
        if (folder === 'root') {
          query += ' AND f.parent_id IS NULL';
        } else {
          query += ' AND f.parent_id = ?';
          params.push(parseInt(folder));
        }
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as search_results`;
      const [countResult] = await conn.query(countQuery, params);
      const total = countResult[0].total;

      // Add sorting and pagination
      query += ' ORDER BY f.updated_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [results] = await conn.query(query, params);

      res.json({
        success: true,
        data: results,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + results.length) < total
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

/**
 * Auto-complete suggestions
 * GET /api/search/autocomplete?q=query
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { q = '', limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const conn = await getPool().getConnection();
    try {
      const searchTerm = `${q.trim()}%`;

      let query = `
        SELECT DISTINCT
          f.name,
          f.type,
          f.mime_type as mimeType,
          COUNT(*) as matchCount
        FROM files f
        WHERE f.name LIKE ?
      `;

      const params = [searchTerm];

      if (!isAdmin) {
        query += ' AND f.user_id = ?';
        params.push(userId);
      }

      query += ' GROUP BY f.name, f.type, f.mime_type ORDER BY matchCount DESC, f.name ASC LIMIT ?';
      params.push(parseInt(limit));

      const [results] = await conn.query(query, params);

      res.json({
        success: true,
        data: results
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: 'Autocomplete failed'
    });
  }
});

/**
 * Get file type statistics
 * GET /api/search/stats/types
 */
router.get('/stats/types', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const conn = await getPool().getConnection();
    try {
      let query = `
        SELECT 
          CASE 
            WHEN type = 'folder' THEN 'Folder'
            WHEN mime_type LIKE 'image/%' THEN 'Image'
            WHEN mime_type LIKE 'video/%' THEN 'Video'
            WHEN mime_type LIKE 'audio/%' THEN 'Audio'
            WHEN mime_type LIKE 'application/pdf%' THEN 'PDF'
            WHEN mime_type LIKE 'application/vnd.ms-excel%' OR mime_type LIKE 'application/vnd.openxmlformats-officedocument.spreadsheetml%' THEN 'Spreadsheet'
            WHEN mime_type LIKE 'application/msword%' OR mime_type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml%' THEN 'Document'
            WHEN mime_type LIKE 'text/%' THEN 'Text'
            ELSE 'Other'
          END as category,
          COUNT(*) as count,
          SUM(CASE WHEN type = 'file' THEN size ELSE 0 END) as totalSize
        FROM files
        WHERE 1=1
      `;

      const params = [];

      if (!isAdmin) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      query += ' GROUP BY category ORDER BY count DESC';

      const [results] = await conn.query(query, params);

      res.json({
        success: true,
        data: results
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * Get recent searches
 * GET /api/search/recent
 */
router.get('/recent', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    const conn = await getPool().getConnection();
    try {
      const [results] = await conn.query(
        `SELECT DISTINCT
          JSON_UNQUOTE(JSON_EXTRACT(details, '$.searchQuery')) as query,
          MAX(created_at) as lastUsed
         FROM audit_logs
         WHERE user_id = ? 
         AND operation_type = 'search'
         AND JSON_EXTRACT(details, '$.searchQuery') IS NOT NULL
         GROUP BY query
         ORDER BY lastUsed DESC
         LIMIT ?`,
        [userId, parseInt(limit)]
      );

      res.json({
        success: true,
        data: results.filter(r => r.query).map(r => r.query)
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Recent searches error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

export default router;
