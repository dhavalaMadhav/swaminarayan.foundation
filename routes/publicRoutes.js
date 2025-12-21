const express = require('express');
const router = express.Router();

// Home Page
router.get('/', (req, res) => {
    res.render('pages/home', { 
        title: 'Home - Swaminarayan University',
        currentPage: 'home',
        error: null  // ✅ Added
    });
});

// About Routes
router.get('/about', (req, res) => {
    res.render('pages/about', { 
        title: 'About Us - Swaminarayan University',
        currentPage: 'about',
        error: null  // ✅ Added
    });
});

router.get('/about/about-su', (req, res) => {
    res.render('pages/about', { 
        title: 'About SU - Swaminarayan University',
        currentPage: 'about',
        error: null  // ✅ Added
    });
});

// Authorities Page - ADD THIS ROUTE
router.get('/about/authorities', (req, res) => {
    res.render('pages/authorities', { 
        title: 'Authorities - Swaminarayan University',
        currentPage: 'authorities',
        error: null  // ✅ Safe error handling
    });
});

// Recognition & Approvals Page - ADD THIS ROUTE
router.get('/about/recognitions', (req, res) => {
    res.render('pages/recognition', { 
        title: 'Recognition & Approvals - Swaminarayan University',
        currentPage: 'recognition',
        error: null
    });
});

// Awards & Achievements Page - ADD THIS ROUTE
router.get('/about/awards', (req, res) => {
    res.render('pages/awards', { 
        title: 'Awards & Achievements - Swaminarayan University',
        currentPage: 'awards',
        error: null
    });
});

// Programs - FIXED! 👇
router.get('/programs', (req, res) => {
    res.render('pages/programs', { 
        title: 'Programs - Swaminarayan University',
        currentPage: 'programs',
        error: null  // ✅ THIS FIXES THE ERROR
    });
});

// Admissions Routes
router.get('/admissions', (req, res) => {
    res.render('pages/admissions', { 
        title: 'Admissions - Swaminarayan University',
        currentPage: 'admissions',
        error: null  // ✅ Added
    });
});

router.get('/admissions/how-to-apply', (req, res) => {
    res.render('pages/admissions', { 
        title: 'How to Apply - Swaminarayan University',
        currentPage: 'admissions',
        error: null  // ✅ Added
    });
});

router.get('/admissions/online-application', (req, res) => {
    res.render('pages/apply', { 
        title: 'Online Application Form - Swaminarayan University',
        currentPage: 'admissions',
        error: null  // ✅ Added
    });
});

router.get('/admissions/scholarship', (req, res) => {
    res.render('pages/scholarship', { 
        title: 'Scholarship - Swaminarayan University',
        currentPage: 'admissions',
        error: null  // ✅ Added
    });
});

// Apply
router.get('/apply', (req, res) => {
    res.render('pages/apply', { 
        title: 'Apply Online - Swaminarayan University',
        currentPage: 'apply',
        error: null  // ✅ Added
    });
});

// Placement
router.get('/placement', (req, res) => {
    res.render('pages/placements', { 
        title: 'Placements - Swaminarayan University',
        currentPage: 'placement',
        error: null  // ✅ Added
    });
});

// Contact
router.get('/contact', (req, res) => {
    res.render('pages/contact', { 
        title: 'Contact Us - Swaminarayan University',
        currentPage: 'contact',
        error: null  // ✅ Added
    });
});

// Success Page
router.get('/success/:applicationId', (req, res) => {
    res.render('pages/success', {
        title: 'Application Successful - Swaminarayan University',
        applicationId: req.params.applicationId,
        currentPage: 'success',
        error: null  // ✅ Added
    });
});

module.exports = router;
