import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { 
  listFiles, 
  createFolder, 
  deleteFile, 
  renameFile,
  uploadFile 
} from '../controllers/fileController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/files?parentId=<id>
 * List files and folders for the authenticated user
 * Query params:
 *   - parentId: (optional) ID of parent folder. If not provided, fetches root items.
 */
router.get('/', listFiles);

/**
 * POST /api/files/folder
 * Create a new folder
 * Body:
 *   - name: Folder name (required)
 *   - parentId: Parent folder ID (optional, null for root)
 */
router.post('/folder', createFolder);

/**
 * POST /api/files/upload
 * Upload a file
 * Form data:
 *   - file: File to upload (required)
 *   - parentId: Parent folder ID (optional, null for root)
 */
router.post('/upload', upload.single('file'), uploadFile);

/**
 * DELETE /api/files/:id
 * Delete a file or folder (cascades to children)
 * Params:
 *   - id: File/folder ID
 */
router.delete('/:id', deleteFile);

/**
 * PATCH /api/files/:id
 * Rename a file or folder
 * Params:
 *   - id: File/folder ID
 * Body:
 *   - name: New name
 */
router.patch('/:id', renameFile);

export default router;
