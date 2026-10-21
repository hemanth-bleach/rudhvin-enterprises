import express from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/company', getCompanySettings);
router.patch('/company', requireAdmin, updateCompanySettings);
router.put('/company', requireAdmin, updateCompanySettings);

export default router;
