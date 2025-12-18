import Application from '../models/Application.js';
import Payment from '../models/Payment.js';

// Get Dashboard Statistics
export const getDashboardStats = async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments();
    const paidApplications = await Application.countDocuments({ paymentStatus: 'completed' });
    const pendingApplications = await Application.countDocuments({ paymentStatus: 'pending' });
    
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalApplications,
        paidApplications,
        pendingApplications,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// Get All Applications (with filters)
export const getApplications = async (req, res) => {
  try {
    const { paymentStatus, programType, limit = 50, page = 1 } = req.query;
    
    const query = {};
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (programType) query.programType = programType;

    const applications = await Application.find(query)
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// Get Single Application Details
export const getApplicationDetail = async (req, res) => {
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
    console.error('Get application detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application details'
    });
  }
};

// Update Application Status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationStatus } = req.body;
    
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { applicationStatus },
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
      message: 'Application status updated',
      application
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status'
    });
  }
};
