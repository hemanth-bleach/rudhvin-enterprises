import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Company } from '../models/Company.js';
import { Payment } from '../models/Payment.js';
import { getNextInvoiceNumber, peekNextInvoiceNumber, calculateInvoiceTotals } from '../services/invoiceService.js';
import { generateInvoicePdfBuffer } from '../services/pdfService.js';
import { getInvoiceHtml } from '../templates/invoiceTemplate.js';
import { logAudit } from '../services/auditService.js';

export const getInvoices = async (req, res, next) => {
  try {
    const {
      search,
      status,
      paymentStatus,
      customerId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      exportCsv = false
    } = req.query;

    const query = { isDeleted: false };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (customerId && customerId !== 'all') {
      query.customer = customerId;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = eDate;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { 'customerSnapshot.name': searchRegex },
        { 'customerSnapshot.organization': searchRegex },
        { 'customerSnapshot.gstin': searchRegex }
      ];
    }

    // CSV export mode
    if (exportCsv === 'true') {
      const allInvoices = await Invoice.find(query)
        .populate('customer', 'name organization phone email')
        .sort({ invoiceDate: -1 })
        .lean();

      let csv = 'Invoice No,Date,Customer,Subtotal,Tax,Grand Total,Amount Paid,Balance Due,Status,Payment Status\n';
      allInvoices.forEach(inv => {
        const custName = `"${(inv.customerSnapshot?.name || inv.customer?.name || '').replace(/"/g, '""')}"`;
        const dateStr = inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '';
        csv += `${inv.invoiceNumber},${dateStr},${custName},${inv.subtotal},${inv.taxBreakdown?.totalTax || 0},${inv.grandTotal},${inv.amountPaid},${inv.balanceDue},${inv.status},${inv.paymentStatus}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
      return res.status(200).send(csv);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = order === 'asc' ? 1 : -1;

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(query),
      Invoice.find(query)
        .populate('customer', 'name organization phone email')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false })
      .populate('customer', 'name organization phone email billingAddress')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payments = await Payment.find({ invoice: invoice._id, status: 'completed' })
      .sort({ paymentDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...invoice,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

export const peekInvoiceNo = async (req, res, next) => {
  try {
    const nextNumber = await peekNextInvoiceNumber();
    res.status(200).json({
      success: true,
      data: { nextNumber }
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const {
      customerId,
      invoiceDate,
      dueDate,
      paymentTerms,
      notes,
      poNumber,
      referenceNumber,
      discount = 0,
      items,
      status = 'issued'
    } = req.body;

    const customer = await Customer.findOne({ _id: customerId, isDeleted: false }).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Selected customer was not found' });
    }

    let company = await Company.findOne().lean();
    if (!company) {
      company = await Company.create({});
    }

    // Calculate authoritative totals
    const calculations = calculateInvoiceTotals(
      items,
      company.stateCode || '37',
      customer.stateCode || '37',
      discount
    );

    // Generate atomic next invoice number
    const invoiceNumber = await getNextInvoiceNumber();

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const invDueDate = dueDate ? new Date(dueDate) : new Date(invDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    const isDraft = status === 'draft';
    const invoiceStatus = isDraft ? 'draft' : 'issued';

    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceDate: invDate,
      dueDate: invDueDate,
      customer: customer._id,
      sellerSnapshot: {
        companyName: company.companyName,
        tagline: company.tagline,
        address: company.address,
        phone: company.phone,
        mobile: company.mobile,
        email: company.email,
        gstin: company.gstin,
        state: company.state,
        stateCode: company.stateCode,
        bankDetails: company.bankDetails,
        authorizedSignatory: company.authorizedSignatory,
        invoiceFooter: company.invoiceFooter
      },
      customerSnapshot: {
        name: customer.name,
        organization: customer.organization,
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddress,
        gstin: customer.gstin,
        phone: customer.phone,
        email: customer.email,
        state: customer.state,
        stateCode: customer.stateCode,
        contactPerson: customer.contactPerson
      },
      lineItems: calculations.items,
      subtotal: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      taxableAmount: calculations.taxableAmount,
      taxBreakdown: calculations.taxBreakdown,
      grandTotal: calculations.grandTotal,
      amountPaid: 0,
      balanceDue: calculations.grandTotal,
      status: invoiceStatus,
      paymentStatus: 'unpaid',
      paymentTerms: paymentTerms || company.defaultPaymentTerms || 'Due on Receipt',
      notes: notes || '',
      poNumber: poNumber || '',
      referenceNumber: referenceNumber || '',
      amountInWords: calculations.amountInWords,
      issuedAt: isDraft ? null : new Date(),
      createdBy: req.user?._id
    });

    await logAudit({
      user: req.user,
      action: isDraft ? 'INVOICE_SAVED_AS_DRAFT' : 'INVOICE_ISSUED',
      entityType: 'Invoice',
      entityId: invoice._id,
      newValues: { invoiceNumber, grandTotal: invoice.grandTotal, status: invoice.status },
      notes: `${isDraft ? 'Draft created' : 'Issued invoice'} ${invoiceNumber} for ${customer.name} (₹${invoice.grandTotal})`
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNumber} ${isDraft ? 'saved as draft' : 'issued successfully'}`,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot edit a cancelled invoice' });
    }

    const previousValues = invoice.toObject();

    let company = await Company.findOne().lean();
    if (!company) company = await Company.create({});

    const sellerStateCode = invoice.sellerSnapshot?.stateCode || company.stateCode || '37';
    const customerStateCode = invoice.customerSnapshot?.stateCode || '37';

    if (req.body.items) {
      const calculations = calculateInvoiceTotals(
        req.body.items,
        sellerStateCode,
        customerStateCode,
        req.body.discount !== undefined ? req.body.discount : invoice.totalDiscount
      );
      invoice.lineItems = calculations.items;
      invoice.subtotal = calculations.subtotal;
      invoice.totalDiscount = calculations.totalDiscount;
      invoice.taxableAmount = calculations.taxableAmount;
      invoice.taxBreakdown = calculations.taxBreakdown;
      invoice.grandTotal = calculations.grandTotal;
      invoice.balanceDue = Math.max(0, calculations.grandTotal - invoice.amountPaid);
      invoice.amountInWords = calculations.amountInWords;
    }

    if (req.body.invoiceDate) invoice.invoiceDate = new Date(req.body.invoiceDate);
    if (req.body.dueDate) invoice.dueDate = new Date(req.body.dueDate);
    if (req.body.paymentTerms) invoice.paymentTerms = req.body.paymentTerms;
    if (req.body.notes !== undefined) invoice.notes = req.body.notes;
    if (req.body.poNumber !== undefined) invoice.poNumber = req.body.poNumber;
    if (req.body.referenceNumber !== undefined) invoice.referenceNumber = req.body.referenceNumber;
    invoice.updatedBy = req.user?._id;

    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'INVOICE_UPDATED',
      entityType: 'Invoice',
      entityId: invoice._id,
      previousValues,
      newValues: invoice.toObject(),
      notes: `Updated invoice ${invoice.invoiceNumber}`
    });

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const issueInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft invoices can be issued' });
    }

    invoice.status = invoice.amountPaid > 0 ? (invoice.balanceDue === 0 ? 'paid' : 'partially_paid') : 'issued';
    invoice.issuedAt = new Date();
    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'INVOICE_ISSUED',
      entityType: 'Invoice',
      entityId: invoice._id,
      notes: `Issued draft invoice ${invoice.invoiceNumber}`
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} issued successfully`,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req, res, next) => {
  try {
    const { reason = 'Cancelled by authorized user' } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled' });
    }

    const previousStatus = invoice.status;
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = reason;
    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'INVOICE_CANCELLED',
      entityType: 'Invoice',
      entityId: invoice._id,
      previousValues: { status: previousStatus },
      newValues: { status: 'cancelled', cancellationReason: reason },
      notes: `Cancelled invoice ${invoice.invoiceNumber}. Reason: ${reason}`
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been cancelled`,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceHtmlPreview = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const html = getInvoiceHtml(invoice);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

export const getInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation error:', error);
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.isDeleted = true;
    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'INVOICE_DELETED',
      entityType: 'Invoice',
      entityId: invoice._id,
      notes: `Deleted invoice ${invoice.invoiceNumber}`
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} deleted`
    });
  } catch (error) {
    next(error);
  }
};
