import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaSearch, 
  FaFilter, 
  FaDownload, 
  FaTrash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaUser,
  FaFolder,
  FaFile,
  FaCog,
  FaChartBar
} from 'react-icons/fa';
import { Line, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const AuditDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    operationType: '',
    entityType: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [pagination.page, sortBy, sortOrder]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });

      const response = await fetch(`${API_URL}/audit/logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      } else {
        toast.error(data.error || 'Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([k, v]) => 
            ['startDate', 'endDate'].includes(k) && v !== ''
          )
        )
      );

      const response = await fetch(`${API_URL}/audit/stats?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
    fetchStats();
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      operationType: '',
      entityType: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      );

      const response = await fetch(`${API_URL}/audit/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const getOperationIcon = (operation) => {
    const icons = {
      create: <FaFolder className="text-success" />,
      delete: <FaTrash className="text-danger" />,
      rename: <FaCog className="text-info" />,
      upload: <FaFile className="text-primary" />,
      download: <FaDownload className="text-secondary" />,
      login: <FaUser className="text-success" />,
      logout: <FaUser className="text-muted" />
    };
    return icons[operation] || <FaCog />;
  };

  const getStatusIcon = (status) => {
    const icons = {
      success: <FaCheckCircle className="text-success" />,
      failure: <FaExclamationTriangle className="text-warning" />,
      error: <FaTimesCircle className="text-danger" />
    };
    return icons[status] || <FaCheckCircle />;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Chart data
  const operationChartData = stats ? {
    labels: Object.keys(stats.operationCounts),
    datasets: [{
      label: 'Operations',
      data: Object.values(stats.operationCounts),
      backgroundColor: [
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)'
      ]
    }]
  } : null;

  const activityChartData = stats && stats.recentActivity.length > 0 ? {
    labels: stats.recentActivity.map(a => new Date(a.hour).toLocaleTimeString([], { hour: '2-digit' })),
    datasets: [{
      label: 'Activity Count',
      data: stats.recentActivity.map(a => a.count),
      borderColor: 'rgb(102, 126, 234)',
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
      tension: 0.4
    }]
  } : null;

  return (
    <div className="audit-dashboard p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h2 className="mb-2">Audit Dashboard</h2>
        <p className="text-muted">Monitor and search all system activities</p>
      </motion.div>

      {/* Statistics */}
      {stats && (
        <div className="row mb-4">
          <div className="col-lg-6 mb-3">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Operations Distribution</h6>
              </div>
              <div className="card-body">
                {operationChartData && (
                  <Doughnut data={operationChartData} options={{ responsive: true }} />
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-3">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Activity (Last 24 Hours)</h6>
              </div>
              <div className="card-body">
                {activityChartData && (
                  <Line data={activityChartData} options={{ responsive: true }} />
                )}
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Top Active Users</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {stats.topUsers.slice(0, 5).map((user, index) => (
                    <div key={index} className="col-md-4 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <FaUser className="text-primary" />
                        <div>
                          <div className="fw-bold">{user.userName}</div>
                          <small className="text-muted">{user.activityCount} actions</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaFilter className="me-2" />
            Filters
          </h6>
          <button className="btn btn-sm btn-outline-primary" onClick={handleExport}>
            <FaDownload className="me-1" />
            Export CSV
          </button>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Search users, files..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filters.operationType}
                onChange={(e) => handleFilterChange('operationType', e.target.value)}
              >
                <option value="">All Operations</option>
                <option value="create">Create</option>
                <option value="delete">Delete</option>
                <option value="rename">Rename</option>
                <option value="upload">Upload</option>
                <option value="download">Download</option>
                <option value="login">Login</option>
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
              >
                <option value="">All Entities</option>
                <option value="file">File</option>
                <option value="folder">Folder</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={handleApplyFilters}>
                Apply
              </button>
            </div>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={handleClearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Audit Logs ({pagination.total} total)</h6>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FaChartBar size={48} className="mb-3" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Operation</th>
                      <th>Entity</th>
                      <th>Details</th>
                      <th>Status</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td><small>{formatTimestamp(log.timestamp)}</small></td>
                        <td>
                          <div>
                            <div className="fw-bold">{log.userName}</div>
                            <small className="text-muted">{log.userEmail}</small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {getOperationIcon(log.operationType)}
                            <span className="text-capitalize">{log.operationType}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className="badge bg-secondary">{log.entityType}</span>
                            {log.entityName && (
                              <div><small>{log.entityName}</small></div>
                            )}
                          </div>
                        </td>
                        <td>
                          {log.parentFolderName && (
                            <small className="text-muted">in "{log.parentFolderName}"</small>
                          )}
                          {log.details?.oldName && (
                            <small className="text-muted">
                              {log.details.oldName} → {log.details.newName}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="text-capitalize">{log.status}</span>
                          </div>
                        </td>
                        <td><small className="text-muted">{log.ipAddress || '-'}</small></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} entries
                </div>
                <nav>
                  <ul className="pagination mb-0">
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <li key={page} className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPagination(prev => ({ ...prev, page }))}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;
