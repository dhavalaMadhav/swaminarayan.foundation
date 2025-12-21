const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT Token
const generateToken = (admin) => {
    return jwt.sign(
        { 
            id: admin._id, 
            username: admin.username, 
            email: admin.email,
            role: admin.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
};

// Admin Login (Admin-only)
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find admin by username or email
        const admin = await Admin.findOne({
            $or: [{ username }, { email: username }],
            isActive: true
        });

        if (!admin) {
            return res.status(401).render('login', { 
                error: 'Invalid credentials or account not found',
                username: username 
            });
        }

        // Check if account is locked
        if (admin.isLocked()) {
            const lockTime = Math.ceil((admin.lockUntil - Date.now()) / 60000);
            return res.status(401).render('login', { 
                error: `Account is locked. Try again in ${lockTime} minutes.`,
                username: username 
            });
        }

        // Check password
        const isMatch = await admin.comparePassword(password);
        
        if (!isMatch) {
            // Increment failed login attempts
            await admin.incrementLoginAttempts();
            
            const remainingAttempts = 5 - (admin.loginAttempts + 1);
            let errorMessage = 'Invalid credentials';
            
            if (remainingAttempts <= 3) {
                errorMessage += `. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`;
            }
            
            return res.status(401).render('login', { 
                error: errorMessage,
                username: username 
            });
        }

        // Check if user has admin role
        if (!['admin', 'superadmin'].includes(admin.role)) {
            return res.status(403).render('login', { 
                error: 'Access denied. Admin privileges required.',
                username: username 
            });
        }

        // Reset login attempts and update last login
        await admin.resetLoginAttempts();

        // Generate JWT token
        const token = generateToken(admin);

        // Set token in cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Set token in session
        req.session.adminToken = token;
        req.session.admin = {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role
        };

        // Redirect to dashboard
        res.redirect('/admin/dashboard');
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('login', { 
            error: 'Server error. Please try again.',
            username: username 
        });
    }
};

// Verify Admin Token Middleware
exports.verifyAdminToken = async (req, res, next) => {
    const token = req.cookies.adminToken || req.session.adminToken || req.headers['x-admin-token'];

    if (!token) {
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if admin exists and is active
        const admin = await Admin.findOne({
            _id: decoded.id,
            isActive: true,
            role: { $in: ['admin', 'superadmin'] }
        });

        if (!admin) {
            res.clearCookie('adminToken');
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        req.admin = admin;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.clearCookie('adminToken');
        req.session.destroy();
        res.redirect('/admin/login');
    }
};

// Check if admin is already logged in
exports.redirectIfLoggedIn = (req, res, next) => {
    const token = req.cookies.adminToken || req.session.adminToken;
    
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/admin/dashboard');
        } catch (error) {
            // Token invalid, proceed to login
            next();
        }
    } else {
        next();
    }
};

// Admin Logout
exports.logout = (req, res) => {
    res.clearCookie('adminToken');
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/admin/login');
    });
};

// Create initial admin (run once)
exports.createInitialAdmin = async () => {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const initialAdmin = new Admin({
                username: 'admin',
                email: 'admin@example.com',
                password: 'Admin@123', // Strong password
                role: 'superadmin'
            });
            await initialAdmin.save();
            console.log('\n========================================');
            console.log('INITIAL ADMIN CREATED');
            console.log('========================================');
            console.log('Username: admin');
            console.log('Email: admin@example.com');
            console.log('Password: Admin@123');
            console.log('Role: superadmin');
            console.log('========================================\n');
            console.log('⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!');
            console.log('========================================\n');
        } else {
            console.log(`Found ${adminCount} admin(s) in database`);
        }
    } catch (error) {
        console.error('Error creating initial admin:', error);
    }
};