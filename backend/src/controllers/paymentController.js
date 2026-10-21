import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { round } from '../services/invoiceService.js';
import { logAudit } from '../services/auditService.js';

export const getPayments = async (req, res, next) => {
  try {
    const { invoiceId, customerId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (invoiceId) query.invoice = invoiceId;
    if (customerId) query.customer = customerId;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, payments] = await Promise.all([
      Payment.countDocuments(query),
      Payment.find(query)
        .populate('customer', 'name organization phone')
        .populate('invoice', 'invoiceNumber grandTotal amountPaid balanceDue status')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('customer', 'name organization')
      .populate('invoice', 'invoiceNumber grandTotal amountPaid balanceDue status')
      .lean();

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, transactionReference, notes } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'draft') {
      return res.status(400).json({ success: false, message: 'Cannot record payment for a draft invoice. Please issue the invoice first.' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot record payment for a cancelled invoice.' });
    }

    const payAmount = round(Number(amount));
    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    if (payAmount > invoice.balanceDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${payAmount}) cannot exceed remaining balance (₹${invoice.balanceDue}).`
      });
    }

    // Create payment
    const payment = await Payment.create({
      invoice: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      amount: payAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'Bank Transfer',
      transactionReference: transactionReference?.trim() || '',
      notes: notes?.trim() || '',
      status: 'completed',
      createdBy: req.user?._id
    });

    // Update invoice balance and status
    const previousAmountPaid = invoice.amountPaid;
    const previousBalanceDue = invoice.balanceDue;

    invoice.amountPaid = round(invoice.amountPaid + payAmount);
    invoice.balanceDue = Math.max(0, round(invoice.grandTotal - invoice.amountPaid));

    if (invoice.balanceDue === 0) {
      invoice.status = 'paid';
      invoice.paymentStatus = 'paid';
    } else {
      invoice.status = 'partially_paid';
      invoice.paymentStatus = 'partially_paid';
    }

    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: payment._id,
      newValues: {
        paymentId: payment._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: payAmount,
        previousBalanceDue,
        newBalanceDue: invoice.balanceDue
      },
      notes: `Recorded payment of ₹${payAmount} for invoice ${invoice.invoiceNumber}. Balance remaining: ₹${invoice.balanceDue}`
    });

    res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmount} recorded successfully`,
      data: {
        payment,
        invoiceBalanceDue: invoice.balanceDue,
        invoiceAmountPaid: invoice.amountPaid,
        invoiceStatus: invoice.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const reversePayment = async (req, res, next) => {
  try {
    const { reason = 'Authorized reversal' } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status === 'reversed') {
      return res.status(400).json({ success: false, message: 'This payment has already been reversed.' });
    }

    const invoice = await Invoice.findById(payment.invoice);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Associated invoice not found' });
    }

    // Revert payment
    payment.status = 'reversed';
    payment.reversedAt = new Date();
    payment.reversalReason = reason;
    await payment.save();

    invoice.amountPaid = Math.max(0, round(invoice.amountPaid - payment.amount));
    invoice.balanceDue = Math.min(invoice.grandTotal, round(invoice.grandTotal - invoice.amountPaid));

    if (invoice.amountPaid === 0) {
      invoice.status = invoice.status === 'cancelled' ? 'cancelled' : 'issued';
      invoice.paymentStatus = 'unpaid';
    } else if (invoice.balanceDue > 0) {
      invoice.status = 'partially_paid';
      invoice.paymentStatus = 'partially_paid';
    }

    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'PAYMENT_REVERSED',
      entityType: 'Payment',
      entityId: payment._id,
      notes: `Reversed payment of ₹${payment.amount} for invoice ${invoice.invoiceNumber}. Reason: ${reason}`
    });

    res.status(200).json({
      success: true,
      message: `Payment of ₹${payment.amount} reversed successfully`,
      data: {
        payment,
        invoiceBalanceDue: invoice.balanceDue,
        invoiceAmountPaid: invoice.amountPaid,
        invoiceStatus: invoice.status
      }
    });
  } catch (error) {
    next(error);
  }
};
