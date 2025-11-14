import { getPool } from '../db.js';
import { broadcastToUser } from '../websocket.js';
import nodemailer from 'nodemailer';

// Email transporter (configure with your SMTP settings)
let transporter = null;

// Initialize email transporter
export function initEmailTransporter() {
  // Use environment variables for email configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('✓ Email transporter initialized');
  } else {
    console.log('⚠ Email not configured. Set SMTP_* environment variables to enable email notifications.');
  }
}

/**
 * Create a notification
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  data = null,
  priority = 'normal',
  actionUrl = null,
  sendEmail = false
}) {
  try {
    const conn = await getPool().getConnection();
    try {
      // Insert notification
      const [result] = await conn.query(
        `INSERT INTO notifications (user_id, type, title, message, data, priority, action_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, type, title, message, data ? JSON.stringify(data) : null, priority, actionUrl]
      );

      const notificationId = result.insertId;

      // Get the created notification
      const [notification] = await conn.query(
        `SELECT 
          id, user_id as userId, type, title, message, data,
          is_read as isRead, priority, action_url as actionUrl,
          email_sent as emailSent, created_at as createdAt
        FROM notifications WHERE id = ?`,
        [notificationId]
      );

      const notif = {
        ...notification[0],
        data: notification[0].data ? JSON.parse(notification[0].data) : null
      };

      // Broadcast to user via WebSocket
      broadcastToUser(userId, 'notification', notif);

      // Send email if enabled and configured
      if (sendEmail) {
        await sendEmailNotification(userId, notif);
      }

      return { success: true, data: notif };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications({
  userId,
  unreadOnly = false,
  type = null,
  limit = 50,
  offset = 0
}) {
  try {
    const conn = await getPool().getConnection();
    try {
      const params = [userId];
      let whereConditions = ['user_id = ?'];

      if (unreadOnly) {
        whereConditions.push('is_read = FALSE');
      }

      if (type) {
        whereConditions.push('type = ?');
        params.push(type);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const [countResult] = await conn.query(
        `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
        params
      );

      // Get notifications
      const [notifications] = await conn.query(
        `SELECT 
          id, user_id as userId, type, title, message, data,
          is_read as isRead, priority, action_url as actionUrl,
          email_sent as emailSent, created_at as createdAt, read_at as readAt
        FROM notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const parsed = notifications.map(notif => ({
        ...notif,
        data: notif.data ? JSON.parse(notif.data) : null
      }));

      return {
        success: true,
        data: parsed,
        total: countResult[0].total,
        unreadCount: await getUnreadCount(userId)
      };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get notifications error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(userId, notificationId) {
  try {
    const conn = await getPool().getConnection();
    try {
      await conn.query(
        'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );

      const unreadCount = await getUnreadCount(userId);
      
      // Broadcast updated unread count
      broadcastToUser(userId, 'unread_count', { count: unreadCount });

      return { success: true, unreadCount };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Mark as read error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId) {
  try {
    const conn = await getPool().getConnection();
    try {
      await conn.query(
        'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      broadcastToUser(userId, 'unread_count', { count: 0 });

      return { success: true };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Mark all as read error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(userId, notificationId) {
  try {
    const conn = await getPool().getConnection();
    try {
      await conn.query(
        'DELETE FROM notifications WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );

      return { success: true };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId) {
  try {
    const conn = await getPool().getConnection();
    try {
      const [result] = await conn.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );
      return result[0].count;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId) {
  try {
    const conn = await getPool().getConnection();
    try {
      let [prefs] = await conn.query(
        `SELECT 
          email_notifications as emailNotifications,
          quota_alerts as quotaAlerts,
          upload_notifications as uploadNotifications,
          share_notifications as shareNotifications,
          error_notifications as errorNotifications,
          notification_frequency as notificationFrequency
        FROM user_preferences WHERE user_id = ?`,
        [userId]
      );

      if (prefs.length === 0) {
        // Create default preferences
        await conn.query(
          'INSERT INTO user_preferences (user_id) VALUES (?)',
          [userId]
        );
        return {
          emailNotifications: true,
          quotaAlerts: true,
          uploadNotifications: true,
          shareNotifications: true,
          errorNotifications: true,
          notificationFrequency: 'realtime'
        };
      }

      return prefs[0];
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get preferences error:', error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(userId, preferences) {
  try {
    const conn = await getPool().getConnection();
    try {
      const updates = [];
      const params = [];

      if (preferences.emailNotifications !== undefined) {
        updates.push('email_notifications = ?');
        params.push(preferences.emailNotifications);
      }
      if (preferences.quotaAlerts !== undefined) {
        updates.push('quota_alerts = ?');
        params.push(preferences.quotaAlerts);
      }
      if (preferences.uploadNotifications !== undefined) {
        updates.push('upload_notifications = ?');
        params.push(preferences.uploadNotifications);
      }
      if (preferences.shareNotifications !== undefined) {
        updates.push('share_notifications = ?');
        params.push(preferences.shareNotifications);
      }
      if (preferences.errorNotifications !== undefined) {
        updates.push('error_notifications = ?');
        params.push(preferences.errorNotifications);
      }
      if (preferences.notificationFrequency) {
        updates.push('notification_frequency = ?');
        params.push(preferences.notificationFrequency);
      }

      params.push(userId);

      await conn.query(
        `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );

      return { success: true };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update preferences error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, notification) {
  if (!transporter) {
    return; // Email not configured
  }

  try {
    const conn = await getPool().getConnection();
    try {
      // Get user email and preferences
      const [users] = await conn.query(
        'SELECT email, name FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) return;

      const user = users[0];
      const prefs = await getUserPreferences(userId);

      // Check if email notifications are enabled
      if (!prefs || !prefs.emailNotifications) return;

      // Check type-specific preferences
      if (notification.type === 'upload' && !prefs.uploadNotifications) return;
      if (notification.type === 'quota' && !prefs.quotaAlerts) return;
      if (notification.type === 'share' && !prefs.shareNotifications) return;
      if (notification.type === 'error' && !prefs.errorNotifications) return;

      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@syncdrive.com',
        to: user.email,
        subject: `SyncDrive: ${notification.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">SyncDrive Notification</h2>
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Details</a>` : ''}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">
              You received this email because you have notifications enabled in your SyncDrive account.
              <br>To manage your notification preferences, visit your account settings.
            </p>
          </div>
        `
      });

      // Mark email as sent
      await conn.query(
        'UPDATE notifications SET email_sent = TRUE WHERE id = ?',
        [notification.id]
      );

      console.log(`✓ Email sent to ${user.email} for notification ${notification.id}`);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Send email error:', error);
  }
}

/**
 * Helper function to create quota warning notification
 */
