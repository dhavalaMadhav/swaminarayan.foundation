require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const connectDB = require('./config/database');

// =======================
// ROUTES
// =======================
const publicRoutes = require('./routes/publicRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentAuthRoutes = require('./routes/studentAuthRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// DATABASE
// =======================
connectDB();

// =======================
// UPLOAD DIRECTORIES
// =======================
['uploads', 'uploads/applications', 'uploads/payments'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =======================
// STATIC FILES
// =======================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// =======================
// VIEW ENGINE
// =======================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// globals for views
app.use((req, res, next) => {
  res.locals.razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
  res.locals.applicationFee = Number(process.env.APPLICATION_FEE) || 500;
  next();
});

// =======================
// ROUTES REGISTRATION
// =======================
app.use('/', publicRoutes);
app.use('/application', applicationRoutes);

// STUDENT ROUTES (STRICTLY ISOLATED)
app.use('/student', studentAuthRoutes);
app.use('/student', studentRoutes);

// ADMIN ROUTES (STRICTLY ISOLATED)
app.use('/admin', adminRoutes);

// =======================
// 404 HANDLER
// =======================
app.use((req, res) => {
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 - Page Not Found</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f8f8f8;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .box {
            background: white;
            border: 2px solid #e5e5e5;
            padding: 60px;
            text-align: center;
          }
          h1 { font-size: 96px; color: #DC2626; }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 14px 30px;
            border: 2px solid #DC2626;
            color: white;
            background: #DC2626;
            text-decoration: none;
            font-weight: 700;
          }
          a:hover {
            background: transparent;
            color: #DC2626;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>404</h1>
          <p>Page not found</p>
          <a href="/">Back to Home</a>
        </div>
      </body>
    </html>
  `);
});

// =======================
// ERROR HANDLER
// =======================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'File size too large (max 2MB)'
        : err.message
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Home: http://localhost:${PORT}`);
  console.log(`🎓 Student Auth: /student/auth`);
  console.log(`📊 Student Dashboard: /student/dashboard`);
  console.log(`🔐 Admin Login: /admin/login`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;
