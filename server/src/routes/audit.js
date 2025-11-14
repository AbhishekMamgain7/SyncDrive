import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAuditLogs, getAuditStats, cleanupOldLogs } from '../services/auditLogger.js';

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

/**
 * GET /api/audit/logs
 * Get audit logs with filtering and pagination
 * Query params:
 *   - userId: Filter by user ID
 *   - operationType: Filter by operation (create, delete, etc.)
 *   - entityType: Filter by entity (file, folder, etc.)
 *   - status: Filter by status (success, failure, error)
 *   - startDate: Filter from date (ISO format)
 *   - endDate: Filter to date (ISO format)
 *   - search: Search in user names, emails, entity names
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50)
 *   - sortBy: Sort column (default: timestamp)
 *   - sortOrder: ASC or DESC (default: DESC)
 */
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      operationType,
      entityType,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = req.query;

    const result = await getAuditLogs({
      userId,
      operationType,
      entityType,
      status,
      startDate,
      endDate,
      searchQuery: search,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    res.json(result);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch audit logs' 
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 * Query params:
 *   - userId: Filter by user ID
 *   - startDate: Filter from date (ISO format)
 *   - endDate: Filter to date (ISO format)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const result = await getAuditStats({
      userId,
      startDate,
      endDate
    });

    res.json(result);
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch audit statistics' 
    });
  }
});

/**
 * DELETE /api/audit/cleanup
 * Cleanup old audit logs
 * Body:
 *   - daysToKeep: Number of days to keep (default: 90)
 */
router.delete('/cleanup', requireAdmin, async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const result = await cleanupOldLogs(daysToKeep);

    res.json(result);
  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cleanup audit logs' 
    });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs to CSV
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      operationType,
      entityType,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const result = await getAuditLogs({
      userId,
      operationType,
      entityType,
      status,
      startDate,
      endDate,
      searchQuery: search,
      page: 1,
      limit: 10000, // Export up to 10k records
      sortBy: 'timestamp',
      sortOrder: 'DESC'
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Convert to CSV
    const logs = result.data;
    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Operation',
      'Entity Type',
      'Entity Name',
      'Parent Folder',
      'Status',
      'IP Address'
    ];

    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.timestamp,
        `"${log.userName}"`,
        log.userEmail,
        log.operationType,
        log.entityType,
        `"${log.entityName || ''}"`,
        `"${log.parentFolderName || ''}"`,
        log.status,
        log.ipAddress || ''
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to export audit logs' 
    });
  }
});

export default router;
