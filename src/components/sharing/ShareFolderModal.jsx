import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUserPlus,
  FaTimes,
  FaUsers,
  FaTrash,
  FaEye,
  FaEdit,
  FaUserShield,
  FaEnvelope
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const ShareFolderModal = ({ folder, onClose, onUpdate }) => {
  const [userEmail, setUserEmail] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (folder) {
      fetchSharedUsers();
    }
  }, [folder]);

  const fetchSharedUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/sharing/folder/${folder.id}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setSharedUsers(data.data);
      }
    } catch (error) {
      console.error('Fetch shared users error:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    
    if (!userEmail.trim()) {
      toast.error('Please enter user email');
      return;
    }

    setLoading(true);
    console.log('📤 Sharing folder:', { folderId: folder.id, userEmail, permission });
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/sharing/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          folderId: folder.id,
          userEmail: userEmail.trim(),
          permission
        })
      });

      const data = await response.json();
      console.log('📦 Share response:', data);

      if (data.success) {
        toast.success(data.message);
        setUserEmail('');
        setPermission('viewer');
        fetchSharedUsers();
        if (onUpdate) onUpdate();
      } else {
        toast.error(data.error || 'Failed to share folder');
      }
    } catch (error) {
      console.error('Share folder error:', error);
      toast.error('Failed to share folder');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Remove this user from the shared folder?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/sharing/folder/${folder.id}/user/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User removed successfully');
        fetchSharedUsers();
        if (onUpdate) onUpdate();
      } else {
        toast.error(data.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Remove user error:', error);
      toast.error('Failed to remove user');
    }
  };

  const getPermissionIcon = (perm) => {
    switch (perm) {
      case 'admin': return <FaUserShield className="text-danger" />;
      case 'editor': return <FaEdit className="text-primary" />;
      case 'viewer': return <FaEye className="text-secondary" />;
      default: return null;
    }
  };

  const getPermissionBadge = (perm) => {
    const colors = {
      admin: 'danger',
      editor: 'primary',
      viewer: 'secondary'
    };
    return (
      <span className={`badge bg-${colors[perm]} ms-2`}>
        {perm.charAt(0).toUpperCase() + perm.slice(1)}
      </span>
    );
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <motion.div
          className="modal-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="modal-header">
            <div>
              <h5 className="modal-title">
                <FaUsers className="me-2" />
                Share "{folder.name}"
              </h5>
              <small className="text-muted">
                Share this folder with other users and manage permissions
              </small>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Share Form */}
            <form onSubmit={handleShare} className="mb-4">
              <div className="card bg-light">
                <div className="card-body">
                  <h6 className="mb-3">
                    <FaUserPlus className="me-2" />
                    Add User
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">User Email</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaEnvelope />
                        </span>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="user@example.com"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Permission</label>
                      <select
                        className="form-select"
                        value={permission}
                        onChange={(e) => setPermission(e.target.value)}
                      >
                        <option value="viewer">Viewer (Read Only)</option>
                        <option value="editor">Editor (Read + Write)</option>
                        <option value="admin">Admin (Full Control)</option>
                      </select>
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                      <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                      >
                        {loading ? 'Sharing...' : 'Share'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Permission Legend */}
            <div className="mb-3">
              <small className="text-muted d-block mb-2"><strong>Permissions:</strong></small>
              <div className="d-flex gap-3 flex-wrap">
                <small>
                  <FaEye className="text-secondary me-1" />
                  <strong>Viewer:</strong> Can view and download
                </small>
                <small>
                  <FaEdit className="text-primary me-1" />
                  <strong>Editor:</strong> Can view, download, and upload
                </small>
                <small>
                  <FaUserShield className="text-danger me-1" />
                  <strong>Admin:</strong> Full control + manage sharing
                </small>
              </div>
            </div>

            {/* Shared Users List */}
            <div>
              <h6 className="mb-3">
                Shared With ({sharedUsers.length})
              </h6>

              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : sharedUsers.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaUsers size={48} className="mb-3 opacity-25" />
                  <p>This folder is not shared with anyone yet</p>
                </div>
              ) : (
                <div className="list-group">
                  {sharedUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      className="list-group-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div
                            className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{ width: '40px', height: '40px' }}
                          >
                            {getPermissionIcon(user.permission)}
                          </div>
                          <div>
                            <h6 className="mb-0">{user.name}</h6>
                            <small className="text-muted">{user.email}</small>
                            {getPermissionBadge(user.permission)}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveUser(user.id)}
                          title="Remove user"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ShareFolderModal;
