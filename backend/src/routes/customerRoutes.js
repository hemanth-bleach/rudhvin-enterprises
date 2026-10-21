import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { customerSchema } from '../validators/customerValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validate(customerSchema), createCustomer);
router.patch('/:id', validate(customerSchema.partial()), updateCustomer);
router.put('/:id', validate(customerSchema.partial()), updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
