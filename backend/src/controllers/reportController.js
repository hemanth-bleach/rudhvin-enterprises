import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';

export const getFinancialReports = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { isDeleted: false };

    if (startDate || endDate) {
      match.invoiceDate = {};
      if (startDate) match.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        match.invoiceDate.$lte = eDate;
      }
    }

    // 1. Status Summary
    const statusSummary = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' },
          balanceDue: { $sum: '$balanceDue' },
          amountPaid: { $sum: '$amountPaid' }
        }
      }
    ]);

    // 2. Monthly Trend (Valid invoices)
    const monthlyTrend = await Invoice.aggregate([
      {
        $match: {
          ...match,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
          },
          billed: { $sum: '$grandTotal' },
          collected: { $sum: '$amountPaid' },
          pending: { $sum: '$balanceDue' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 3. Customer-wise billing
    const customerBilling = await Invoice.aggregate([
      {
        $match: {
          ...match,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: '$customer',
          customerName: { $first: '$customerSnapshot.name' },
          customerOrg: { $first: '$customerSnapshot.organization' },
          invoiceCount: { $sum: 1 },
          totalBilled: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          outstanding: { $sum: '$balanceDue' }
        }
      },
      { $sort: { totalBilled: -1 } }
    ]);

    // 4. Tax summary
    const taxSummary = await Invoice.aggregate([
      {
        $match: {
          ...match,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: '$taxableAmount' },
          totalCgst: { $sum: '$taxBreakdown.cgstAmount' },
          totalSgst: { $sum: '$taxBreakdown.sgstAmount' },
          totalIgst: { $sum: '$taxBreakdown.igstAmount' },
          totalTax: { $sum: '$taxBreakdown.totalTax' },
          totalGrand: { $sum: '$grandTotal' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusSummary,
        monthlyTrend,
        customerBilling,
        taxSummary: taxSummary[0] || {
          totalTaxable: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalTax: 0,
          totalGrand: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
