import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      if (storedUser && token) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsAuthenticated(true);
      }
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data?.error || 'Login failed' };

      const authedUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || 'user',
        permissions: data.user.permissions || ['read', 'write', 'share'],
        avatar: null,
        lastLogin: new Date().toISOString(),
      };
      localStorage.setItem('auth_user', JSON.stringify(authedUser));
      localStorage.setItem('auth_token', data.token);
      setUser(authedUser);
      setIsAuthenticated(true);
      return { success: true, user: authedUser };
    } catch (error) {
      return { success: false, error: error?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async ({ name, email, password }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data?.error || 'Signup failed' };

      const authedUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || 'user',
        permissions: data.user.permissions || ['read', 'write', 'share'],
        avatar: null,
        lastLogin: new Date().toISOString(),
      };
      localStorage.setItem('auth_user', JSON.stringify(authedUser));
      localStorage.setItem('auth_token', data.token);
      setUser(authedUser);
      setIsAuthenticated(true);
      return { success: true, user: authedUser };
    } catch (error) {
      return { success: false, error: error?.message || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Clear any stored tokens or session data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    hasPermission,
    hasRole,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
