import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBell,
  FaFile,
  FaFolder,
  FaDownload,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaTimes,
  FaCog
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const NotificationCenter = ({ isOpen, onClose, onSettingsClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${API_URL}/notifications?unreadOnly=${filter === 'unread'}&limit=20`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.unreadCount);
        fetchNotifications();
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setUnreadCount(0);
        fetchNotifications();
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        fetchNotifications();
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Delete notification error:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      upload: <FaFile className="text-primary" />,
      download: <FaDownload className="text-info" />,
      delete: <FaTrash className="text-danger" />,
      share: <FaFolder className="text-success" />,
      quota: <FaExclamationTriangle className="text-warning" />,
      error: <FaTimes className="text-danger" />,
      success: <FaCheckCircle className="text-success" />,
      info: <FaInfoCircle className="text-info" />,
      warning: <FaExclamationTriangle className="text-warning" />
    };
    return icons[type] || <FaBell />;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          className="notification-center shadow-lg rounded-3 bg-white"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: '60px',
            right: '20px',
            width: '420px',
            maxHeight: '600px',
            zIndex: 1050,
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {/* Header */}
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-0 fw-bold">Notifications</h6>
              <small className="text-muted">{unreadCount} unread</small>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={onSettingsClick}
                title="Notification Settings"
              >
                <FaCog />
              </button>
              {unreadCount > 0 && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="px-3 py-2 border-bottom bg-light">
            <div className="btn-group btn-group-sm w-100">
              <button
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="notification-list" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaBell size={48} className="mb-3 opacity-25" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  className={`notification-item border-bottom p-3 ${!notification.isRead ? 'bg-light' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
                >
                  <div className="d-flex gap-3">
                    <div className="notification-icon-wrapper mt-1">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                        style={{ width: '40px', height: '40px' }}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 fw-bold" style={{ fontSize: '14px' }}>
                          {notification.title}
                          {!notification.isRead && (
                            <span className="badge bg-primary ms-2" style={{ fontSize: '10px' }}>New</span>
                          )}
                        </h6>
                        <button
                          className="btn btn-sm btn-link text-muted p-0"
                          onClick={() => handleDelete(notification.id)}
                          title="Delete"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                      <p className="mb-1 text-muted" style={{ fontSize: '13px' }}>
                        {notification.message}
                      </p>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className="text-muted">{formatTime(notification.createdAt)}</small>
                        {!notification.isRead && (
                          <button
                            className="btn btn-sm btn-link text-primary p-0"
                            onClick={() => handleMarkAsRead(notification.id)}
                            style={{ fontSize: '12px' }}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-top text-center bg-light">
              <button className="btn btn-sm btn-link text-decoration-none">
                View All Notifications
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
