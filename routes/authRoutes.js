import express from 'express';
import { loginAdmin, logoutAdmin, createFirstAdmin } from '../controllers/authController.js';

const router = express.Router();

router.post('/admin/login', loginAdmin);
router.post('/admin/logout', logoutAdmin);
router.post('/admin/setup', createFirstAdmin); // For first-time setup only

export default router;
