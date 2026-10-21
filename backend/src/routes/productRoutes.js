import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { productSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', validate(productSchema), createProduct);
router.patch('/:id', validate(productSchema.partial()), updateProduct);
router.put('/:id', validate(productSchema.partial()), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
