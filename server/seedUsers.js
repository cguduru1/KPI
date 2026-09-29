// server/seedUsers.js
const mongoose = require('mongoose');
const User = require('./models/User'); // your User schema
require('dotenv').config(); // load .env from current folder

async function seedUsers() {
  try {
    // Debug: check if MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in .env file");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional)
    await User.deleteMany({});

    // Insert sample users
    const users = [
      { name: 'chandra', email: 'chandra@s3.com', password: 'psft123', role: 'Employee' },
      { name: 'sekhar', email: 'sekhar@s3.com', password: 'psft123', role: 'Supervisor' },
      { name: 'guduru', email: 'guduru@s3.com', password: 'psft123', role: 'DeptHead' },
      { name: 'admin', email: 'admin@s3.com', password: 'psft123', role: 'HR' }
    ];

    for (const u of users) {
      const user = new User(u);
      await user.save(); // triggers pre-save hook to hash password
    }

    console.log('🎉 Seed users created successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
    process.exit(1);
  }
}

seedUsers();
