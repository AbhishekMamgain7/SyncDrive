import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getUserPreferences,
  updateUserPreferences
} from '../services/notificationService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      unreadOnly = 'false',
      type = '',
      limit = 50,
      offset = 0
    } = req.query;

    const result = await getUserNotifications({
      userId,
      unreadOnly: unreadOnly === 'true',
      type: type || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await getUnreadCount(userId);

    res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await markAsRead(userId, parseInt(id));

    res.json(result);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await markAllAsRead(userId);

    res.json(result);
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await deleteNotification(userId, parseInt(id));

    res.json(result);
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;

    const preferences = await getUserPreferences(userId);

    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences
 */
router.patch('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const result = await updateUserPreferences(userId, preferences);

    res.json(result);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

export default router;
