import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getFileVersions,
  getFileVersion,
  restoreFileVersion,
  compareFileVersions,
  deleteOldVersions,
  getVersionStats
} from '../services/versionService.js';
import fs from 'fs';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/versions/file/:fileId
 * Get all versions of a file
 */
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const result = await getFileVersions(parseInt(fileId), userId);

    res.json(result);
  } catch (error) {
    console.error('Get file versions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch file versions' });
  }
});

/**
 * GET /api/versions/:versionId
 * Get a specific version
 */
router.get('/:versionId', async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    const result = await getFileVersion(parseInt(versionId), userId);

    res.json(result);
  } catch (error) {
    console.error('Get file version error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch file version' });
  }
});

/**
 * GET /api/versions/:versionId/download
 * Download a specific version
 */
router.get('/:versionId/download', async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    const result = await getFileVersion(parseInt(versionId), userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    const version = result.data;

    if (!fs.existsSync(version.filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Version file not found on disk' 
      });
    }

    res.download(version.filePath, `${version.fileName}_v${version.versionNumber}`, (err) => {
      if (err) {
        console.error('Download version error:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            error: 'Failed to download version' 
          });
        }
      }
    });
  } catch (error) {
    console.error('Download version error:', error);
    res.status(500).json({ success: false, error: 'Failed to download version' });
  }
});

/**
 * POST /api/versions/:versionId/restore
 * Restore a file to a specific version
 */
router.post('/:versionId/restore', async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;
    const userName = req.user.name;

    const result = await restoreFileVersion(parseInt(versionId), userId, userName);

    res.json(result);
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ success: false, error: 'Failed to restore version' });
  }
});

/**
 * POST /api/versions/compare
 * Compare two file versions
 * Body: { versionId1, versionId2 }
 */
router.post('/compare', async (req, res) => {
  try {
    const { versionId1, versionId2 } = req.body;
    const userId = req.user.id;

    if (!versionId1 || !versionId2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both version IDs are required' 
      });
    }

    const result = await compareFileVersions(
      parseInt(versionId1), 
      parseInt(versionId2), 
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Compare versions error:', error);
    res.status(500).json({ success: false, error: 'Failed to compare versions' });
  }
});

/**
 * DELETE /api/versions/file/:fileId/cleanup
 * Delete old versions, keeping only recent N versions
 * Query: ?keep=10
 */
router.delete('/file/:fileId/cleanup', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { keep = 10 } = req.query;
    const userId = req.user.id;

    const result = await deleteOldVersions(
      parseInt(fileId), 
      parseInt(keep), 
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Cleanup versions error:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup versions' });
  }
});

/**
 * GET /api/versions/file/:fileId/stats
 * Get version statistics for a file
 */
router.get('/file/:fileId/stats', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const result = await getVersionStats(parseInt(fileId), userId);

    res.json(result);
  } catch (error) {
    console.error('Get version stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch version stats' });
  }
});

export default router;
