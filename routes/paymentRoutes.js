import express from 'express';
import {
  createOrder,
  verifyPayment,
  getPaymentByApplication
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/application/:applicationId', getPaymentByApplication);

export default router;
