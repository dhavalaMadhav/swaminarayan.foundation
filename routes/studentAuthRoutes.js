const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');

const STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET || 'student-jwt-secret';

// =====================================================
// GET /student/auth
// =====================================================
router.get('/auth', (req, res) => {
  if (req.cookies.student_token) {
    return res.redirect('/student/dashboard');
  }

  res.render('student/auth', {
    title: 'Student Login & Registration',
    error: null
  });
});

// =====================================================
// POST /student/auth/login  ✅ AJAX + FORM BOTH WORK
// =====================================================
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      // AJAX response
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json({ success: false, message: 'Email and password are required' });
      }
      // Form response
      return res.render('student/auth', {
        title: 'Student Login & Registration',
        error: 'Email and password are required'
      });
    }

    const student = await Student.findOne({
      email: email.toLowerCase()
    });

    if (!student) {
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
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json({ success: false, message: 'Invalid email or password' });
      }
      return res.render('student/auth', {
        title: 'Student Login & Registration',
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { studentId: student._id },
      STUDENT_JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('student_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // AJAX response → frontend handles redirect
    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ 
        success: true, 
        message: 'Login successful',
        redirect: '/student/dashboard'
      });
    }

    // Form response → server redirect
    return res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Login error:', err);

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
// POST /student/auth/register  ✅ AJAX + FORM BOTH WORK
// =====================================================
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Handle missing phone for AJAX register (frontend doesn't send it)
    const requiredFields = !phone ? [name, email, password, confirmPassword] : [name, email, phone, password, confirmPassword];
    
    if (requiredFields.some(field => !field)) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json({ success: false, message: 'All fields are required' });
      }
      return res.render('student/auth', {
        title: 'Student Login & Registration',
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json({ success: false, message: 'Passwords do not match' });
      }
      return res.render('student/auth', {
        title: 'Student Login & Registration',
        error: 'Passwords do not match'
      });
    }

    const exists = await Student.findOne({
      email: email.toLowerCase()
    });

    if (exists) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json({ success: false, message: 'Email already registered' });
      }
      return res.render('student/auth', {
        title: 'Student Login & Registration',
        error: 'Email already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = new Student({
      name,
      email: email.toLowerCase(),
      phone: phone || '', // Optional for AJAX
      password: hashedPassword
    });

    await student.save();

    const token = jwt.sign(
      { studentId: student._id },
      STUDENT_JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('student_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // AJAX response → frontend handles redirect
    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ 
        success: true, 
        message: 'Registration successful! Welcome to Swaminarayan University.',
        redirect: '/student/dashboard'
      });
    }

    // Form response → server redirect
    return res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Registration error:', err);

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
  res.clearCookie('student_token', { path: '/' });
  res.redirect('/student/auth');
});

module.exports = router;
