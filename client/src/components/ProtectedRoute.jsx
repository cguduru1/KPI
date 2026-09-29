//client/src/component/ProtectedRoute.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  const location = useLocation();

  // 1. Not logged in → redirect to login and save intended destination
  if (!user) {
    // Not logged in → redirect to login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Logged in but role not allowed → redirect to unauthorized page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but role not allowed → show access denied
    return <p style={{ color: 'red', textAlign: 'center' }}>Access Denied</p>;
  }

  // 3. Authorized → render the children components
  return children;
};

export default ProtectedRoute;
