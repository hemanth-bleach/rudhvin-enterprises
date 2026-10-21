import { Product } from '../models/Product.js';
import { logAudit } from '../services/auditService.js';

export const getProducts = async (req, res, next) => {
  try {
    const { search, activeOnly } = req.query;
    const query = { isDeleted: false };

    if (activeOnly === 'true') {
      query.isActive = true;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { hsnSac: searchRegex }
      ];
    }

    const products = await Product.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      total: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, description, hsnSac, unit, defaultRate, defaultTaxRate, isActive } = req.body;

    const product = await Product.create({
      name: name.trim(),
      description: description?.trim() || '',
      hsnSac: hsnSac.trim(),
      unit: unit?.trim() || 'PCS',
      defaultRate: Number(defaultRate) || 0,
      defaultTaxRate: Number(defaultTaxRate) || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await logAudit({
      user: req.user,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product._id,
      newValues: product.toObject(),
      notes: `Created product ${product.name}`
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousValues = product.toObject();
    Object.assign(product, req.body);
    await product.save();

    await logAudit({
      user: req.user,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product._id,
      previousValues,
      newValues: product.toObject(),
      notes: `Updated product ${product.name}`
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isDeleted = true;
    await product.save();

    await logAudit({
      user: req.user,
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: product._id,
      notes: `Deleted product ${product.name}`
    });

    res.status(200).json({
      success: true,
      message: 'Product removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
