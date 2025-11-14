import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUsers, 
  FaUserShield, 
  FaLock,
  FaUnlock,
  FaKey,
  FaTrash,
  FaEdit,
  FaPlus,
  FaSearch,
  FaFilter,
  FaUserCog,
  FaChartPie,
  FaCheckCircle,
  FaTimesCircle,
  FaBan
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users'); // users | roles
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isLocked: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: {
      files: [],
      users: [],
      roles: [],
      audit: [],
      system: []
    }
  });

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
      fetchStats();
    } else {
      fetchRoles();
    }
  }, [activeTab, pagination.page, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });

      const response = await fetch(`${API_URL}/admin/users?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      } else {
        toast.error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/stats`, {
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

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch roles');
      }
    } catch (error) {
      console.error('Fetch roles error:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User created successfully');
        setShowUserModal(false);
        setUserForm({ name: '', email: '', password: '', role: 'user' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast.error('Failed to create user');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User updated successfully');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('Failed to update user');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User role updated successfully');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Change role error:', error);
      toast.error('Failed to change role');
    }
  };

  const handleLockUnlock = async (userId, isLocked, reason = '') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}/lock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isLocked, reason })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update lock status');
      }
    } catch (error) {
      console.error('Lock/unlock error:', error);
      toast.error('Failed to update lock status');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password (min 6 characters):');
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password reset successfully');
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Role created successfully');
        setShowRoleModal(false);
        setRoleForm({
          name: '',
          description: '',
          permissions: { files: [], users: [], roles: [], audit: [], system: [] }
        });
        fetchRoles();
      } else {
        toast.error(data.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Create role error:', error);
      toast.error('Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Role deleted successfully');
        fetchRoles();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Delete role error:', error);
      toast.error('Failed to delete role');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'danger',
      user: 'primary',
      viewer: 'secondary'
    };
    return colors[role] || 'info';
  };

  return (
    <div className="admin-panel p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h2 className="mb-2">Admin Panel</h2>
        <p className="text-muted">Manage users, roles, and permissions</p>
      </motion.div>

      {/* Statistics */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <motion.div 
              className="card bg-primary text-white"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <FaUsers size={32} className="me-3" />
                  <div>
                    <h3 className="mb-0">{stats.users.totalUsers}</h3>
                    <small>Total Users</small>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-3 mb-3">
            <motion.div 
              className="card bg-danger text-white"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <FaUserShield size={32} className="me-3" />
                  <div>
                    <h3 className="mb-0">{stats.users.adminCount}</h3>
                    <small>Administrators</small>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-3 mb-3">
            <motion.div 
              className="card bg-warning text-white"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <FaLock size={32} className="me-3" />
                  <div>
                    <h3 className="mb-0">{stats.users.lockedCount}</h3>
                    <small>Locked Accounts</small>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-3 mb-3">
            <motion.div 
              className="card bg-success text-white"
              whileHover={{ scale: 1.02 }}
            >
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <FaCheckCircle size={32} className="me-3" />
                  <div>
                    <h3 className="mb-0">{stats.users.newToday}</h3>
                    <small>New Today</small>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers className="me-2" />
            User Management
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <FaUserShield className="me-2" />
            Role Management
          </button>
        </li>
      </ul>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Filters and Actions */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaSearch />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search users..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.isLocked}
                    onChange={(e) => setFilters(prev => ({ ...prev, isLocked: e.target.value }))}
                  >
                    <option value="">All Status</option>
                    <option value="false">Active</option>
                    <option value="true">Locked</option>
                  </select>
                </div>
                <div className="col-md-4 text-end">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowUserModal(true)}
                  >
                    <FaPlus className="me-2" />
                    Create User
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <FaUsers size={48} className="mb-3" />
                  <p>No users found</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <td>
                              <div className="d-flex align-items-center">
                                {user.isLocked && (
                                  <FaBan className="text-danger me-2" />
                                )}
                                <span className="fw-bold">{user.name}</span>
                              </div>
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <select
                                className={`form-select form-select-sm badge bg-${getRoleBadgeColor(user.role)}`}
                                value={user.role}
                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                style={{ width: 'auto', border: 'none', color: 'white' }}
                              >
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            </td>
                            <td>
                              {user.isLocked ? (
                                <span className="badge bg-danger">
                                  <FaLock className="me-1" />
                                  Locked
                                </span>
                              ) : (
                                <span className="badge bg-success">
                                  <FaCheckCircle className="me-1" />
                                  Active
                                </span>
                              )}
                            </td>
                            <td>
                              <small className="text-muted">
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                              </small>
                            </td>
                            <td>
                              <small className="text-muted">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </small>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className={`btn btn-outline-${user.isLocked ? 'success' : 'warning'}`}
                                  onClick={() => {
                                    if (user.isLocked) {
                                      handleLockUnlock(user.id, false);
                                    } else {
                                      const reason = prompt('Enter reason for locking:');
                                      if (reason) handleLockUnlock(user.id, true, reason);
                                    }
                                  }}
                                  title={user.isLocked ? 'Unlock' : 'Lock'}
                                >
                                  {user.isLocked ? <FaUnlock /> : <FaLock />}
                                </button>
                                <button
                                  className="btn btn-outline-info"
                                  onClick={() => handleResetPassword(user.id)}
                                  title="Reset Password"
                                >
                                  <FaKey />
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Delete User"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
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
                      {pagination.total} users
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
      )}

      {/* Role Management Tab */}
      {activeTab === 'roles' && (
        <div>
          <div className="mb-4 text-end">
            <button
              className="btn btn-primary"
              onClick={() => setShowRoleModal(true)}
            >
              <FaPlus className="me-2" />
              Create Role
            </button>
          </div>

          <div className="row">
            {roles.map(role => (
              <div key={role.id} className="col-md-4 mb-4">
                <motion.div
                  className="card h-100"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <FaUserShield className="me-2" />
                      {role.name}
                    </h5>
                    {role.isSystem && (
                      <span className="badge bg-secondary">System</span>
                    )}
                  </div>
                  <div className="card-body">
                    <p className="text-muted">{role.description || 'No description'}</p>
                    
                    <h6 className="mt-3">Permissions:</h6>
                    <div className="permission-list">
                      {Object.entries(role.permissions || {}).map(([resource, actions]) => (
                        <div key={resource} className="mb-2">
                          <strong className="text-capitalize">{resource}:</strong>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {actions.length > 0 ? actions.map(action => (
                              <span key={action} className="badge bg-info">{action}</span>
                            )) : <span className="text-muted">None</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!role.isSystem && (
                    <div className="card-footer">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <FaTrash className="me-1" />
                        Delete
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUserModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userForm.name}
                      onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={userForm.role}
                      onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUserModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showRoleModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Role</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRoleModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateRole}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Role Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Permissions</label>
                    <div className="border rounded p-3">
                      {['files', 'users', 'roles', 'audit', 'system'].map(resource => (
                        <div key={resource} className="mb-3">
                          <strong className="text-capitalize">{resource}:</strong>
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {['create', 'read', 'update', 'delete'].map(action => (
                              <div key={action} className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={roleForm.permissions[resource]?.includes(action)}
                                  onChange={(e) => {
                                    const newPerms = { ...roleForm.permissions };
                                    if (e.target.checked) {
                                      newPerms[resource] = [...(newPerms[resource] || []), action];
                                    } else {
                                      newPerms[resource] = (newPerms[resource] || []).filter(a => a !== action);
                                    }
                                    setRoleForm(prev => ({ ...prev, permissions: newPerms }));
                                  }}
                                />
                                <label className="form-check-label text-capitalize">
                                  {action}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowRoleModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
