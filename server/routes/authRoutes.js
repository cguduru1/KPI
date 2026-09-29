//server/routes/authRoutes.js

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
  {
    id: user._id,
    employeeRef: user.employeeRef, // 👈 ADD THIS FIELD TO JWT
    role: user.role,
    department: user.department    // 👈 ADD THIS TOO FOR DEPT HEADS
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
