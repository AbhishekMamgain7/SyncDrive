import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBell, 
  FaEnvelope, 
  FaUpload, 
  FaExclamationTriangle, 
  FaShare,
  FaCheckCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const NotificationSettings = ({ onClose }) => {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    quotaAlerts: true,
    uploadNotifications: true,
    shareNotifications: true,
    errorNotifications: true,
    notificationFrequency: 'realtime'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/notifications/preferences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Fetch preferences error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Notification preferences saved');
        if (onClose) onClose();
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Save preferences error:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="notification-settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <FaBell className="me-2" />
            Notification Settings
          </h5>
        </div>
        <div className="card-body">
          {/* Email Notifications */}
          <div className="mb-4">
            <h6 className="fw-bold mb-3">
              <FaEnvelope className="me-2 text-primary" />
              Email Notifications
            </h6>
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                id="emailNotifications"
              />
              <label className="form-check-label" htmlFor="emailNotifications">
                Enable email notifications
              </label>
            </div>
            <small className="text-muted">
              Receive notifications via email in addition to in-app notifications
            </small>
          </div>

          <hr />

          {/* Notification Types */}
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Notification Types</h6>
            
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={preferences.uploadNotifications}
                onChange={(e) => handleChange('uploadNotifications', e.target.checked)}
                id="uploadNotifications"
              />
              <label className="form-check-label" htmlFor="uploadNotifications">
                <FaUpload className="me-2 text-info" />
                Upload & Download Notifications
              </label>
              <div>
                <small className="text-muted">Get notified when files are uploaded or downloaded</small>
              </div>
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={preferences.shareNotifications}
                onChange={(e) => handleChange('shareNotifications', e.target.checked)}
                id="shareNotifications"
              />
              <label className="form-check-label" htmlFor="shareNotifications">
                <FaShare className="me-2 text-success" />
                Sharing Notifications
              </label>
              <div>
                <small className="text-muted">Get notified when files are shared with you</small>
              </div>
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={preferences.quotaAlerts}
                onChange={(e) => handleChange('quotaAlerts', e.target.checked)}
                id="quotaAlerts"
              />
              <label className="form-check-label" htmlFor="quotaAlerts">
                <FaExclamationTriangle className="me-2 text-warning" />
                Storage Quota Alerts
              </label>
              <div>
                <small className="text-muted">Get alerted when storage is running low</small>
              </div>
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={preferences.errorNotifications}
                onChange={(e) => handleChange('errorNotifications', e.target.checked)}
                id="errorNotifications"
              />
              <label className="form-check-label" htmlFor="errorNotifications">
                <FaCheckCircle className="me-2 text-danger" />
                Error Notifications
              </label>
              <div>
                <small className="text-muted">Get notified about system errors and failures</small>
              </div>
            </div>
          </div>

          <hr />

          {/* Frequency */}
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Notification Frequency</h6>
            <select
              className="form-select"
              value={preferences.notificationFrequency}
              onChange={(e) => handleChange('notificationFrequency', e.target.value)}
            >
              <option value="realtime">Real-time (Instant)</option>
              <option value="hourly">Hourly Digest</option>
              <option value="daily">Daily Digest</option>
            </select>
            <small className="text-muted">
              Choose how often you want to receive email notifications
            </small>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end gap-2">
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationSettings;
