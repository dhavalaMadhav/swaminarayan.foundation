const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  // Personal Details
  fullName: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },
  dob: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    required: false
  },
  address: {
    type: String,
    required: false
  },

  // Academic Details
  qualification: {
    type: String,
    required: false
  },
  boardUniversity: {
    type: String,
    required: false
  },
  passingYear: {
    type: Number,
    required: false
  },
  percentage: {
    type: Number,
    required: false
  },

  // Program Selection
  programType: {
    type: String,
    required: false
  },
  courseName: {
    type: String,
    required: false
  },

  // Document URLs
  photoUrl: {
    type: String,
    required: false
  },
  idProofUrl: {
    type: String,
    required: false
  },
  certificateUrl: {
    type: String,
    required: false
  },

  // Application Details
  applicationId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },

  // Payment Details
  applicationFee: {
    type: Number,
    default: 500
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'under_verification'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['gateway', 'utr', null],
    default: null
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,

  // UTR Payment Details
  utrNumber: String,
  paymentDate: Date,
  paymentMode: String,
  paymentScreenshotUrl: String,
  remarks: String,

  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'on_hold', 'pending_verification'],
    default: 'draft'
  },

  // Draft Management
  isDraft: {
    type: Boolean,
    default: true,
    index: true
  },
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 6
  },
  lastSaved: {
    type: Date,
    default: Date.now
  },

  // Admin Notes
  adminNotes: [{
    note: String,
    adminName: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],

  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
applicantSchema.index({ applicationId: 1 });
applicantSchema.index({ email: 1 });
applicantSchema.index({ phone: 1 });
applicantSchema.index({ paymentStatus: 1 });
applicantSchema.index({ status: 1 });
applicantSchema.index({ createdAt: -1 });
applicantSchema.index({ isDraft: 1, email: 1 });
applicantSchema.index({ email: 1, isDraft: 1, updatedAt: -1 });

// Generate application ID ONLY when converting from draft to submitted
applicantSchema.pre('save', async function (next) {
  if (!this.applicationId && !this.isDraft) {
    const count = await mongoose.model('Applicant').countDocuments({ 
      applicationId: { $exists: true, $ne: null } 
    });
    const year = new Date().getFullYear();
    this.applicationId = `SU${year}-${(count + 1).toString().padStart(5, '0')}`;
    
    if (this.status === 'draft') {
      this.status = 'submitted';
    }
  }
  
  this.lastSaved = new Date();
  
  next();
});

// Method to convert draft to submitted application
applicantSchema.methods.convertToSubmitted = async function() {
  this.isDraft = false;
  this.status = 'submitted';
  await this.save();
  return this;
};

// Method to validate if application is complete
applicantSchema.methods.isComplete = function() {
  return !!(
    this.fullName &&
    this.email &&
    this.phone &&
    this.dob &&
    this.gender &&
    this.address &&
    this.qualification &&
    this.boardUniversity &&
    this.passingYear &&
    this.percentage &&
    this.programType &&
    this.courseName &&
    this.photoUrl &&
    this.idProofUrl &&
    this.certificateUrl
  );
};

// Static method to find user's latest draft
applicantSchema.statics.findLatestDraft = async function(email) {
  console.log('🔍 findLatestDraft called for:', email);
  const draft = await this.findOne({ 
    email: email.toLowerCase(), 
    isDraft: true 
  }).sort({ updatedAt: -1 });
  console.log('🔍 findLatestDraft result:', draft ? 'Found' : 'Not found');
  return draft;
};

// Static method to find user's submitted application
applicantSchema.statics.findSubmittedApplication = async function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    isDraft: false 
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Applicant', applicantSchema);
