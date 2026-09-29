//server/middleware/authMiddleware.js

// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Attach employeeRef automatically
      if (!user.employeeRef) {
        const employee = await Employee.findOne({ name: user.name });
        if (employee) {
          user.employeeRef = employee._id;
          await user.save();
        }
      }

      req.user = {
        _id: user._id,
        role: user.role,
        department: user.department,
        // Fallback: If user.employeeRef exists use it, otherwise fallback to user._id
        employeeRef: user.employeeRef || user._id 
      };
      return next();
    } catch (err) {
      console.error('Auth error:', err);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

// Example authorize middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'User role missing from token' });
    }

    // FIXED: Normalize input so both authorize('Supervisor') and authorize(['Supervisor']) work
    const allowedRoles = roles.flat();
    const normalizedUserRole = req.user.role.toLowerCase();

    const isAuthorized = allowedRoles.some(
      (role) => role.toLowerCase() === normalizedUserRole
    );

    if (!isAuthorized) {
      return res.status(403).json({
        error: `Role '${req.user.role}' is forbidden from performing this action.`
      });
    }

    next();
  };
};

const checkDepartment = (...departments) => {
  return (req, res, next) => {
    const allowedDepts = departments.flat();
    if (!req.user || !allowedDepts.includes(req.user.department)) {
      return res.status(403).json({ error: 'Forbidden: department access denied' });
    }
    next();
  };
};

module.exports = { protect, authorize, checkDepartment };