const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const studentAuth = require('../middleware/studentAuth');
const Applicant = require('../models/Applicant');
const Payment = require('../models/Payment');
const crypto = require('crypto');

require('dotenv').config();

console.log('✅ Application routes file loaded');

// Initialize Razorpay only if credentials exist
let razorpay = null;
let hasRazorpay = false;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
        const Razorpay = require('razorpay');
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        hasRazorpay = true;
        console.log('✅ Razorpay initialized');
    } catch (error) {
        console.warn('⚠️ Razorpay initialization failed:', error.message);
    }
} else {
    console.warn('⚠️ Razorpay credentials not found - Using UTR payment only');
}

// ✅ FIXED: Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/applications';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
        }
    }
});

// ✅ NEW: Payment screenshot upload (5MB limit, images+PDF)
const paymentScreenshotUpload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDFs allowed for payment proof!'));
        }
    }
});

// ============================================
// DRAFT MANAGEMENT ENDPOINTS
// ============================================

// GET /application/check-status ✅ FIXED
router.get('/check-status', studentAuth, async (req, res) => {
    try {
        console.log('🔍 Checking application status for:', req.student.email);

        if (!req.student) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const applicant = await Applicant.findOne({
            email: req.student.email.toLowerCase()
        }).sort({ createdAt: -1 });

        if (!applicant) {
            console.log('⚠️ No application found');
            return res.json({
                success: true,
                status: 'new',
                currentStep: 1,
                applicationId: null,
                hasDocuments: false,
                redirectTo: null,
                hasPhoto: false,
                hasIdProof: false,
                hasCertificate: false,
                message: 'No existing application found'
            });
        }

        console.log('📋 Application found:', {
            status: applicant.status,
            paymentStatus: applicant.paymentStatus,
            hasPhoto: !!applicant.photoUrl,
            hasIdProof: !!applicant.idProofUrl,
            hasCertificate: !!applicant.certificateUrl
        });

        const hasAllDocuments = applicant.photoUrl && applicant.idProofUrl && applicant.certificateUrl;

        let currentStep = 1;
        let redirectTo = null;

        if (applicant.status === 'draft') {
            currentStep = applicant.currentStep || 1;
            console.log('📝 User in draft mode, step:', currentStep);
            redirectTo = null;
        } 
        else if (applicant.status === 'submitted' && hasAllDocuments) {
            currentStep = 5; // Payment step
            redirectTo = 'payment';
            console.log('✅ Files uploaded! Redirecting to payment (Step 5)');
        } 
        else if (applicant.status === 'under_review' && applicant.paymentStatus === 'under_verification') {
            currentStep = 6; // UTR verification step
            redirectTo = 'verification';
            console.log('⏳ Payment submitted, awaiting verification (Step 6)');
        } 
        else if (applicant.paymentStatus === 'paid' || applicant.paymentStatus === 'verified' || applicant.status === 'completed') {
            redirectTo = 'complete';
            console.log('✅ Application complete!');
        }

        res.json({
            success: true,
            status: applicant.status,
            paymentStatus: applicant.paymentStatus,
            currentStep: currentStep,
            applicationId: applicant.applicationId,
            redirectTo: redirectTo,
            hasDocuments: hasAllDocuments,
            hasPhoto: !!applicant.photoUrl,
            hasIdProof: !!applicant.idProofUrl,
            hasCertificate: !!applicant.certificateUrl,
            message: 'Application status retrieved'
        });

    } catch (err) {
        console.error('❌ Check status error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + err.message
        });
    }
});

