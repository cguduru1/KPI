//client/src/components/Login.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import "../styles/quantum.css";

const Login = ({ setUser }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('sessionExpired')) {
      setSessionExpiredMessage("Your session has expired. Please sign in again.");
      localStorage.removeItem('sessionExpired');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents page reload on form submit
    setErrorMessage("");
    
    if (!name) {
      setErrorMessage("Please enter your username.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { name, password });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);

      // Attach token to all future axios requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;

      // Decode token if needed
      const decoded = jwtDecode(res.data.token);
      console.log("Decoded JWT:", decoded);

      // // Show success banner
      // setSuccessMessage(`Welcome back, ${res.data.user.name}!`);

      // // Redirect after a short delay so user sees the banner
      // setTimeout(() => {
      //   if (res.data.user.role === 'Employee') {
      //   navigate('/kpis');
      // } else if (res.data.user.role === 'Supervisor' || res.data.user.role === 'DeptHead') {
      //   navigate('/auditlogs');
      // } else if (res.data.user.role === 'HR') {
      //   navigate('/hr');
      // } else {
      //   navigate('/'); // fallback
      // }
      // }, 1500);

      // Auto‑redirect based on role
      if (res.data.user.role === 'HR') {
        navigate('/hr');
      } else {
        navigate('/kpis');
      }
    } catch (err) {
      // Safely extract backend error message if available
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

//   const token = jwt.sign(
//   { id: user._id, role: user.role },
//   process.env.JWT_SECRET,
//   { expiresIn: '1h' } // short-lived
// );

useEffect(() => {
  if (successMessage) {
    const timer = setTimeout(() => {
      setSuccessMessage(""); // clears success banner after 2s
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [successMessage]);


 return (
    <div className="auth-page">
      <div className="auth-form">
      <div className="page-watermark">
        <img src="/s3-watermark.png" alt="S3 Technologies" />
      </div>
      <div className="sn-login-wrapper">
        <div className="sn-login-panel">
          <form className="sn-login-box" onSubmit={handleLogin}>
            <img src="/s3-logo.png" alt="S3 Technologies" className="sn-logo" />
            <h2 className="sn-title">Welcome Back</h2>
            <p className="sn-subtitle">Sign in to continue to S3 EPMS Portal</p>

           <div className="banner-container">
              {sessionExpiredMessage && (
                <div className="banner session-expired-banner" role="alert">
                  {sessionExpiredMessage}
                  <button
                    className="banner-close"
                    onClick={() => setSessionExpiredMessage("")}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="message-banner">
                  {errorMessage}
                  <span className="close-btn" onClick={() => setErrorMessage("")}>×</span>
                </div>
              )}

              {successMessage && (
                <div className="banner success-banner" role="alert">
                  {successMessage}
                  <button
                    className="banner-close"
                    onClick={() => setSuccessMessage("")}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>



            <input 
              type="text"
              placeholder="Username" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />

            <input 
              type="password"
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        {/* Right Branding Panel */}
        <div className="sn-brand-panel">
          <div className="sn-brand-content">
            <h1>S3 Technologies</h1>
            <h3>Enterprise Performance Management System</h3>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Login;