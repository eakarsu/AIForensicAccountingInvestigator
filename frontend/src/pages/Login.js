import React, { useState } from 'react';
import axios from 'axios';
import API from '../services/apiBase';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e, demoLoginCredentials) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/login`, { email: (demoLoginCredentials?.email ?? email), password: (demoLoginCredentials?.password ?? password) });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/demo`);
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Demo login is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">AI</div>
          <h1>Forensic Accounting</h1>
          <p>AI-Powered Financial Investigation Platform</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button type="button" disabled={loading} className="btn-fill" onClick={handleDemoLogin}>
          {loading ? 'Opening demo workspace…' : 'Log In as Demo'}
        </button>
        <p className="login-demo-note">Uses the configured evaluation account. No password is exposed or changed.</p>
      </div>
    </div>
  );
}

export default Login;
