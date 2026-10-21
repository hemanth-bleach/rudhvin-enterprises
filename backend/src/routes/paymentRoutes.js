import express from 'express';
import {
  getPayments,
  getPaymentById,
  recordPayment,
  reversePayment
} from '../controllers/paymentController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paymentSchema, reversePaymentSchema } from '../validators/paymentValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.post('/', validate(paymentSchema), recordPayment);
router.post('/:id/reverse', requireAdmin, validate(reversePaymentSchema), reversePayment);

export default router;
