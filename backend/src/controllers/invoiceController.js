import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Company } from '../models/Company.js';
import { Payment } from '../models/Payment.js';
import { InvoiceSequence } from '../models/InvoiceSequence.js';
import { getNextInvoiceNumber, peekNextInvoiceNumber, calculateInvoiceTotals } from '../services/invoiceService.js';
import { generateInvoicePdfBuffer } from '../services/pdfService.js';
import { getInvoiceHtml } from '../templates/invoiceTemplate.js';
import { logAudit } from '../services/auditService.js';
import { numberToWords } from '../utils/numberToWords.js';

export function normalizeInvoice(inv) {
  if (!inv) return inv;
  const rawItems = inv.lineItems || inv.items || [];
  const isInterState = Boolean(inv.taxBreakdown?.isInterState);

  const items = rawItems.map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const unitRate = Number(item.unitRate !== undefined ? item.unitRate : (item.rate || 0));
    const lineGross = qty * unitRate;
    const discAmount = Number(item.discountAmount) || ((lineGross * (Number(item.discountPercent) || 0)) / 100);
    const taxableValue = Number(item.taxableValue !== undefined ? item.taxableValue : (item.taxableAmount !== undefined ? item.taxableAmount : (lineGross - discAmount)));
    const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (item.taxRate || 0));
    const gstAmount = Number(item.gstAmount !== undefined ? item.gstAmount : (item.taxAmount || (taxableValue * gstRate / 100)));
    const lineTotal = Number(item.lineTotal !== undefined ? item.lineTotal : (item.totalAmount || (taxableValue + gstAmount)));

    const cgstRate = isInterState ? 0 : (item.cgstRate !== undefined ? item.cgstRate : gstRate / 2);
    const sgstRate = isInterState ? 0 : (item.sgstRate !== undefined ? item.sgstRate : gstRate / 2);
    const igstRate = isInterState ? (item.igstRate !== undefined ? item.igstRate : gstRate) : 0;
    const cgstAmount = isInterState ? 0 : (item.cgstAmount !== undefined ? item.cgstAmount : gstAmount / 2);
    const sgstAmount = isInterState ? 0 : (item.sgstAmount !== undefined ? item.sgstAmount : gstAmount / 2);
    const igstAmount = isInterState ? (item.igstAmount !== undefined ? item.igstAmount : gstAmount) : 0;

    return {
      ...item,
      serialNumber: item.serialNumber || idx + 1,
      unitRate,
      rate: unitRate,
      taxableValue,
      taxableAmount: taxableValue,
      gstRate,
      taxRate: gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      gstAmount,
      taxAmount: gstAmount,
      lineTotal,
      totalAmount: lineTotal
    };
  });

  const taxableValue = Number(inv.taxableValue !== undefined ? inv.taxableValue : (inv.taxableAmount !== undefined ? inv.taxableAmount : (inv.subtotal || 0)));
  const totalGst = Number(inv.totalGst !== undefined ? inv.totalGst : (inv.taxBreakdown?.totalTax || 0));
  const cgstAmount = Number(inv.cgstAmount !== undefined ? inv.cgstAmount : (inv.taxBreakdown?.cgstAmount || (isInterState ? 0 : totalGst / 2)));
  const sgstAmount = Number(inv.sgstAmount !== undefined ? inv.sgstAmount : (inv.taxBreakdown?.sgstAmount || (isInterState ? 0 : totalGst / 2)));
  const igstAmount = Number(inv.igstAmount !== undefined ? inv.igstAmount : (inv.taxBreakdown?.igstAmount || (isInterState ? totalGst : 0)));

  return {
    ...inv,
    items,
    lineItems: items,
    taxableValue,
    taxableAmount: taxableValue,
    totalGst,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gemContractNumber: inv.gemContractNumber || '',
    placeOfSupply: inv.placeOfSupply || inv.customerSnapshot?.state || '',
    isSample: Boolean(inv.isSample),
    invoiceStatus: inv.status || 'draft',
    amountInWords: inv.amountInWords || numberToWords(inv.grandTotal)
  };
}

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
        { gemContractNumber: searchRegex },
        { 'customerSnapshot.name': searchRegex },
        { 'customerSnapshot.organization': searchRegex },
        { 'customerSnapshot.gstin': searchRegex }
      ];
    }

    // CSV export mode matching requested table columns
    if (exportCsv === 'true') {
      const allInvoices = await Invoice.find(query)
        .populate('customer', 'name organization phone email')
        .sort({ invoiceDate: -1 })
        .lean();

      let csv = 'Invoice No,Invoice Date,Customer,Taxable Value,Total GST,Invoice Total,Amount Paid,Pending Amount,Invoice Status,Payment Status,Amount in Words\n';
      allInvoices.forEach(rawInv => {
        const inv = normalizeInvoice(rawInv);
        const custName = `"${(inv.customerSnapshot?.organization || inv.customerSnapshot?.name || inv.customer?.name || '').replace(/"/g, '""')}"`;
        const wordsStr = `"${(inv.amountInWords || numberToWords(inv.grandTotal) || '').replace(/"/g, '""')}"`;
        const dateStr = inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '';
        csv += `${inv.invoiceNumber},${dateStr},${custName},${inv.taxableValue.toFixed(2)},${inv.totalGst.toFixed(2)},${inv.grandTotal.toFixed(2)},${inv.amountPaid.toFixed(2)},${inv.balanceDue.toFixed(2)},${inv.status},${inv.paymentStatus},${wordsStr}\n`;
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

    const [total, rawInvoices] = await Promise.all([
      Invoice.countDocuments(query),
      Invoice.find(query)
        .populate('customer', 'name organization phone email')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const invoices = rawInvoices.map(normalizeInvoice);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const rawInvoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false })
      .populate('customer', 'name organization phone email billingAddress')
      .lean();

    if (!rawInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = normalizeInvoice(rawInvoice);

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
      gemContractNumber = '',
      placeOfSupply = '',
      isSample = false,
      taxTreatment = 'auto',
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

    const sellerStateCode = company.stateCode || '37';
    const customerStateCode = customer.stateCode || '37';
    const pos = placeOfSupply.trim() || `${customer.state || 'Andhra Pradesh'} (${customerStateCode})`;

    // Server-side authoritative totals calculation (frontend cannot override)
    const calculations = calculateInvoiceTotals(
      items,
      sellerStateCode,
      customerStateCode,
      discount,
      {
        placeOfSupply: pos,
        taxTreatment
      }
    );

    // Editable Invoice Number: Use provided custom number if present, or auto-generate
    let invoiceNumber;
    if (req.body.invoiceNumber && req.body.invoiceNumber.trim()) {
      const customNum = req.body.invoiceNumber.trim();
      const existing = await Invoice.findOne({ invoiceNumber: customNum, isDeleted: false });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Invoice number "${customNum}" is already in use by another invoice.`
        });
      }
      invoiceNumber = customNum;
    } else {
      invoiceNumber = await getNextInvoiceNumber();
    }

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const invDueDate = dueDate ? new Date(dueDate) : new Date(invDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    const isDraft = status === 'draft';
    const invoiceStatus = isDraft ? 'draft' : 'issued';

    const invoiceData = {
      invoiceNumber,
      invoiceDate: invDate,
      dueDate: invDueDate,
      gemContractNumber: gemContractNumber.trim(),
      placeOfSupply: pos,
      isSample: Boolean(isSample),
      taxTreatment,
      customer: customer._id,
      sellerSnapshot: {
        companyName: company.companyName || 'RUDHVIN ENTERPRISES',
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
      items: calculations.items,
      subtotal: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      taxableValue: calculations.taxableValue,
      taxableAmount: calculations.taxableValue,
      cgstAmount: calculations.cgstAmount,
      sgstAmount: calculations.sgstAmount,
      igstAmount: calculations.igstAmount,
      totalGst: calculations.totalGst,
      taxBreakdown: calculations.taxBreakdown,
      grandTotal: calculations.grandTotal,
      amountPaid: 0,
      balanceDue: calculations.grandTotal,
      status: invoiceStatus,
      invoiceStatus: invoiceStatus,
      paymentStatus: 'unpaid',
      paymentTerms: paymentTerms || company.defaultPaymentTerms || 'Due on Receipt',
      notes: notes || '',
      poNumber: poNumber || '',
      referenceNumber: referenceNumber || '',
      amountInWords: calculations.amountInWords,
      issuedAt: isDraft ? null : new Date(),
      createdBy: req.user?._id
    };

    const invoice = await Invoice.create(invoiceData);

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
      data: normalizeInvoice(invoice.toObject ? invoice.toObject() : invoice)
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

    // Role check: Only admin can amend/correct issued invoices
    if (invoice.status !== 'draft' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can amend or correct issued invoices'
      });
    }

    const previousValues = invoice.toObject ? invoice.toObject() : { ...invoice };

    let company = await Company.findOne().lean();
    if (!company) company = await Company.create({});

    const sellerStateCode = invoice.sellerSnapshot?.stateCode || company.stateCode || '37';
    const customerStateCode = invoice.customerSnapshot?.stateCode || '37';
    const pos = req.body.placeOfSupply !== undefined ? req.body.placeOfSupply : invoice.placeOfSupply;
    const taxTreatment = req.body.taxTreatment || invoice.taxTreatment || 'auto';

    if (req.body.items) {
      const calculations = calculateInvoiceTotals(
        req.body.items,
        sellerStateCode,
        customerStateCode,
        req.body.discount !== undefined ? req.body.discount : invoice.totalDiscount,
        {
          placeOfSupply: pos,
          taxTreatment
        }
      );
      invoice.lineItems = calculations.items;
      invoice.items = calculations.items;
      invoice.subtotal = calculations.subtotal;
      invoice.totalDiscount = calculations.totalDiscount;
      invoice.taxableValue = calculations.taxableValue;
      invoice.taxableAmount = calculations.taxableValue;
      invoice.cgstAmount = calculations.cgstAmount;
      invoice.sgstAmount = calculations.sgstAmount;
      invoice.igstAmount = calculations.igstAmount;
      invoice.totalGst = calculations.totalGst;
      invoice.taxBreakdown = calculations.taxBreakdown;
      invoice.grandTotal = calculations.grandTotal;
      invoice.balanceDue = Math.max(0, calculations.grandTotal - invoice.amountPaid);
      invoice.amountInWords = calculations.amountInWords;
    }

    if (req.body.invoiceNumber && req.body.invoiceNumber.trim()) {
      const customNum = req.body.invoiceNumber.trim();
      if (customNum !== invoice.invoiceNumber) {
        const existing = await Invoice.findOne({
          invoiceNumber: customNum,
          _id: { $ne: invoice._id },
          isDeleted: false
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Invoice number "${customNum}" is already in use by another invoice.`
          });
        }
        invoice.invoiceNumber = customNum;
      }
    }

    if (req.body.gemContractNumber !== undefined) invoice.gemContractNumber = req.body.gemContractNumber.trim();
    if (req.body.placeOfSupply !== undefined) invoice.placeOfSupply = req.body.placeOfSupply.trim();
    if (req.body.isSample !== undefined) invoice.isSample = Boolean(req.body.isSample);
    if (req.body.taxTreatment !== undefined) invoice.taxTreatment = req.body.taxTreatment;
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
      action: invoice.status === 'draft' ? 'INVOICE_UPDATED' : 'INVOICE_AMENDED',
      entityType: 'Invoice',
      entityId: invoice._id,
      previousValues,
      newValues: invoice.toObject ? invoice.toObject() : invoice,
      notes: `${invoice.status === 'draft' ? 'Updated draft' : 'Amended issued invoice'} ${invoice.invoiceNumber}`
    });

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: normalizeInvoice(invoice.toObject ? invoice.toObject() : invoice)
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

    // Role check: Only admin or authorized user
    if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    invoice.status = invoice.amountPaid > 0 ? (invoice.balanceDue === 0 ? 'paid' : 'partially_paid') : 'issued';
    invoice.invoiceStatus = invoice.status;
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
      data: normalizeInvoice(invoice.toObject ? invoice.toObject() : invoice)
    });
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req, res, next) => {
  try {
    // Role check: Only admin can cancel invoices
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can cancel invoices'
      });
    }

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
    invoice.invoiceStatus = 'cancelled';
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
      data: normalizeInvoice(invoice.toObject ? invoice.toObject() : invoice)
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceHtmlPreview = async (req, res, next) => {
  try {
    const rawInvoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!rawInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = normalizeInvoice(rawInvoice);
    const html = getInvoiceHtml(invoice);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

export const getInvoicePdf = async (req, res, next) => {
  try {
    const rawInvoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!rawInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = normalizeInvoice(rawInvoice);
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
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can delete invoices' });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invNum = invoice.invoiceNumber;
    const isPermanent = req.query.permanent === 'true';

    if (isPermanent) {
      await Invoice.deleteOne({ _id: invoice._id });
      await Payment.deleteMany({ invoice: invoice._id });
    } else {
      invoice.isDeleted = true;
      await invoice.save();
    }

    await logAudit({
      user: req.user,
      action: 'INVOICE_DELETED',
      entityType: 'Invoice',
      entityId: invoice._id,
      notes: `Deleted invoice ${invNum} (${isPermanent ? 'permanent' : 'soft'})`
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invNum} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

export const purgeOldInvoices = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can purge old invoices' });
    }

    const { ids } = req.body || {};
    let deletedCount = 0;

    if (Array.isArray(ids) && ids.length > 0) {
      for (const id of ids) {
        await Invoice.deleteOne({ _id: id });
        await Payment.deleteMany({ invoice: id });
        deletedCount++;
      }
    } else {
      const allInvoices = await Invoice.find({});
      deletedCount = allInvoices.length;
      await Invoice.deleteMany({});
      await Payment.deleteMany({});
      await InvoiceSequence.findOneAndUpdate({ key: 'RU' }, { currentSequence: 0 });
    }

    await logAudit({
      user: req.user,
      action: 'INVOICES_PURGED',
      entityType: 'Invoice',
      notes: `Purged ${deletedCount} old invoice(s) and reset invoice sequence`
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} invoice(s) successfully`,
      deletedCount
    });
  } catch (error) {
    next(error);
  }
};
