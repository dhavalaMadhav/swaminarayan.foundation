const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Login page (only for admin)
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('login', { 
        error: null, 
        username: '',
        title: 'Admin Login'
    });
});

// Login handle (admin-only)
router.post('/login', authController.login);

// Logout
router.get('/logout', authController.logout);

// Protected test route
router.get('/test', authController.verifyAdminToken, (req, res) => {
    res.json({ 
        success: true, 
        message: 'Admin access confirmed',
        admin: req.admin 
    });
});

module.exports = router;