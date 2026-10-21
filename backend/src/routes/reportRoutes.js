import express from 'express';
import { getFinancialReports } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getFinancialReports);

export default router;
