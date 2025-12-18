// import Razorpay from 'razorpay';
// import crypto from 'crypto';
// import Payment from '../models/Payment.js';
// import Application from '../models/Application.js';

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// // Create Razorpay Order
// export const createOrder = async (req, res) => {
//   try {
//     const { applicationId, email, phone } = req.body;

//     // Verify application exists
//     const application = await Application.findById(applicationId);
//     if (!application) {
//       return res.status(404).json({
//         success: false,
//         message: 'Application not found'
//       });
//     }

//     // Check if already paid
//     if (application.paymentStatus === 'completed') {
//       return res.status(400).json({
//         success: false,
//         message: 'Payment already completed for this application'
//       });
//     }

//     const amount = parseInt(process.env.APPLICATION_FEE); // Amount in paise

//     // Create Razorpay order
//     const options = {
//       amount: amount,
//       currency: 'INR',
//       receipt: `receipt_${applicationId}_${Date.now()}`,
//       notes: {
//         applicationId: applicationId,
//         email: email,
//         phone: phone
//       }
//     };

//     const order = await razorpay.orders.create(options);

//     // Save payment record
//     const payment = await Payment.create({
//       applicationId,
//       razorpayOrderId: order.id,
//       amount: amount / 100, // Store in rupees
//       email,
//       phone,
//       status: 'created'
//     });

//     res.json({
//       success: true,
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       paymentId: payment._id
//     });
//   } catch (error) {
//     console.error('Create order error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error creating payment order'
//     });
//   }
// };

// // Verify Payment Signature
// export const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpayOrderId,
//       razorpayPaymentId,
//       razorpaySignature,
//       applicationId
//     } = req.body;

//     // Generate signature for verification
//     const generatedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//       .digest('hex');

//     // Verify signature
//     if (generatedSignature !== razorpaySignature) {
//       // Update payment as failed
//       await Payment.findOneAndUpdate(
//         { razorpayOrderId },
//         {
//           status: 'failed',
//           razorpayPaymentId,
//           razorpaySignature
//         }
//       );

//       return res.status(400).json({
//         success: false,
//         message: 'Payment verification failed'
//       });
//     }

//     // Update payment record
//     const payment = await Payment.findOneAndUpdate(
//       { razorpayOrderId },
//       {
//         razorpayPaymentId,
//         razorpaySignature,
//         status: 'paid',
//         paidAt: new Date()
//       },
//       { new: true }
//     );

//     // Update application payment status
//     await Application.findByIdAndUpdate(applicationId, {
//       paymentStatus: 'completed',
//       paymentId: payment._id
//     });

//     res.json({
//       success: true,
//       message: 'Payment verified successfully',
//       payment
//     });
//   } catch (error) {
//     console.error('Verify payment error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error verifying payment'
//     });
//   }
// };

// // Get Payment by Application ID
// export const getPaymentByApplication = async (req, res) => {
//   try {
//     const payment = await Payment.findOne({ applicationId: req.params.applicationId });
    
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Payment not found'
//       });
//     }

//     res.json({
//       success: true,
//       payment
//     });
//   } catch (error) {
//     console.error('Get payment error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching payment'
//     });
//   }
// };
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Application from '../models/Application.js';

// Initialize Razorpay only if keys are available
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
} else {
  console.warn('⚠️  Razorpay keys not configured - payment features disabled');
}

// Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.'
      });
    }

    const { applicationId, email, phone } = req.body;

    // Verify application exists
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if already paid
    if (application.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this application'
      });
    }

    const amount = parseInt(process.env.APPLICATION_FEE); // Amount in paise

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${applicationId}_${Date.now()}`,
      notes: {
        applicationId: applicationId,
        email: email,
        phone: phone
      }
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = await Payment.create({
      applicationId,
      razorpayOrderId: order.id,
      amount: amount / 100, // Store in rupees
      email,
      phone,
      status: 'created'
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: error.message
    });
  }
};

// Verify Payment Signature
export const verifyPayment = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.'
      });
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      applicationId
    } = req.body;

    // Generate signature for verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // Verify signature
    if (generatedSignature !== razorpaySignature) {
      // Update payment as failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          status: 'failed',
          razorpayPaymentId,
          razorpaySignature
        }
      );

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: 'paid',
        paidAt: new Date()
      },
      { new: true }
    );

    // Update application payment status
    await Application.findByIdAndUpdate(applicationId, {
      paymentStatus: 'completed',
      paymentId: payment._id
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

// Get Payment by Application ID
export const getPaymentByApplication = async (req, res) => {
  try {
    const payment = await Payment.findOne({ applicationId: req.params.applicationId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};