// GET /application/load-draft ✅ FIXED
router.get('/load-draft', studentAuth, async (req, res) => {
    try {
        const applicant = await Applicant.findOne({
            email: req.student.email.toLowerCase(),
            isDraft: true
        }).sort({ lastSaved: -1 });

        if (!applicant) {
            return res.json({ success: true, draft: null });
        }

        return res.json({
            success: true,
            draft: {
                currentStep: applicant.currentStep || 1,
                // PERSONAL
                fullName: applicant.fullName || '',
                phone: applicant.phone || '',
                dob: applicant.dob || '',
                gender: applicant.gender || '',
                // ADDRESS
                address: applicant.address || '',
                // ACADEMICS
                qualification: applicant.qualification || '',
                boardUniversity: applicant.boardUniversity || '',
                passingYear: applicant.passingYear || '',
                percentage: applicant.percentage || '',
                // COURSE
                programType: applicant.programType || '',
                courseName: applicant.courseName || '',
                // FLAGS
                documentsCompleted: applicant.documentsCompleted || false,
                paymentStatus: applicant.paymentStatus || 'pending'
            }
        });
    } catch (err) {
        console.error('❌ load-draft error:', err);
        res.status(500).json({ success: false });
    }
});

// POST /application/save-draft ✅ FIXED
router.post('/save-draft', studentAuth, async (req, res) => {
    try {
        console.log('💾 Save draft called for:', req.student.email);

        if (!req.student) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const {
            fullName, email, phone, dob, gender, address,
            qualification, boardUniversity, passingYear, percentage,
            programType, courseName, currentStep
        } = req.body;

        console.log('📊 Draft data received:', req.body);

        const studentEmail = req.student.email.toLowerCase();

        let applicant = await Applicant.findOne({
            email: studentEmail,
            isDraft: true
        });

        console.log('🔍 Existing draft found:', applicant ? 'Yes' : 'No');

        if (!applicant) {
            const appId = `APP-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            applicant = new Applicant({
                applicationId: appId,
                email: studentEmail,
                fullName: fullName || req.student.name,
                phone: phone || req.student.phone || '',
                status: 'draft',
                isDraft: true
            });
            console.log('✨ New draft created:', appId);
        }

        // Update all fields
        applicant.fullName = fullName || applicant.fullName || req.student.name;
        applicant.phone = phone || applicant.phone || '';
        applicant.dob = dob || applicant.dob;
        applicant.gender = gender || applicant.gender;
        applicant.address = address || applicant.address;
        applicant.qualification = qualification || applicant.qualification;
        applicant.boardUniversity = boardUniversity || applicant.boardUniversity;
        applicant.passingYear = passingYear || applicant.passingYear;
        applicant.percentage = percentage || applicant.percentage;
        applicant.programType = programType || applicant.programType;
        applicant.courseName = courseName || applicant.courseName;
        applicant.currentStep = parseInt(currentStep) || 1;
        applicant.status = 'draft';
        applicant.isDraft = true;
        applicant.lastSaved = new Date();

        await applicant.save();

        console.log('✅ Draft saved successfully:', applicant.applicationId);

        res.json({
            success: true,
            message: 'Draft saved successfully',
            applicationId: applicant.applicationId
        });

    } catch (err) {
        console.error('❌ Save draft error:', err.message);
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Draft save conflict. Please refresh and try again.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error: ' + err.message
        });
    }
});

// POST /application/clear-draft ✅ FIXED
router.post('/clear-draft', studentAuth, async (req, res) => {
    try {
        console.log('🗑️ clear-draft called for:', req.student.email);
        
        const result = await Applicant.deleteMany({ 
            email: req.student.email.toLowerCase(),
            isDraft: true
        });

        console.log('✅ Drafts cleared:', result.deletedCount);

        res.json({ success: true, message: 'Draft cleared', deletedCount: result.deletedCount });
    } catch (error) {
        console.error('❌ Clear draft error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear draft' });
    }
});

// ============================================
// APPLICATION SUBMISSION ✅ PERFECT
// ============================================

router.post('/submit-application', studentAuth, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'idProof', maxCount: 1 },
    { name: 'certificate', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('📡 submit-application called for:', req.student.email);

        const requiredFields = ['fullName', 'phone', 'dob', 'gender', 'address', 
                               'qualification', 'boardUniversity', 'passingYear', 
                               'percentage', 'programType', 'courseName'];
        
        for (let field of requiredFields) {
            if (!req.body[field] || req.body[field].trim() === '') {
                console.log('❌ Missing field:', field);
                return res.status(400).json({ 
                    success: false, 
                    message: `${field.replace(/([A-Z])/g, ' $1').trim()} is required` 
                });
            }
        }

        if (!req.files || !req.files.photo || !req.files.idProof || !req.files.certificate) {
            console.log('❌ Missing files');
            return res.status(400).json({ 
                success: false, 
                message: 'Please upload all three required documents' 
            });
        }

        // Check if already submitted and paid
        const existingApplicant = await Applicant.findOne({
            email: req.student.email.toLowerCase(),
            paymentStatus: 'paid'
        });

        if (existingApplicant) {
            console.log('❌ Application already paid');
            return res.status(400).json({ 
                success: false, 
                message: 'You have already completed an application payment' 
            });
        }

        // Clear drafts
        await Applicant.deleteMany({ 
            email: req.student.email.toLowerCase(),
            isDraft: true
        });

        const applicantData = {
            applicationId: `APP-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
            fullName: req.body.fullName.trim(),
            email: req.student.email.toLowerCase(),
            phone: req.body.phone.trim(),
            dob: req.body.dob,
            gender: req.body.gender,
            address: req.body.address.trim(),
            qualification: req.body.qualification,
            boardUniversity: req.body.boardUniversity.trim(),
            passingYear: req.body.passingYear,
            percentage: req.body.percentage,
            programType: req.body.programType,
            courseName: req.body.courseName,
            // ✅ PERFECT URLS for static serving
            photoUrl: `/uploads/applications/${req.files.photo[0].filename}`,
            idProofUrl: `/uploads/applications/${req.files.idProof[0].filename}`,
            certificateUrl: `/uploads/applications/${req.files.certificate[0].filename}`,
            status: 'submitted',
            paymentStatus: 'pending',
            isDraft: false,
            currentStep: 5
        };

        console.log('💾 Creating application:', applicantData.applicationId);

        const applicant = new Applicant(applicantData);
        await applicant.save();

        console.log('✅ Application submitted:', applicant.applicationId);

        res.json({ 
            success: true, 
            message: 'Application submitted successfully!',
            applicationId: applicant.applicationId
        });

    } catch (error) {
        console.error('❌ Submit application error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to submit application' 
        });
    }
});

