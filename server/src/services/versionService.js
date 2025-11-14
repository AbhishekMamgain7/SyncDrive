import { getPool } from '../db.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logAudit } from './auditLogger.js';
import { createNotification } from './notificationService.js';

/**
 * Calculate file checksum (SHA256)
 */
function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Create a new file version
 */
export async function createFileVersion({
  fileId,
  filePath,
  fileName,
  fileSize,
  mimeType,
  userId,
  userName,
  changeDescription = null
}) {
  try {
    const conn = await getPool().getConnection();
    try {
      // Get the current max version number for this file
      const [versions] = await conn.query(
        'SELECT MAX(version_number) as maxVersion FROM file_versions WHERE file_id = ?',
        [fileId]
      );
      
      const nextVersion = (versions[0].maxVersion || 0) + 1;
      
      // Calculate checksum
      const checksum = await calculateChecksum(filePath);
      
      // Check if this exact version already exists (same checksum)
      const [existing] = await conn.query(
        'SELECT id FROM file_versions WHERE file_id = ? AND checksum = ?',
        [fileId, checksum]
      );
      
      if (existing.length > 0) {
        return { 
          success: true, 
          message: 'No changes detected - file is identical to previous version',
          versionId: existing[0].id,
          isDuplicate: true
        };
      }
      
      // Create version directory if it doesn't exist
      const versionDir = path.join('uploads', 'versions', fileId.toString());
      if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir, { recursive: true });
      }
      
      // Copy file to version storage
      const versionFileName = `v${nextVersion}_${Date.now()}_${fileName}`;
      const versionPath = path.join(versionDir, versionFileName);
      fs.copyFileSync(filePath, versionPath);
      
      // Mark all previous versions as not current
      await conn.query(
        'UPDATE file_versions SET is_current = FALSE WHERE file_id = ?',
        [fileId]
      );
      
      // Insert new version
      const [result] = await conn.query(
        `INSERT INTO file_versions 
         (file_id, version_number, file_name, file_path, file_size, mime_type, checksum, 
          user_id, user_name, change_description, is_current)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [fileId, nextVersion, fileName, versionPath, fileSize, mimeType, checksum, 
         userId, userName, changeDescription]
      );
      
      return { 
        success: true, 
        versionId: result.insertId,
        versionNumber: nextVersion,
        message: `Version ${nextVersion} created successfully`
      };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create file version error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all versions of a file
 */
export async function getFileVersions(fileId, userId = null) {
  try {
    const conn = await getPool().getConnection();
    try {
      let query = `
        SELECT 
          v.id,
          v.file_id as fileId,
          v.version_number as versionNumber,
          v.file_name as fileName,
          v.file_size as fileSize,
          v.mime_type as mimeType,
          v.checksum,
          v.user_id as userId,
          v.user_name as userName,
          v.change_description as changeDescription,
          v.is_current as isCurrent,
          v.created_at as createdAt
        FROM file_versions v
        WHERE v.file_id = ?
      `;
      
      const params = [fileId];
      
      // If userId is provided, verify access to the file
      if (userId) {
        query += ' AND EXISTS (SELECT 1 FROM files f WHERE f.id = v.file_id AND f.user_id = ?)';
        params.push(userId);
      }
      
      query += ' ORDER BY v.version_number DESC';
      
      const [versions] = await conn.query(query, params);
      
      return { success: true, data: versions };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get file versions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific file version
 */
export async function getFileVersion(versionId, userId = null) {
  try {
    const conn = await getPool().getConnection();
    try {
      let query = `
        SELECT 
          v.id,
          v.file_id as fileId,
          v.version_number as versionNumber,
          v.file_name as fileName,
          v.file_path as filePath,
          v.file_size as fileSize,
          v.mime_type as mimeType,
          v.checksum,
          v.user_id as userId,
          v.user_name as userName,
          v.change_description as changeDescription,
          v.is_current as isCurrent,
          v.created_at as createdAt
        FROM file_versions v
        WHERE v.id = ?
      `;
      
      const params = [versionId];
      
      if (userId) {
        query += ' AND EXISTS (SELECT 1 FROM files f WHERE f.id = v.file_id AND f.user_id = ?)';
        params.push(userId);
      }
      
      const [versions] = await conn.query(query, params);
      
      if (versions.length === 0) {
        return { success: false, error: 'Version not found or access denied' };
      }
      
      return { success: true, data: versions[0] };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get file version error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore a file to a specific version
 */
export async function restoreFileVersion(versionId, userId, userName) {
  try {
    const conn = await getPool().getConnection();
    try {
      // Get the version details
      const versionResult = await getFileVersion(versionId, userId);
      if (!versionResult.success) {
        return versionResult;
      }
      
      const version = versionResult.data;
      
      // Check if version file exists
      if (!fs.existsSync(version.filePath)) {
        return { success: false, error: 'Version file not found on disk' };
      }
      
      // Get current file details
      const [files] = await conn.query(
        'SELECT id, name, path, user_id FROM files WHERE id = ? AND user_id = ?',
        [version.fileId, userId]
      );
      
      if (files.length === 0) {
        return { success: false, error: 'File not found or access denied' };
      }
      
      const currentFile = files[0];
      
      // Create a version of the current file before restoring
      if (currentFile.path && fs.existsSync(currentFile.path)) {
        const stats = fs.statSync(currentFile.path);
        await createFileVersion({
          fileId: version.fileId,
          filePath: currentFile.path,
          fileName: currentFile.name,
          fileSize: stats.size,
          mimeType: version.mimeType,
          userId,
          userName,
          changeDescription: 'Auto-saved before restore'
        });
      }
      
      // Copy the old version to the current file location
      const newPath = currentFile.path || path.join('uploads', `${Date.now()}_${version.fileName}`);
      fs.copyFileSync(version.filePath, newPath);
      
      // Update the current file record
      await conn.query(
        'UPDATE files SET path = ?, updated_at = NOW() WHERE id = ?',
        [newPath, version.fileId]
      );
      
      // Mark this version as current
      await conn.query(
        'UPDATE file_versions SET is_current = FALSE WHERE file_id = ?',
        [version.fileId]
      );
      
      await conn.query(
        'UPDATE file_versions SET is_current = TRUE WHERE id = ?',
        [versionId]
      );
      
      // Log audit
      await logAudit({
        userId,
        userName,
        userEmail: '',
        operationType: 'rename',
        entityType: 'file',
        entityId: version.fileId.toString(),
        entityName: version.fileName,
        details: { 
          action: 'restore_version',
          versionNumber: version.versionNumber,
          versionId
        }
      });
      
      // Notify user
      await createNotification({
        userId,
        type: 'success',
        title: 'File Restored',
        message: `File "${version.fileName}" has been restored to version ${version.versionNumber}`,
        priority: 'normal',
        data: { fileId: version.fileId, versionId, versionNumber: version.versionNumber }
      });
      
      return { 
        success: true, 
        message: `File restored to version ${version.versionNumber}`,
        versionNumber: version.versionNumber
      };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Restore file version error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Compare two file versions
 */
export async function compareFileVersions(versionId1, versionId2, userId) {
  try {
    const version1Result = await getFileVersion(versionId1, userId);
    const version2Result = await getFileVersion(versionId2, userId);
    
    if (!version1Result.success || !version2Result.success) {
      return { success: false, error: 'One or both versions not found' };
    }
    
    const v1 = version1Result.data;
    const v2 = version2Result.data;
    
    // Verify they belong to the same file
    if (v1.fileId !== v2.fileId) {
      return { success: false, error: 'Versions belong to different files' };
    }
    
    const comparison = {
      file1: {
        versionId: v1.id,
        versionNumber: v1.versionNumber,
        fileName: v1.fileName,
        fileSize: v1.fileSize,
        checksum: v1.checksum,
        userName: v1.userName,
        createdAt: v1.createdAt,
        changeDescription: v1.changeDescription
      },
      file2: {
        versionId: v2.id,
        versionNumber: v2.versionNumber,
        fileName: v2.fileName,
        fileSize: v2.fileSize,
        checksum: v2.checksum,
        userName: v2.userName,
        createdAt: v2.createdAt,
        changeDescription: v2.changeDescription
      },
      differences: {
        sizeChange: v2.fileSize - v1.fileSize,
        sizeChangePercent: v1.fileSize > 0 ? ((v2.fileSize - v1.fileSize) / v1.fileSize * 100).toFixed(2) : 0,
        identicalContent: v1.checksum === v2.checksum,
        timeSpan: new Date(v2.createdAt) - new Date(v1.createdAt),
        versionDifference: Math.abs(v2.versionNumber - v1.versionNumber)
      }
    };
    
    return { success: true, data: comparison };
  } catch (error) {
    console.error('Compare versions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete old versions (cleanup)
 */
export async function deleteOldVersions(fileId, keepCount = 10, userId = null) {
  try {
    const conn = await getPool().getConnection();
    try {
      // Verify file access if userId provided
      if (userId) {
        const [files] = await conn.query(
          'SELECT id FROM files WHERE id = ? AND user_id = ?',
          [fileId, userId]
        );
        
        if (files.length === 0) {
          return { success: false, error: 'File not found or access denied' };
        }
      }
      
      // Get versions to delete (keep the most recent N versions)
      const [versionsToDelete] = await conn.query(
        `SELECT id, file_path FROM file_versions 
         WHERE file_id = ? AND is_current = FALSE
         ORDER BY version_number DESC
         LIMIT 999 OFFSET ?`,
        [fileId, keepCount - 1]
      );
      
      let deletedCount = 0;
      
      for (const version of versionsToDelete) {
        // Delete physical file
        if (fs.existsSync(version.file_path)) {
          fs.unlinkSync(version.file_path);
        }
        
        // Delete database record
        await conn.query('DELETE FROM file_versions WHERE id = ?', [version.id]);
        deletedCount++;
      }
      
      return { 
        success: true, 
        message: `Deleted ${deletedCount} old version(s)`,
        deletedCount
      };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete old versions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get version statistics for a file
 */
export async function getVersionStats(fileId, userId = null) {
  try {
    const conn = await getPool().getConnection();
    try {
      let query = `
        SELECT 
          COUNT(*) as totalVersions,
          SUM(file_size) as totalSize,
          MIN(created_at) as firstVersion,
          MAX(created_at) as lastVersion,
          COUNT(DISTINCT user_id) as contributors
        FROM file_versions
        WHERE file_id = ?
      `;
      
      const params = [fileId];
      
      if (userId) {
        query += ' AND EXISTS (SELECT 1 FROM files f WHERE f.id = file_id AND f.user_id = ?)';
        params.push(userId);
      }
      
      const [stats] = await conn.query(query, params);
      
      return { success: true, data: stats[0] };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get version stats error:', error);
    return { success: false, error: error.message };
  }
}
