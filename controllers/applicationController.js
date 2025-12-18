import Application from '../models/Application.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only .png, .jpg, .jpeg, and .pdf files are allowed'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Create Application
export const createApplication = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      qualification,
      boardUniversity,
      yearOfPassing,
      percentage,
      programType,
      courseName
    } = req.body;

    // Validate files
    if (!req.files || !req.files.photo || !req.files.idProof || !req.files.academicCertificate) {
      return res.status(400).json({
        success: false,
        message: 'All documents (photo, ID proof, academic certificate) are required'
      });
    }

    // Create application
    const application = await Application.create({
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      qualification,
      boardUniversity,
      yearOfPassing: parseInt(yearOfPassing),
      percentage: parseFloat(percentage),
      programType,
      courseName,
      documents: {
        photo: req.files.photo[0].filename,
        idProof: req.files.idProof[0].filename,
        academicCertificate: req.files.academicCertificate[0].filename
      }
    });

    res.status(201).json({
      success: true,
      message: 'Application created successfully',
      applicationId: application._id,
      applicationNumber: application.applicationId
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating application'
    });
  }
};

// Get Application by ID
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('paymentId');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application'
    });
  }
};

// Get all applications (Admin only)
export const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 }).populate('paymentId');
    
    res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// Update application payment status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { applicationId, paymentId, status } = req.body;

    const application = await Application.findByIdAndUpdate(
      applicationId,
      {
        paymentStatus: status,
        paymentId: paymentId
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status'
    });
  }
};
