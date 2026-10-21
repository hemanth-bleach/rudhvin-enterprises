import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

const productDefaults = {
  name: '',
  description: '',
  hsnSac: '',
  unit: 'PCS',
  defaultRate: 0,
  defaultTaxRate: 0,
  isActive: true,
  isDeleted: false
};

let ProductModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const productSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true, default: '' },
      hsnSac: { type: String, required: true, trim: true },
      unit: { type: String, trim: true, default: 'PCS' },
      defaultRate: { type: Number, required: true, min: 0, default: 0 },
      defaultTaxRate: { type: Number, enum: [0, 5, 12, 18, 28], default: 0 },
      isActive: { type: Boolean, default: true },
      isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true }
  );

  ProductModel = mongoose.models.Product || mongoose.model('Product', productSchema);
} else {
  ProductModel = createEmbeddedModel('products', productDefaults);
}

export const Product = ProductModel;
