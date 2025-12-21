const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // ✅ Core fields (ALWAYS required)
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Applicant',
        required: true
    },
    studentEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    
    // ✅ Amount details
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    
    // ✅ Payment method (NEW - supports UTR + Razorpay)
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'utr', 'manual'],
        default: 'manual'
    },
    
    // ✅ UTR fields (OPTIONAL for bank transfers)
    utrNumber: {
        type: String,
        trim: true,
        maxlength: 50
    },
    
    // ✅ Razorpay fields (OPTIONAL - sparse indexes)
    razorpayOrderId: {
        type: String,
        sparse: true  // ✅ Allows null/empty for UTR payments
    },
    razorpayPaymentId: {
        type: String,
        sparse: true
    },
    razorpaySignature: {
        type: String,
        sparse: true
    },
    
    // ✅ Payment proof screenshot (OPTIONAL for UTR)
    paymentScreenshotUrl: {
        type: String,
        trim: true
    },
    
    // ✅ Expanded status enum (supports UTR verification)
    status: {
        type: String,
        enum: [
            'created', 
            'pending', 
            'paid', 
            'failed', 
            'under_verification',  // ✅ NEW for UTR
            'verified',            // ✅ NEW for UTR verification complete
            'refunded'
        ],
        default: 'pending'
    },
    
    // ✅ Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    paidAt: {
        type: Date
    },
    verifiedAt: {
        type: Date  // ✅ NEW for UTR verification timestamp
    }
}, {
    timestamps: true
});

// ✅ Indexes for fast lookups
paymentSchema.index({ applicationId: 1 });
paymentSchema.index({ studentEmail: 1 });
paymentSchema.index({ razorpayOrderId: 1, sparse: true });
paymentSchema.index({ utrNumber: 1, sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });

// ✅ Static method to find by application
paymentSchema.statics.findByApplication = async function(applicationId) {
    return this.find({ applicationId }).sort({ createdAt: -1 });
};

// ✅ Static method to find UTR payments
paymentSchema.statics.findUTRPayments = async function(studentEmail) {
    return this.find({ 
        studentEmail, 
        paymentMethod: 'utr' 
    }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Payment', paymentSchema);
