const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET || 'student-jwt-secret';

module.exports = async function studentAuth(req, res, next) {
  try {
    console.log('🔐 studentAuth middleware called');
    console.log('   Path:', req.path);
    console.log('   Cookies:', Object.keys(req.cookies));

    // Get token from cookie
    const token = req.cookies.student_token;

    if (!token) {
      console.log('❌ No token found in cookies');
      return res.redirect('/student/auth');
    }

    console.log('📡 Token found, verifying...');
    
    // Verify token
    const decoded = jwt.verify(token, STUDENT_JWT_SECRET);
    console.log('✅ JWT token verified for student ID:', decoded.studentId);

    // Get student from database
    const student = await Student.findById(decoded.studentId).select('_id name email phone');
    
    if (!student) {
      console.log('❌ Student not found in database');
      res.clearCookie('student_token');
      return res.redirect('/student/auth');
    }

    console.log('✅ Student authenticated:', student.email);

    // Attach student to request object
    req.student = student;
    res.locals.student = student;
    
    console.log('✅ Student attached to req.student:', req.student.email);
    
    next();

  } catch (err) {
    console.error('❌ studentAuth error:', err.message);
    
    // Clear invalid token
    res.clearCookie('student_token');
    
    console.log('❌ Redirecting to login');
    return res.redirect('/student/auth');
  }
};
