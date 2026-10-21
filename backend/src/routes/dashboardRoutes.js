import express from 'express';
import { getStats, getMonthlySummary, getRecentInvoices, getRecentActivity } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, getStats);
router.get('/monthly-summary', authenticate, getMonthlySummary);
router.get('/recent-invoices', authenticate, getRecentInvoices);
router.get('/recent-activity', authenticate, getRecentActivity);

export default router;