export async function notifyQuotaUsage(userId, usedBytes, totalBytes, percentage) {
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  let priority = 'normal';
  let type = 'info';
  
  if (percentage >= 90) {
    priority = 'urgent';
    type = 'warning';
  } else if (percentage >= 75) {
    priority = 'high';
    type = 'warning';
  }

  await createNotification({
    userId,
    type,
    title: `Storage ${percentage}% Full`,
    message: `You've used ${usedMB}MB of ${totalMB}MB. Consider cleaning up old files.`,
    priority,
    data: { usedBytes, totalBytes, percentage },
    sendEmail: percentage >= 90
  });
}

/**
 * Helper function to create file operation success notification
 */
export async function notifyFileOperation(userId, operation, fileName, success = true) {
  const operations = {
    upload: 'uploaded',
    download: 'downloaded',
    delete: 'deleted',
    rename: 'renamed',
    share: 'shared'
  };

  await createNotification({
    userId,
    type: success ? 'success' : 'error',
    title: success ? `File ${operations[operation]}` : `Failed to ${operation} file`,
    message: success 
      ? `${fileName} has been ${operations[operation]} successfully.`
      : `Failed to ${operation} ${fileName}. Please try again.`,
    priority: success ? 'normal' : 'high',
    data: { operation, fileName },
    sendEmail: !success // Send email only for errors
  });
}

/**
 * Helper function to create error notification
 */
export async function notifyError(userId, title, message, errorData = null) {
  await createNotification({
    userId,
    type: 'error',
    title,
    message,
    priority: 'high',
    data: errorData,
    sendEmail: true
  });
}
