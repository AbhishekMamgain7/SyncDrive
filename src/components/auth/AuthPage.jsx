import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const AuthPage = () => {
  const { login, signup, loading } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Real-time validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return labels[strength] || 'Weak';
  };

  const getPasswordStrengthColor = (strength) => {
    const colors = ['danger', 'warning', 'info', 'success', 'success'];
    return colors[strength] || 'danger';
  };

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
              <label className="form-label" htmlFor="login-email">
                <FaEnvelope className="me-2" />
                Email
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <FaEnvelope className="text-muted" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  className={`form-control border-start-0 ${validationErrors.email ? 'is-invalid' : ''}`}
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value });
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setValidationErrors({...validationErrors, email: 'Invalid email format'});
                    } else {
                      setValidationErrors({...validationErrors, email: null});
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-label="Email address"
                  aria-describedby="email-error"
                />
              </div>
              {validationErrors.email && (
                <div id="email-error" className="invalid-feedback d-block">
                  {validationErrors.email}
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="login-password">
                <FaLock className="me-2" />
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <FaLock className="text-muted" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control border-start-0"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div className="mb-3 text-end">
              <a href="#" className="text-decoration-none small text-primary">Forgot password?</a>
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="mb-3">
              <label className="form-label" htmlFor="signup-name">
                <FaUser className="me-2" />
                Full Name
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <FaUser className="text-muted" />
                </span>
                <input
                  id="signup-name"
                  type="text"
                  className="form-control border-start-0"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  placeholder="Your full name"
                  autoComplete="name"
                  aria-label="Full name"
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="signup-email">
                <FaEnvelope className="me-2" />
                Email
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <FaEnvelope className="text-muted" />
                </span>
                <input
                  id="signup-email"
                  type="email"
                  className={`form-control border-start-0 ${validationErrors.signupEmail ? 'is-invalid' : signupForm.email && validateEmail(signupForm.email) ? 'is-valid' : ''}`}
                  value={signupForm.email}
                  onChange={(e) => {
                    setSignupForm({ ...signupForm, email: e.target.value });
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setValidationErrors({...validationErrors, signupEmail: 'Invalid email format'});
                    } else {
                      setValidationErrors({...validationErrors, signupEmail: null});
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-label="Email address"
                  required
                />
                {signupForm.email && validateEmail(signupForm.email) && (
                  <span className="input-group-text bg-white border-start-0">
                    <FaCheckCircle className="text-success" />
                  </span>
                )}
              </div>
              {validationErrors.signupEmail && (
                <div className="invalid-feedback d-block">
                  {validationErrors.signupEmail}
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="signup-password">
                <FaLock className="me-2" />
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <FaLock className="text-muted" />
                </span>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control border-start-0"
                  value={signupForm.password}
                  onChange={(e) => {
                    setSignupForm({ ...signupForm, password: e.target.value });
                    setPasswordStrength(calculatePasswordStrength(e.target.value));
                  }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  aria-label="Password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {signupForm.password && (
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">Password strength:</small>
                    <small className={`fw-bold text-${getPasswordStrengthColor(passwordStrength)}`}>
                      {getPasswordStrengthLabel(passwordStrength)}
                    </small>
                  </div>
                  <div className="progress" style={{height: '4px'}}>
                    <div 
                      className={`progress-bar bg-${getPasswordStrengthColor(passwordStrength)}`}
                      style={{width: `${(passwordStrength / 4) * 100}%`}}
                      role="progressbar"
                      aria-valuenow={passwordStrength}
                      aria-valuemin="0"
                      aria-valuemax="4"
                    />
                  </div>
                  <small className="text-muted">
                    Use 8+ characters with a mix of uppercase, lowercase, numbers & symbols
                  </small>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="signup-confirm-password">
                <FaLock className="me-2" />
                Confirm Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <FaLock className="text-muted" />
                </span>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className={`form-control border-start-0 ${signupForm.confirmPassword && signupForm.password !== signupForm.confirmPassword ? 'is-invalid' : signupForm.confirmPassword && signupForm.password === signupForm.confirmPassword ? 'is-valid' : ''}`}
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  aria-label="Confirm password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {signupForm.confirmPassword && signupForm.password === signupForm.confirmPassword && (
                  <span className="input-group-text bg-white border-start-0">
                    <FaCheckCircle className="text-success" />
                  </span>
                )}
              </div>
              {signupForm.confirmPassword && signupForm.password !== signupForm.confirmPassword && (
                <div className="invalid-feedback d-block">
                  Passwords do not match
                </div>
              )}
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
