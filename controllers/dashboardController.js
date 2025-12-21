const Applicant = require('../models/Applicant');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// Get dashboard stats
exports.getDashboard = async (req, res) => {
    try {
        const [
            totalApplicants,
            pendingApplicants,
            reviewedApplicants,
            acceptedApplicants,
            rejectedApplicants,
            recentApplicants
        ] = await Promise.all([
            Applicant.countDocuments(),
            Applicant.countDocuments({ status: 'pending' }),
            Applicant.countDocuments({ status: 'reviewed' }),
            Applicant.countDocuments({ status: 'accepted' }),
            Applicant.countDocuments({ status: 'rejected' }),
            Applicant.find()
                .sort({ appliedDate: -1 })
                .limit(10)
                .select('fullName email status appliedDate')
        ]);

        res.render('dashboard', {
            title: 'Admin Dashboard',
            admin: req.admin,
            stats: {
                total: totalApplicants,
                pending: pendingApplicants,
                reviewed: reviewedApplicants,
                accepted: acceptedApplicants,
                rejected: rejectedApplicants
            },
            recentApplicants,
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { 
            error: 'Failed to load dashboard',
            admin: req.admin 
        });
    }
};

// Get all applicants
exports.getAllApplicants = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        
        const query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [applicants, total] = await Promise.all([
            Applicant.find(query)
                .sort({ appliedDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('fullName email phone status appliedDate'),
            Applicant.countDocuments(query)
        ]);
        
        res.render('applicants', {
            title: 'Applicants',
            admin: req.admin,
            applicants,
            currentPage: 'applicants',
            filters: { status, search },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get applicants error:', error);
        res.status(500).render('error', { 
            error: 'Failed to load applicants',
            admin: req.admin 
        });
    }
};

// Get admin profile
exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select('-password');
        res.render('profile', {
            title: 'My Profile',
            admin: admin,
            currentPage: 'profile'
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).render('error', { 
            error: 'Failed to load profile',
            admin: req.admin 
        });
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        
        const admin = await Admin.findByIdAndUpdate(
            req.admin._id,
            { 
                username, 
                email,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            admin 
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update profile' 
        });
    }
};

// Update password
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const admin = await Admin.findById(req.admin._id);
        
        // Verify current password
        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                error: 'Current password is incorrect' 
            });
        }
        
        // Update password
        admin.password = newPassword;
        await admin.save();
        
        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update password' 
        });
    }
};