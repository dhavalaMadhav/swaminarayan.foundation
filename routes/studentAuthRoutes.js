const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');

// ✅ FIXED: Remove fallback secret + fail fast validation
const STUDENT_JWT_SECRET = process.env.JWT_SECRET;
if (!STUDENT_JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is REQUIRED');
    console.error('   Check your .env or platform environment variables');
    process.exit(1);
}

console.log('✅ Student routes loaded - JWT_SECRET:', STUDENT_JWT_SECRET ? '✓ OK' : '✗ MISSING');

// =====================================================
// GET /student/auth
// =====================================================
router.get('/auth', (req, res) => {
    // ✅ PRODUCTION DEBUG: Check if already logged in
    console.log('🔍 /student/auth - Token exists:', !!req.cookies?.student_token);
    
    if (req.cookies?.student_token) {
        try {
            const decoded = jwt.verify(req.cookies.student_token, STUDENT_JWT_SECRET);
            console.log('✅ Valid token found - redirecting to dashboard');
            return res.redirect('/student/dashboard');
        } catch (err) {
            console.log('❌ Invalid token - clearing cookie');
            res.clearCookie('student_token', { path: '/' });
        }
    }

    console.log('📄 Rendering auth page');
    res.render('student/auth', {
        title: 'Student Login & Registration',
        error: null
    });
});

// =====================================================
// POST /student/auth/login
// =====================================================
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ PRODUCTION DEBUG LOGS
        console.log('🔍 STUDENT LOGIN ATTEMPT:', {
            email: email?.toLowerCase(),
            hasPassword: !!password,
            contentType: req.headers['content-type'],
            nodeEnv: process.env.NODE_ENV,
            jwtSecretOk: !!STUDENT_JWT_SECRET
        });

        if (!email || !password) {
            console.log('❌ Missing email/password');
            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: false, message: 'Email and password are required' });
            }
            return res.render('student/auth', {
                title: 'Student Login & Registration',
                error: 'Email and password are required'
            });
        }

        const student = await Student.findOne({
            email: email.toLowerCase().trim()
        });

        if (!student) {
            console.log('❌ Student not found:', email.toLowerCase().trim());
            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }
            return res.render('student/auth', {
                title: 'Student Login & Registration',
                error: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            console.log('❌ Password mismatch for:', student.email);
            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }
            return res.render('student/auth', {
                title: 'Student Login & Registration',
                error: 'Invalid email or password'
            });
        }

        // ✅ GENERATE JWT
        const token = jwt.sign(
            { 
                studentId: student._id,
                email: student.email,
                name: student.name
            },
            STUDENT_JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ JWT generated successfully - Length:', token.length);
        console.log('   Student:', student.email);

        // ✅ FIXED PRODUCTION COOKIE SETTINGS
        res.cookie('student_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',           // ✅ HTTPS only in prod
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // ✅ Cross-site fix
            maxAge: 7 * 24 * 60 * 60 * 1000,                         // 7 days
            path: '/'
        });

        console.log('✅ Cookie set - Redirecting to dashboard');

        // AJAX response → frontend handles redirect
        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Login successful',
                redirect: '/student/dashboard',
                student: {
                    id: student._id,
                    email: student.email,
                    name: student.name
                }
            });
        }

        // Form response → server redirect
        return res.redirect('/student/dashboard');

    } catch (err) {
        console.error('💥 LOGIN ERROR:', err);
        console.error('   Stack:', err.stack);
        
        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ success: false, message: 'Something went wrong. Please try again.' });
        }

        return res.render('student/auth', {
            title: 'Student Login & Registration',
            error: 'Something went wrong. Please try again.'
        });
    }
});

// =====================================================
// POST /student/auth/register
// =====================================================
router.post('/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;

        console.log('🔍 STUDENT REGISTER:', { 
            email: email?.toLowerCase(),
            hasPhone: !!phone,
            nodeEnv: process.env.NODE_ENV 
        });

        // Handle missing phone for AJAX register (frontend doesn't send it)
        const requiredFields = !phone ? [name, email, password, confirmPassword] : [name, email, phone, password, confirmPassword];
        
        if (requiredFields.some(field => !field)) {
            console.log('❌ Missing required fields');
            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: false, message: 'All fields are required' });
            }
            return res.render('student/auth', {
                title: 'Student Login & Registration',
                error: 'All fields are required'
            });
        }

        if (password !== confirmPassword) {
            console.log('❌ Passwords do not match');
            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: false, message: 'Passwords do not match' });
            }
            return res.render('student/auth', {
                title: 'Student Login & Registration',
                error: 'Passwords do not match'
            });
        }

        const exists = await Student.findOne({
            email: email.toLowerCase().trim()
        });

        if (exists) {
            console.log('❌ Email already exists:', email.toLowerCase().trim());
            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: false, message: 'Email already registered' });
            }
            return res.render('student/auth', {
                title: 'Student Login & Registration',
                error: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12); // ✅ Stronger hash

        const student = new Student({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone ? phone.trim() : '',
            password: hashedPassword
        });

        await student.save();
        console.log('✅ New student registered:', student.email);

        // ✅ Generate JWT after registration
        const token = jwt.sign(
            { 
                studentId: student._id,
                email: student.email,
                name: student.name
            },
            STUDENT_JWT_SECRET,
            { expiresIn: '7d' }
        );

        // ✅ FIXED PRODUCTION COOKIE SETTINGS
        res.cookie('student_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        console.log('✅ Registration complete - JWT set for:', student.email);

        // AJAX response → frontend handles redirect
        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Registration successful! Welcome to Swaminarayan University.',
                redirect: '/student/dashboard',
                student: {
                    id: student._id,
                    email: student.email,
                    name: student.name
                }
            });
        }

        // Form response → server redirect
        return res.redirect('/student/dashboard');

    } catch (err) {
        console.error('💥 REGISTRATION ERROR:', err);
        
        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ success: false, message: 'Registration failed. Try again.' });
        }

        return res.render('student/auth', {
            title: 'Student Login & Registration',
            error: 'Registration failed. Try again.'
        });
    }
});

// =====================================================
// GET /student/logout
// =====================================================
router.get('/logout', (req, res) => {
    console.log('🔓 Student logout - clearing token');
    res.clearCookie('student_token', { 
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.redirect('/student/auth');
});

module.exports = router;
