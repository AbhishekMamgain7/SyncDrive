import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHistory,
  FaDownload,
  FaUndo,
  FaTrash,
  FaClock,
  FaUser,
  FaCheckCircle,
  FaExchangeAlt,
  FaTimes,
  FaFileAlt,
  FaChartLine
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const FileVersionHistory = ({ file, onClose, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    if (file) {
      fetchVersions();
      fetchStats();
    }
  }, [file]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/versions/file/${file.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setVersions(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch version history');
      }
    } catch (error) {
      console.error('Fetch versions error:', error);
      toast.error('Failed to fetch version history');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/versions/file/${file.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleDownload = async (versionId, fileName, versionNumber) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/versions/${versionId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_v${versionNumber}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Version downloaded successfully');
    } catch (error) {
      console.error('Download version error:', error);
      toast.error('Failed to download version');
    }
  };

  const handleRestore = async (versionId, versionNumber) => {
    if (!confirm(`Are you sure you want to restore to version ${versionNumber}? This will create a backup of the current version.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchVersions();
        if (onRestore) onRestore();
      } else {
        toast.error(data.error || 'Failed to restore version');
      }
    } catch (error) {
      console.error('Restore version error:', error);
      toast.error('Failed to restore version');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('This will delete old versions, keeping only the 10 most recent. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/versions/file/${file.id}/cleanup?keep=10`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchVersions();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to cleanup versions');
      }
    } catch (error) {
      console.error('Cleanup versions error:', error);
      toast.error('Failed to cleanup versions');
    }
  };

  const handleSelectVersion = (versionId) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    }
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) {
      toast.error('Please select exactly 2 versions to compare');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/versions/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          versionId1: selectedVersions[0],
          versionId2: selectedVersions[1]
        })
      });

      const data = await response.json();

      if (data.success) {
        setComparison(data.data);
      } else {
        toast.error(data.error || 'Failed to compare versions');
      }
    } catch (error) {
      console.error('Compare versions error:', error);
      toast.error('Failed to compare versions');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <motion.div
          className="modal-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="modal-header">
            <div>
              <h5 className="modal-title">
                <FaHistory className="me-2" />
                Version History - {file.name}
              </h5>
              {stats && (
                <small className="text-muted">
                  {stats.totalVersions} version{stats.totalVersions !== 1 ? 's' : ''} • 
                  Total size: {formatFileSize(stats.totalSize)} • 
                  {stats.contributors} contributor{stats.contributors !== 1 ? 's' : ''}
                </small>
              )}
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {/* Actions */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${compareMode ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setCompareMode(!compareMode);
                    setSelectedVersions([]);
                    setComparison(null);
                  }}
                >
                  <FaExchangeAlt className="me-1" />
                  Compare Mode
                </button>
                {compareMode && selectedVersions.length === 2 && (
                  <button className="btn btn-success" onClick={handleCompare}>
                    Compare Selected
                  </button>
                )}
              </div>
              <button className="btn btn-sm btn-outline-danger" onClick={handleCleanup}>
                <FaTrash className="me-1" />
                Cleanup Old Versions
              </button>
            </div>

            {/* Comparison Result */}
            {comparison && (
              <motion.div
                className="card mb-3 bg-light"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Version Comparison</h6>
                  <button className="btn btn-sm btn-link" onClick={() => setComparison(null)}>
                    <FaTimes />
                  </button>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-5">
                      <h6>Version {comparison.file1.versionNumber}</h6>
                      <p className="mb-1"><strong>Size:</strong> {formatFileSize(comparison.file1.fileSize)}</p>
                      <p className="mb-1"><strong>By:</strong> {comparison.file1.userName}</p>
                      <p className="mb-1"><strong>Date:</strong> {formatDate(comparison.file1.createdAt)}</p>
                      {comparison.file1.changeDescription && (
                        <p className="mb-1"><strong>Note:</strong> {comparison.file1.changeDescription}</p>
                      )}
                    </div>
                    <div className="col-md-2 text-center d-flex align-items-center justify-content-center">
                      <div>
                        <FaExchangeAlt size={32} className="text-primary mb-2" />
                        <div>
                          {comparison.differences.identicalContent ? (
                            <span className="badge bg-success">Identical</span>
                          ) : (
                            <span className="badge bg-warning">Different</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-5">
                      <h6>Version {comparison.file2.versionNumber}</h6>
                      <p className="mb-1"><strong>Size:</strong> {formatFileSize(comparison.file2.fileSize)}</p>
                      <p className="mb-1"><strong>By:</strong> {comparison.file2.userName}</p>
                      <p className="mb-1"><strong>Date:</strong> {formatDate(comparison.file2.createdAt)}</p>
                      {comparison.file2.changeDescription && (
                        <p className="mb-1"><strong>Note:</strong> {comparison.file2.changeDescription}</p>
                      )}
                    </div>
                  </div>
                  <hr />
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1">
                        <strong>Size Change:</strong> 
                        <span className={comparison.differences.sizeChange > 0 ? 'text-success' : comparison.differences.sizeChange < 0 ? 'text-danger' : ''}>
                          {' '}{comparison.differences.sizeChange > 0 ? '+' : ''}{formatFileSize(Math.abs(comparison.differences.sizeChange))}
                          {' '}({comparison.differences.sizeChangePercent}%)
                        </span>
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Version Gap:</strong> {comparison.differences.versionDifference} version(s)</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Version List */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center text-muted py-5">
                <FaHistory size={48} className="mb-3 opacity-25" />
                <p>No version history available</p>
              </div>
            ) : (
              <div className="version-timeline">
                {versions.map((version, index) => (
                  <motion.div
                    key={version.id}
                    className={`card mb-3 ${version.isCurrent ? 'border-primary' : ''} ${
                      compareMode && selectedVersions.includes(version.id) ? 'border-success' : ''
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            {compareMode && (
                              <div className="form-check me-3">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={selectedVersions.includes(version.id)}
                                  onChange={() => handleSelectVersion(version.id)}
                                  disabled={selectedVersions.length === 2 && !selectedVersions.includes(version.id)}
                                />
                              </div>
                            )}
                            <FaFileAlt className="text-primary me-2" />
                            <h6 className="mb-0">
                              Version {version.versionNumber}
                              {version.isCurrent && (
                                <span className="badge bg-primary ms-2">Current</span>
                              )}
                            </h6>
                          </div>
                          <div className="row mt-2">
                            <div className="col-md-6">
                              <p className="mb-1">
                                <FaUser className="text-muted me-2" size={14} />
                                <small>{version.userName}</small>
                              </p>
                              <p className="mb-1">
                                <FaClock className="text-muted me-2" size={14} />
                                <small>{formatDate(version.createdAt)} ({formatTimeAgo(version.createdAt)})</small>
                              </p>
                            </div>
                            <div className="col-md-6">
                              <p className="mb-1">
                                <small><strong>Size:</strong> {formatFileSize(version.fileSize)}</small>
                              </p>
                              {version.changeDescription && (
                                <p className="mb-1">
                                  <small className="text-muted fst-italic">"{version.changeDescription}"</small>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {!compareMode && (
                          <div className="btn-group-vertical btn-group-sm ms-3">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleDownload(version.id, version.fileName, version.versionNumber)}
                              title="Download"
                            >
                              <FaDownload className="me-1" />
                              Download
                            </button>
                            {!version.isCurrent && (
                              <button
                                className="btn btn-outline-success"
                                onClick={() => handleRestore(version.id, version.versionNumber)}
                                title="Restore"
                              >
                                <FaUndo className="me-1" />
                                Restore
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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

export default FileVersionHistory;
