const Applicant = require('../models/Applicant');
const fs = require('fs');
const path = require('path');

/**
 * ===============================
 * GET ALL APPLICANTS (ADMIN)
 * ===============================
 */
exports.getAllApplicants = async (req, res) => {
  try {
    const applicants = await Applicant.find()
      .sort({ createdAt: -1 });

    return res.render('admin/dashboard', {
      title: 'Applicants Dashboard',
      applicants,
      admin: req.admin || null
    });

  } catch (error) {
    console.error('❌ Error fetching applicants:', error);

    return res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch applicants'
    });
  }
};

/**
 * ===============================
 * GET SINGLE APPLICANT (ADMIN)
 * ===============================
 */
exports.getApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.findById(req.params.id);

    if (!applicant) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Applicant not found'
      });
    }

    return res.render('admin/applicant-details', {
      title: 'Applicant Details',
      applicant,
      admin: req.admin || null
    });

  } catch (error) {
    console.error('❌ Error fetching applicant:', error);

    return res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch applicant details'
    });
  }
};

/**
 * ===============================
 * UPDATE APPLICANT STATUS (ADMIN)
 * ===============================
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Fetch applicant first (FIXES BUG)
    const applicant = await Applicant.findById(req.params.id);

    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    applicant.status = status;
    if (notes) applicant.notes = notes;

    await applicant.save();

    return res.json({
      success: true,
      applicant
    });

  } catch (error) {
    console.error('❌ Error updating applicant status:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

/**
 * ===============================
 * DELETE APPLICANT (ADMIN)
 * ===============================
 */
exports.deleteApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.findById(req.params.id);

    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    /**
     * ===============================
     * SAFE FILE DELETION
     * ===============================
     */
    const deleteFileIfExists = (relativePath) => {
      if (!relativePath) return;

      const cleanPath = relativePath.replace(/^\/+/, '');
      const fullPath = path.join(__dirname, '..', cleanPath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    };

    // Passport photo
    deleteFileIfExists(applicant.photoUrl);

    // ID proof
    deleteFileIfExists(applicant.idProofUrl);

    // Certificate
    deleteFileIfExists(applicant.certificateUrl);

    // Payment screenshot (if exists)
    deleteFileIfExists(applicant.paymentScreenshotUrl);

    await applicant.deleteOne();

    return res.json({
      success: true
    });

  } catch (error) {
    console.error('❌ Error deleting applicant:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete applicant'
    });
  }
};
