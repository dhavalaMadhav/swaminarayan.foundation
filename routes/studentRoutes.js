const express = require('express');
const router = express.Router();

const studentAuth = require('../middleware/studentAuth');
const Applicant = require('../models/Applicant');
const Payment = require('../models/Payment');

// =======================================================
// GET /student/dashboard
// =======================================================
router.get('/dashboard', studentAuth, async (req, res) => {
  try {
    console.log('📊 Student dashboard accessed');
    console.log('   Student:', req.student.email);

    // Fetch latest applicant for this student
    const applicant = await Applicant.findOne({
      email: req.student.email.toLowerCase()
    }).sort({ createdAt: -1 });

    // Fetch payments only if applicant exists
    let payments = [];
    if (applicant) {
      payments = await Payment.find({
        applicationId: applicant._id
      }).sort({ createdAt: -1 });
    }

    return res.render('student/dashboard', {
      title: 'Student Dashboard',
      student: req.student,
      applicant,
      payments
    });

  } catch (error) {
    console.error('❌ Student dashboard error:', error);

    return res.status(500).render('student/dashboard', {
      title: 'Student Dashboard',
      student: req.student,
      applicant: null,
      payments: [],
      error: 'Unable to load dashboard at the moment'
    });
  }
});

// =======================================================
// GET /student/apply
// =======================================================
router.get('/apply', studentAuth, async (req, res) => {
  try {
    console.log('📝 Student apply page accessed');
    console.log('   Student:', req.student.email);

    const existingApplicant = await Applicant.findOne({
      email: req.student.email.toLowerCase()
    }).sort({ createdAt: -1 });

    // If application already completed & paid → dashboard
    if (existingApplicant && existingApplicant.paymentStatus === 'paid') {
      console.log('⚠️ Application already paid — redirecting to dashboard');
      return res.redirect('/student/dashboard');
    }

    return res.render('student/apply', {
      title: 'Apply for Admission - Swaminarayan University',
      student: req.student,
      applicant: existingApplicant || null,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      applicationFee: Number(process.env.APPLICATION_FEE) || 500
    });

  } catch (error) {
    console.error('❌ Student apply page error:', error);

    return res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load application page'
    });
  }
});

// =======================================================
// GET /student/application-status (AJAX helper)
// =======================================================
router.get('/application-status', studentAuth, async (req, res) => {
  try {
    console.log('📊 Application status requested');

    const applicant = await Applicant.findOne({
      email: req.student.email.toLowerCase()
    }).sort({ createdAt: -1 });

    if (!applicant) {
      return res.json({
        success: true,
        hasApplication: false
      });
    }

    return res.json({
      success: true,
      hasApplication: true,
      application: {
        applicationId: applicant.applicationId,
        status: applicant.status,
        paymentStatus: applicant.paymentStatus,
        courseName: applicant.courseName,
        createdAt: applicant.createdAt
      }
    });

  } catch (error) {
    console.error('❌ application-status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
