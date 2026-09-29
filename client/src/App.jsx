//client/src/App.jsx

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import KPIList from './components/KPIList';
import ErrorBoundary from "./components/ErrorBoundary";
import HRDashboard from './components/HRDashboard';
import AuditLogTable from './components/AuditLogTable';
import ProtectedRoute from './components/ProtectedRoute';
import { jwtDecode } from "jwt-decode";

function App() {
  const [user, setUser] = useState(null);

  // Load user from localStorage on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (token) {
      const decoded = jwtDecode(token);
      // console.log("Decoded JWT:", decoded);
      // optionally merge decoded claims into user state
    }
  }, []);

  function checkTokenExpiry() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  const decoded = jwtDecode(token);
  console.log(decoded);
  const now = Date.now() / 1000; // seconds
  if (decoded.exp < now) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
  return true;
}

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Protect routes based on role
  const ProtectedRoute = ({ user, allowedRoles, children }) => {
    if (!user || !allowedRoles.includes(user.role)) { return <Navigate to="/" />;}
    // if (role && user.role !== role) return <Navigate to="/" />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login setUser={setUser} />} />

        {/* Employee & Supervisor & DeptHead can see KPIList */}
        <Route
          path="/kpis"
          element={
            <ProtectedRoute user={user} allowedRoles={['Employee','Supervisor','DeptHead']}>
              <KPIList user={user} logout={logout} />
            </ProtectedRoute>
          }
        />

        {/* HR Dashboard only for HR role */}
        <Route
          path="/hr"
          element={
            <ProtectedRoute user={user} allowedRoles={['HR']}>
              <HRDashboard user={user} logout={logout} />
            </ProtectedRoute>
          }
        />
        {/* Audit Logs → Supervisor, DeptHead, HR */}
        <Route
          path="/auditlogs"
          element={
            <ProtectedRoute user={user} allowedRoles={['Supervisor','DeptHead','HR']}>
              <AuditLogTable user={user} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


