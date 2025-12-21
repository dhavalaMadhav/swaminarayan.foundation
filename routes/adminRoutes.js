const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Admin = require('../models/Admin');
const Applicant = require('../models/Applicant');

// JWT secret from env
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-this-in-production';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = 'uploads/admin';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'));
        }
    }
});

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
    const token = req.cookies.admin_token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.adminId = decoded.adminId;
        next();
    } catch (error) {
        res.clearCookie('admin_token');
        return res.redirect('/admin/login');
    }
};

// Generate JWT Token
const generateToken = (adminId) => {
    return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '24h' });
};

// Admin Login Page
router.get('/login', (req, res) => {
    res.render('admin/login', {
        title: 'Admin Login - Swaminarayan University',
        error: null,
        success: null
    });
});

// Admin Login POST
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find admin
        const admin = await Admin.findOne({
            $or: [{ username }, { email: username }]
        });
        
        if (!admin) {
            return res.render('admin/login', {
                title: 'Admin Login',
                error: 'Invalid credentials',
                success: null
            });
        }
        
        // Check if admin is active
        if (!admin.isActive) {
            return res.render('admin/login', {
                title: 'Admin Login',
                error: 'Account is deactivated',
                success: null
            });
        }
        
        // Verify password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.render('admin/login', {
                title: 'Admin Login',
                error: 'Invalid credentials',
                success: null
            });
        }
        
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        
        // Generate token
        const token = generateToken(admin._id);
        
        // Set cookie
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.redirect('/admin/dashboard');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', {
            title: 'Admin Login',
            error: 'Server error. Please try again.',
            success: null
        });
    }
});

// Admin Dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.adminId);
        if (!admin) {
            res.clearCookie('admin_token');
            return res.redirect('/admin/login');
        }
        
        // Get statistics
        const totalApplicants = await Applicant.countDocuments();
        const paidApplicants = await Applicant.countDocuments({ paymentStatus: 'paid' });
        const pendingApplicants = await Applicant.countDocuments({ paymentStatus: 'pending' });
        const recentApplicants = await Applicant.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('fullName applicationId paymentStatus status createdAt');
        
        // Get applicants for dashboard table
        const applicants = await Applicant.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .select('fullName email phone applicationId paymentStatus status createdAt');
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            admin: admin,
            stats: {
                total: totalApplicants,
                paid: paidApplicants,
                pending: pendingApplicants
            },
            recentApplicants: recentApplicants,
            applicants: applicants
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/admin/login');
    }
});

// All Applicants Page
router.get('/applicants', verifyToken, async (req, res) => {
    try {
        const { status, paymentStatus, search, page = 1, limit = 20 } = req.query;
        
        // Build query
        const query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (paymentStatus && paymentStatus !== 'all') {
            query.paymentStatus = paymentStatus;
        }
        
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { applicationId: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Get total count for pagination
        const total = await Applicant.countDocuments(query);
        
        // Get applicants with pagination
        const applicants = await Applicant.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const admin = await Admin.findById(req.adminId);
        
        res.render('admin/applicants', {
            title: 'All Applicants',
            admin: admin,
            applicants: applicants,
            query: req.query,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Applicants error:', error);
        res.redirect('/admin/login');
    }
});

// View Single Applicant
router.get('/applicant/:id', verifyToken, async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        
        if (!applicant) {
            return res.status(404).send('Applicant not found');
        }
        
        const admin = await Admin.findById(req.adminId);
        
        res.render('admin/applicant-details', {
            title: `Applicant: ${applicant.fullName}`,
            admin: admin,
            applicant: applicant
        });
        
    } catch (error) {
        console.error('Applicant details error:', error);
        res.status(500).send('Server error');
    }
});

// Update Applicant Status
router.post('/applicant/:id/status', verifyToken, async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const admin = await Admin.findById(req.adminId);
        
        const updateData = { status };
        
        if (adminNote) {
            updateData.$push = {
                adminNotes: {
                    note: adminNote,
                    adminName: admin.name
                }
            };
        }
        
        await Applicant.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        res.redirect(`/admin/applicant/${req.params.id}`);
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).send('Server error');
    }
});

// Update Payment Status
router.post('/applicant/:id/payment-status', verifyToken, async (req, res) => {
    try {
        const { paymentStatus, adminNote } = req.body;
        const admin = await Admin.findById(req.adminId);
        
        const updateData = { paymentStatus };
        
        if (adminNote) {
            updateData.$push = {
                adminNotes: {
                    note: `Payment status changed to ${paymentStatus}: ${adminNote}`,
                    adminName: admin.name
                }
            };
        }
        
        await Applicant.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        res.redirect(`/admin/applicant/${req.params.id}`);
        
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).send('Server error');
    }
});

// Export Applicants
router.get('/export', verifyToken, async (req, res) => {
    try {
        const applicants = await Applicant.find()
            .sort({ createdAt: -1 })
            .select('fullName email phone applicationId qualification courseName paymentStatus status createdAt');
        
        // Convert to CSV
        let csv = 'Name,Email,Phone,Application ID,Qualification,Course,Payment Status,Status,Created At\n';
        
        applicants.forEach(applicant => {
            csv += `"${applicant.fullName}","${applicant.email}","${applicant.phone}","${applicant.applicationId}","${applicant.qualification}","${applicant.courseName}","${applicant.paymentStatus}","${applicant.status}","${applicant.createdAt.toISOString()}"\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`applicants-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).send('Server error');
    }
});

// Logout
router.get('/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.redirect('/admin/login');
});

// Admin Settings - Update this route
router.get('/settings', verifyToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.adminId);
        res.render('admin/settings', {
            title: 'Admin Settings',
            admin: admin,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Settings error:', error);
        res.redirect('/admin/login');
    }
});

// Update Admin Profile - Update this route
router.post('/settings/profile', verifyToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        await Admin.findByIdAndUpdate(req.adminId, { name, email });
        res.redirect('/admin/settings?success=Profile updated successfully');
    } catch (error) {
        console.error('Update profile error:', error);
        res.redirect('/admin/settings?error=Failed to update profile');
    }
});

// Change Password - Update this route
router.post('/settings/password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const admin = await Admin.findById(req.adminId);
        const isMatch = await admin.comparePassword(currentPassword);
        
        if (!isMatch) {
            return res.redirect('/admin/settings?error=Current password is incorrect');
        }
        
        admin.password = newPassword;
        await admin.save();
        
        res.redirect('/admin/settings?success=Password changed successfully');
        
    } catch (error) {
        console.error('Change password error:', error);
        res.redirect('/admin/settings?error=Failed to change password');
    }
});

module.exports = router;