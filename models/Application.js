import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  // Personal Details
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  
  // Academic Details
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    enum: ['10th', '12th', 'Diploma', 'Undergraduate', 'Postgraduate']
  },
  boardUniversity: {
    type: String,
    required: [true, 'Board/University is required']
  },
  yearOfPassing: {
    type: Number,
    required: [true, 'Year of passing is required'],
    min: 1990,
    max: new Date().getFullYear()
  },
  percentage: {
    type: Number,
    required: [true, 'Percentage is required'],
    min: 0,
    max: 100
  },
  
  // Program Selection
  programType: {
    type: String,
    required: [true, 'Program type is required'],
    enum: ['Diploma', 'Undergraduate', 'Postgraduate', 'PhD']
  },
  courseName: {
    type: String,
    required: [true, 'Course name is required']
  },
  
  // Document Uploads (Store file paths)
  documents: {
    photo: {
      type: String,
      required: [true, 'Photo is required']
    },
    idProof: {
      type: String,
      required: [true, 'ID proof is required']
    },
    academicCertificate: {
      type: String,
      required: [true, 'Academic certificate is required']
    }
  },
  
  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  
  // Application Status
  applicationStatus: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected'],
    default: 'submitted'
  },
  
  // Application ID (unique identifier for students)
  applicationId: {
    type: String,
    unique: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate application ID before saving
applicationSchema.pre('save', async function(next) {
  if (!this.applicationId) {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    this.applicationId = `SU${year}${random}`;
  }
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Application', applicationSchema);
