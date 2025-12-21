const jwt = require('jsonwebtoken');

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
    // Get token from cookie or Authorization header
    const token = req.cookies.adminToken || 
                  (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
        return res.redirect('/admin');
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.clearCookie('adminToken');
        return res.redirect('/admin');
    }
};

// Check if already authenticated
const checkAuthenticated = (req, res, next) => {
    const token = req.cookies.adminToken;
    
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/admin/dashboard');
        } catch (error) {
            res.clearCookie('adminToken');
        }
    }
    next();
};

module.exports = {
    authenticateToken,
    checkAuthenticated
};
