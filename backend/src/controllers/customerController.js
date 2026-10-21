import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { logAudit } from '../services/auditService.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = { isDeleted: false };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { organization: searchRegex },
        { gstin: searchRegex },
        { phone: searchRegex },
        { email: searchRegex }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, customers] = await Promise.all([
      Customer.countDocuments(query),
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    // Attach outstanding balance for each customer
    const customerIds = customers.map(c => c._id);
    const balances = await Invoice.aggregate([
      {
        $match: {
          customer: { $in: customerIds },
          isDeleted: false,
          status: { $nin: ['draft', 'cancelled'] },
          balanceDue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$customer',
          outstandingBalance: { $sum: '$balanceDue' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]);

    const balanceMap = new Map();
    balances.forEach(b => {
      balanceMap.set(String(b._id), {
        outstandingBalance: b.outstandingBalance,
        invoiceCount: b.invoiceCount
      });
    });

    const enrichedCustomers = customers.map(c => ({
      ...c,
      outstandingBalance: balanceMap.get(String(c._id))?.outstandingBalance || 0,
      invoiceCount: balanceMap.get(String(c._id))?.invoiceCount || 0
    }));

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: enrichedCustomers
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const invoices = await Invoice.find({ customer: customer._id, isDeleted: false })
      .sort({ invoiceDate: -1 })
      .lean();

    const outstandingBalance = invoices
      .filter(inv => !['draft', 'cancelled'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        ...customer,
        invoices,
        outstandingBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, organization, billingAddress, shippingAddress, gstin, phone, email, state, stateCode, contactPerson } = req.body;

    // Check duplicate warning if exact name or gstin exists
    if (gstin && gstin.trim()) {
      const existing = await Customer.findOne({ gstin: gstin.toUpperCase().trim(), isDeleted: false });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A customer with GSTIN ${gstin} already exists (${existing.name}).`
        });
      }
    }

    const customer = await Customer.create({
      name: name.trim(),
      organization: organization?.trim() || '',
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress?.trim() || '',
      gstin: gstin?.toUpperCase().trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim().toLowerCase() || '',
      state: state || 'Andhra Pradesh',
      stateCode: stateCode || '37',
      contactPerson: contactPerson?.trim() || ''
    });

    await logAudit({
      user: req.user,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer._id,
      newValues: customer.toObject(),
      notes: `Added customer ${customer.name}`
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const previousValues = customer.toObject();
    Object.assign(customer, req.body);
    await customer.save();

    await logAudit({
      user: req.user,
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: customer._id,
      previousValues,
      newValues: customer.toObject(),
      notes: `Updated customer ${customer.name}`
    });

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Preserve customer data but mark as deleted
    customer.isDeleted = true;
    await customer.save();

    await logAudit({
      user: req.user,
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: customer._id,
      notes: `Deleted customer ${customer.name}`
    });

    res.status(200).json({
      success: true,
      message: 'Customer removed successfully. Historical invoices preserved.'
    });
  } catch (error) {
    next(error);
  }
};
