import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AuthPage = () => {
  const { login, signup, loading } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please fill all fields');
      return;
    }
    const res = await login(loginForm.email.trim(), loginForm.password);
    if (!res?.success) {
      const msg = (res?.error || '').toString().toLowerCase();
      if (msg.includes('not found')) {
        toast.error('No account with this email. Please sign up.');
        setMode('signup');
        setSignupForm((prev) => ({ ...prev, email: loginForm.email }));
      } else {
        toast.error(res?.error || 'Invalid credentials');
      }
    } else {
      toast.success('Welcome back!');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = signupForm;
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    if (!emailRegex.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const res = await signup({ name: name.trim(), email: email.trim(), password });
    if (!res?.success) {
      toast.error(res?.error || 'Signup failed');
    } else {
      toast.success('Account created. You are logged in!');
      setMode('login');
    }
  };

  return (
    <div className="auth-container d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <motion.div
        className="auth-card card shadow-sm p-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        <div className="text-center mb-4">
          <h2 className="fw-bold">SyncDrive</h2>
          <p className="text-muted mb-0">Multi-user File Management System</p>
        </div>

        <div className="mb-3 d-flex gap-2">
          <button
            className={`btn w-50 ${mode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setMode('login')}
            disabled={loading}
          >
            Login
          </button>
          <button
            className={`btn w-50 ${mode === 'signup' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setMode('signup')}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