// ============================================
// PAYMENT ENDPOINTS ✅ PERFECT
// ============================================

// POST /application/create-payment-order
router.post('/create-payment-order', studentAuth, async (req, res) => {
    try {
        if (!hasRazorpay) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment gateway not configured. Please use UTR payment method.' 
            });
        }

        const { applicationId } = req.body;

        if (!applicationId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Application ID is required' 
            });
        }

        const applicant = await Applicant.findOne({ applicationId });

        if (!applicant) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found' 
            });
        }

        if (applicant.email.toLowerCase() !== req.student.email.toLowerCase()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized access' 
            });
        }

        if (applicant.paymentStatus === 'paid' || applicant.paymentStatus === 'verified') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment already completed' 
            });
        }

        const applicationFee = parseInt(process.env.APPLICATION_FEE) || 500;
        const amount = applicationFee * 100;

        const options = {
            amount: amount,
            currency: 'INR',
            receipt: `receipt_${applicationId}`,
            notes: {
                applicationId: applicationId,
                studentEmail: req.student.email
            }
        };

        const order = await razorpay.orders.create(options);

        const payment = new Payment({
            applicationId: applicant._id,
            razorpayOrderId: order.id,
            amount: amount,
            currency: 'INR',
            status: 'pending'
        });

        await payment.save();

        res.json({ 
            success: true, 
            order: order 
        });

    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create payment order' 
        });
    }
});

