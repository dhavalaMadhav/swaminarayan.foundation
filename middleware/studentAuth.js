const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

// ✅ FIXED: Remove fallback secret + fail fast
const STUDENT_JWT_SECRET = process.env.JWT_SECRET;
if (!STUDENT_JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is REQUIRED');
    console.error('   App will NOT start without JWT_SECRET');
    process.exit(1);
}

console.log('✅ JWT_SECRET loaded:', STUDENT_JWT_SECRET ? '✓ Loaded' : '✗ Missing');

module.exports = async function studentAuth(req, res, next) {
    try {
        // ✅ PRODUCTION DEBUG LOGS
        console.log('🔐 studentAuth middleware called');
        console.log('   Path:', req.path);
        console.log('   NodeEnv:', process.env.NODE_ENV);
        console.log('   Cookies:', Object.keys(req.cookies || {}));
        console.log('   JWT_SECRET exists:', !!STUDENT_JWT_SECRET);
        console.log('   JWT_SECRET length:', STUDENT_JWT_SECRET?.length);

        // Get token from cookie
        const token = req.cookies?.student_token;

        if (!token) {
            console.log('❌ No student_token found in cookies');
            return res.redirect('/student/auth');
        }

        console.log('📡 Token found (length:', token.length, '), verifying...');
        
        // Verify token
        const decoded = jwt.verify(token, STUDENT_JWT_SECRET);
        console.log('✅ JWT token verified successfully');
        console.log('   Student ID:', decoded.studentId);
        console.log('   Issued:', new Date(decoded.iat * 1000).toLocaleString());

        // Get student from database
        const student = await Student.findById(decoded.studentId)
            .select('_id name email phone createdAt')
            .lean();
        
        if (!student) {
            console.log('❌ Student not found in database (ID:', decoded.studentId, ')');
            res.clearCookie('student_token', { path: '/' });
            return res.redirect('/student/auth');
        }

        console.log('✅ Student authenticated:', student.email);
        console.log('   Name:', student.name);
        console.log('   Created:', new Date(student.createdAt).toLocaleDateString());

        // Attach student to request object
        req.student = student;
        res.locals.student = student;
        
        console.log('✅ Student attached to req.student & res.locals');
        console.log('--- AUTH SUCCESS ---');
        
        next();

    } catch (err) {
        console.error('💥 studentAuth ERROR:');
        console.error('   Message:', err.message);
        console.error('   Name:', err.name);
        console.error('   Code:', err.code);
        console.error('   JWT_SECRET length:', STUDENT_JWT_SECRET?.length);
        console.error('   Token length:', req.cookies?.student_token?.length);
        
        // Clear invalid/expired token
        res.clearCookie('student_token', { path: '/' });
        
        console.log('❌ Invalid token cleared - Redirecting to /student/auth');
        return res.redirect('/student/auth');
    }
};
