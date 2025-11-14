import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaFolderOpen,
  FaUser,
  FaCalendar,
  FaEye,
  FaEdit,
  FaUserShield,
  FaExternalLinkAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const SharedWithMe = ({ onNavigateToFolder }) => {
  const [sharedFolders, setSharedFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingFolder, setAddingFolder] = useState(null);

  useEffect(() => {
    fetchSharedFolders();
  }, []);

  const fetchSharedFolders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔍 Fetching shared folders...');
      
      const response = await fetch(`${API_URL}/sharing/shared-with-me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      console.log('📦 Shared folders response:', data);
      
      if (data.success) {
        setSharedFolders(data.data);
        console.log('✅ Shared folders loaded:', data.data.length);
      } else {
        toast.error('Failed to load shared folders');
      }
    } catch (error) {
      console.error('Fetch shared folders error:', error);
      toast.error('Failed to load shared folders');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMyFiles = async (folder) => {
    setAddingFolder(folder.id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/sharing/add-to-my-files/${folder.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Folder added to My Files');
        fetchSharedFolders();
      } else {
        toast.error(data.error || 'Failed to add folder');
      }
    } catch (error) {
      console.error('Add to my files error:', error);
      toast.error('Failed to add folder');
    } finally {
      setAddingFolder(null);
    }
  };

  const handleRemoveFromMyFiles = async (folder) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/sharing/remove-from-my-files/${folder.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Folder removed from My Files');
        fetchSharedFolders();
      } else {
        toast.error(data.error || 'Failed to remove folder');
      }
    } catch (error) {
      console.error('Remove from my files error:', error);
      toast.error('Failed to remove folder');
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'admin':
        return <FaUserShield className="text-danger" title="Admin" />;
      case 'editor':
        return <FaEdit className="text-primary" title="Editor" />;
      case 'viewer':
        return <FaEye className="text-secondary" title="Viewer" />;
      default:
        return null;
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'admin': return 'danger';
      case 'editor': return 'primary';
      case 'viewer': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
    <div className="shared-with-me">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Shared With Me</h4>
          <p className="text-muted mb-0">
            Folders that others have shared with you
          </p>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={fetchSharedFolders}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {sharedFolders.length === 0 ? (
        <div className="text-center py-5">
          <FaFolderOpen size={64} className="text-muted mb-3 opacity-25" />
          <h5 className="text-muted">No Shared Folders</h5>
          <p className="text-muted">
            When someone shares a folder with you, it will appear here
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {sharedFolders.map((folder, index) => (
            <div key={folder.id} className="col-md-6 col-lg-4">
              <motion.div
                className="card h-100 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-2">
                        <FaFolderOpen className="text-primary me-2" size={24} />
                        <h6 className="mb-0 text-truncate">{folder.name}</h6>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {getPermissionIcon(folder.permission)}
                        <span className={`badge bg-${getPermissionColor(folder.permission)}`}>
                          {folder.permission.charAt(0).toUpperCase() + folder.permission.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-flex align-items-center mb-1">
                      <FaUser className="me-2" />
                      Shared by: <strong className="ms-1">{folder.ownerName}</strong>
                    </small>
                    <small className="text-muted d-flex align-items-center">
                      <FaCalendar className="me-2" />
                      {formatDate(folder.sharedAt)}
                    </small>
                  </div>

                  {folder.addedToMyFiles ? (
                    <button
                      className="btn btn-outline-danger w-100"
                      onClick={() => handleRemoveFromMyFiles(folder)}
                    >
                      <FaExternalLinkAlt className="me-2" />
                      Remove from My Files
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary w-100"
                      onClick={() => handleAddToMyFiles(folder)}
                      disabled={addingFolder === folder.id}
                    >
                      {addingFolder === folder.id ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <FaExternalLinkAlt className="me-2" />
                          Add to My Files
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedWithMe;
