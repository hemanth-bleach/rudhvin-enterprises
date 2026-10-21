import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  peekInvoiceNo,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  getInvoicePdf,
  getInvoiceHtmlPreview,
  deleteInvoice
} from '../controllers/invoiceController.js';
import { recordPayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoiceValidator.js';
import { paymentSchema } from '../validators/paymentValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getInvoices);
router.get('/peek-number', peekInvoiceNo);
router.get('/:id', getInvoiceById);
router.post('/', validate(createInvoiceSchema), createInvoice);
router.patch('/:id', validate(updateInvoiceSchema), updateInvoice);
router.put('/:id', validate(updateInvoiceSchema), updateInvoice);
router.post('/:id/issue', issueInvoice);
router.post('/:id/cancel', cancelInvoice);
router.get('/:id/pdf', getInvoicePdf);
router.get('/:id/preview', getInvoiceHtmlPreview);
router.delete('/:id', deleteInvoice);

// Nested payment recording endpoint
router.post('/:id/payments', (req, res, next) => {
  req.body.invoiceId = req.params.id;
  next();
}, validate(paymentSchema), recordPayment);

export default router;
