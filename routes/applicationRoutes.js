import express from 'express';
import {
  createApplication,
  getApplicationById,
  upload
} from '../controllers/applicationController.js';

const router = express.Router();

// Create application with file uploads
router.post(
  '/create',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'idProof', maxCount: 1 },
    { name: 'academicCertificate', maxCount: 1 }
  ]),
  createApplication
);

// Get application by ID
router.get('/:id', getApplicationById);

export default router;
