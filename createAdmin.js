const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('./models/Admin');

const createDefaultAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_app');
        
        console.log('🔗 Connected to MongoDB');
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        
        if (existingAdmin) {
            console.log('⚠️  Default admin already exists');
            process.exit(0);
        }
        
        // Create default admin
        const admin = new Admin({
            username: 'admin',
            email: 'admin@university.edu',
            password: 'Admin@123', // Change this in production!
            name: 'System Administrator',
            role: 'super_admin',
            isActive: true
        });
        
        await admin.save();
        
        console.log('✅ Default admin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Login Credentials:');
        console.log('👤 Username: admin');
        console.log('🔐 Password: Admin@123');
        console.log('📧 Email: admin@university.edu');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  IMPORTANT: Change password after first login!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createDefaultAdmin();