// POST /application/verify-payment
router.post('/verify-payment', studentAuth, async (req, res) => {
    try {
        if (!hasRazorpay) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment gateway not configured' 
            });
        }

        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, applicationId } = req.body;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !applicationId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing payment details' 
            });
        }

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payment signature' 
            });
        }

        const applicant = await Applicant.findOne({ applicationId });

        if (!applicant) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found' 
            });
        }

        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

        if (payment) {
            payment.razorpayPaymentId = razorpay_payment_id;
            payment.razorpaySignature = razorpay_signature;
            payment.status = 'paid';
            await payment.save();
        }

        applicant.paymentStatus = 'paid';
        applicant.status = 'under_review';
        await applicant.save();

        res.json({ 
            success: true, 
            message: 'Payment verified successfully' 
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Payment verification failed' 
        });
    }
});

// ✅ PERFECTED: POST /application/submit-utr
router.post('/submit-utr', studentAuth, paymentScreenshotUpload.single('transactionProof'), async (req, res) => {
    try {
        console.log('💳 UTR submission for:', req.student.email);
        console.log('📄 Application ID:', req.body.applicationId);
        console.log('🔢 UTR:', req.body.utrNumber);
        console.log('📸 Screenshot:', req.file ? req.file.filename : 'None');

        const { applicationId, utrNumber } = req.body;

        if (!applicationId || !utrNumber || utrNumber.trim().length < 12) {
            return res.status(400).json({ 
                success: false, 
                message: 'Valid Application ID and UTR number (12+ digits) are required' 
            });
        }

        const applicant = await Applicant.findOne({ 
            applicationId: applicationId.trim()
        });

        if (!applicant) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found. Please submit your application first.' 
            });
        }

        if (applicant.email.toLowerCase() !== req.student.email.toLowerCase()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized access to this application' 
            });
        }

        if (applicant.paymentStatus === 'paid' || applicant.paymentStatus === 'verified') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment already completed for this application' 
            });
        }

        // Create Payment record
        const payment = new Payment({
            applicationId: applicant._id,
            studentEmail: req.student.email,
            utrNumber: utrNumber.trim(),
            amount: parseInt(process.env.APPLICATION_FEE) || 500,
            currency: 'INR',
            status: 'under_verification',
            paymentMethod: 'utr',
            paymentScreenshotUrl: req.file ? `/uploads/applications/${req.file.filename}` : null
        });

        await payment.save();
        console.log('✅ Payment record created:', payment._id);

        // Update applicant
        applicant.paymentStatus = 'under_verification';
        applicant.status = 'under_review';
        applicant.utrNumber = utrNumber.trim();
        applicant.paymentScreenshotUrl = req.file ? `/uploads/applications/${req.file.filename}` : null;
        await applicant.save();

        console.log('✅ UTR submitted successfully for:', applicationId);

        res.json({ 
            success: true, 
            message: 'Payment proof submitted successfully! Our team will verify within 24-48 hours.',
            applicationId: applicationId,
            paymentId: payment._id
        });

    } catch (error) {
        console.error('❌ Submit UTR error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit UTR: ' + error.message 
        });
    }
});

// GET /application/status ✅ SIMPLE STATUS
router.get('/status', studentAuth, async (req, res) => {
    try {
        const applicant = await Applicant.findOne({
            email: req.student.email.toLowerCase(),
            isDraft: false
        }).sort({ createdAt: -1 });

        if (!applicant) {
            return res.json({ success: true, hasApplication: false });
        }

        res.json({
            success: true,
            hasApplication: true,
            application: {
                applicationId: applicant.applicationId,
                paymentStatus: applicant.paymentStatus,
                status: applicant.status,
                courseName: applicant.courseName,
                utrNumber: applicant.utrNumber || null,
                createdAt: applicant.createdAt
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

console.log('✅ All application routes registered ✅');
module.exports = router;
