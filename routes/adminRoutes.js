import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import {
  getDashboardStats,
  getApplications,
  getApplicationDetail,
  updateApplicationStatus
} from '../controllers/adminController.js';

const router = express.Router();

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
});

// Protected admin routes (require JWT)
router.use(verifyToken);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', async (req, res) => {
  res.render('admin/dashboard', { title: 'Admin Dashboard', admin: req.admin });
});

// API Routes
router.get('/api/stats', getDashboardStats);
router.get('/api/applications', getApplications);
router.get('/api/applications/:id', getApplicationDetail);
router.put('/api/applications/:id/status', updateApplicationStatus);

// Applications page
router.get('/applications', (req, res) => {
  res.render('admin/applications', { title: 'Applications', admin: req.admin });
});

// Application detail page
router.get('/applications/:id', (req, res) => {
  res.render('admin/applicationDetail', { title: 'Application Detail', admin: req.admin, applicationId: req.params.id });
});

export default router;
