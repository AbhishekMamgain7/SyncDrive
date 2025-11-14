import { getPool } from '../db.js';

/**
 * Log an audit event
 * @param {Object} options - Audit log options
 */
export async function logAudit({
  userId,
  userName,
  userEmail,
  operationType,
  entityType,
  entityId = null,
  entityName = null,
  parentFolderId = null,
  parentFolderName = null,
  details = null,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  errorMessage = null
}) {
  try {
    const conn = await getPool().getConnection();
    try {
      await conn.query(
        `INSERT INTO audit_logs (
          user_id, user_name, user_email, operation_type, entity_type,
          entity_id, entity_name, parent_folder_id, parent_folder_name,
          details, ip_address, user_agent, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          userName,
          userEmail,
          operationType,
          entityType,
          entityId?.toString() || null,
          entityName,
          parentFolderId,
          parentFolderName,
          details ? JSON.stringify(details) : null,
          ipAddress,
          userAgent,
          status,
          errorMessage
        ]
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs({
  userId = null,
  operationType = null,
  entityType = null,
  status = null,
  startDate = null,
  endDate = null,
  searchQuery = null,
  page = 1,
  limit = 50,
  sortBy = 'timestamp',
  sortOrder = 'DESC'
}) {
  const conn = await getPool().getConnection();
  try {
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];

    // Build WHERE clause
    if (userId) {
      whereConditions.push('user_id = ?');
      params.push(userId);
    }

    if (operationType) {
      whereConditions.push('operation_type = ?');
      params.push(operationType);
    }

    if (entityType) {
      whereConditions.push('entity_type = ?');
      params.push(entityType);
    }

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (startDate) {
      whereConditions.push('timestamp >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('timestamp <= ?');
      params.push(endDate);
    }

    if (searchQuery) {
      whereConditions.push(
        '(user_name LIKE ? OR user_email LIKE ? OR entity_name LIKE ? OR parent_folder_name LIKE ?)'
      );
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Validate sort columns to prevent SQL injection
    const allowedSortColumns = ['timestamp', 'operation_type', 'entity_type', 'user_name', 'status'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'timestamp';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const [countResult] = await conn.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    const [logs] = await conn.query(
      `SELECT 
        id,
        user_id as userId,
        user_name as userName,
        user_email as userEmail,
        operation_type as operationType,
        entity_type as entityType,
        entity_id as entityId,
        entity_name as entityName,
        parent_folder_id as parentFolderId,
        parent_folder_name as parentFolderName,
        details,
        ip_address as ipAddress,
        user_agent as userAgent,
        status,
        error_message as errorMessage,
        timestamp
      FROM audit_logs 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Parse JSON details
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    return {
      success: true,
      data: parsedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } finally {
    conn.release();
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStats({ userId = null, startDate = null, endDate = null }) {
  const conn = await getPool().getConnection();
  try {
    const params = [];
    let whereConditions = [];

    if (userId) {
      whereConditions.push('user_id = ?');
      params.push(userId);
    }

    if (startDate) {
      whereConditions.push('timestamp >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('timestamp <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get operation counts
    const [operationCounts] = await conn.query(
      `SELECT operation_type, COUNT(*) as count 
       FROM audit_logs ${whereClause}
       GROUP BY operation_type`,
      params
    );

    // Get entity type counts
    const [entityCounts] = await conn.query(
      `SELECT entity_type, COUNT(*) as count 
       FROM audit_logs ${whereClause}
       GROUP BY entity_type`,
      params
    );

    // Get status counts
    const [statusCounts] = await conn.query(
      `SELECT status, COUNT(*) as count 
       FROM audit_logs ${whereClause}
       GROUP BY status`,
      params
    );

    // Get top users
    const [topUsers] = await conn.query(
      `SELECT user_name, user_email, COUNT(*) as count 
       FROM audit_logs ${whereClause}
       GROUP BY user_id, user_name, user_email
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get recent activity (last 24 hours by hour)
    const [recentActivity] = await conn.query(
      `SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
        COUNT(*) as count
       FROM audit_logs 
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY hour
       ORDER BY hour ASC`,
      []
    );

    return {
      success: true,
      data: {
        operationCounts: operationCounts.reduce((acc, row) => {
          acc[row.operation_type] = row.count;
          return acc;
        }, {}),
        entityCounts: entityCounts.reduce((acc, row) => {
          acc[row.entity_type] = row.count;
          return acc;
        }, {}),
        statusCounts: statusCounts.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {}),
        topUsers: topUsers.map(u => ({
          userName: u.user_name,
          userEmail: u.user_email,
          activityCount: u.count
        })),
        recentActivity: recentActivity.map(a => ({
          hour: a.hour,
          count: a.count
        }))
      }
    };
  } finally {
    conn.release();
  }
}

/**
 * Delete old audit logs (cleanup)
 */
export async function cleanupOldLogs(daysToKeep = 90) {
  const conn = await getPool().getConnection();
  try {
    const [result] = await conn.query(
      'DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );
    
    return {
      success: true,
      deletedCount: result.affectedRows
    };
  } finally {
    conn.release();
  }
}
