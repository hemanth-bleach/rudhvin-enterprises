import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { AuditLog } from '../models/AuditLog.js';

export const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const startOfThisMonth = new Date(currentYear, currentMonth, 1);
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);

    // 1. Total Invoices counts (including drafts, issued, cancelled)
    const [
      totalInvoices,
      draftCount,
      cancelledCount,
      totalCustomers
    ] = await Promise.all([
      Invoice.countDocuments({ isDeleted: false }),
      Invoice.countDocuments({ isDeleted: false, status: 'draft' }),
      Invoice.countDocuments({ isDeleted: false, status: 'cancelled' }),
      Customer.countDocuments({ isDeleted: false })
    ]);

    const issuedCount = Math.max(0, totalInvoices - draftCount - cancelledCount);

    // 2. Financial Aggregations (Grand totals, Paid amounts, Pending amounts)
    const financialAggregation = await Invoice.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: null,
          totalBilledAmount: { $sum: '$grandTotal' },
          totalPaidAmount: { $sum: '$amountPaid' },
          pendingAmount: {
            $sum: {
              $cond: [
                { $gt: ['$balanceDue', 0] },
                '$balanceDue',
                0
              ]
            }
          },
          pendingInvoicesCount: {
            $sum: {
              $cond: [
                { $gt: ['$balanceDue', 0] },
                1,
                0
              ]
            }
          },
          paidInvoicesCount: {
            $sum: {
              $cond: [
                { $eq: ['$balanceDue', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const fin = financialAggregation[0] || {
      totalBilledAmount: 0,
      totalPaidAmount: 0,
      pendingAmount: 0,
      pendingInvoicesCount: 0,
      paidInvoicesCount: 0
    };

    // 3. Month-over-Month Real Trend Calculations
    const thisMonthInvoices = await Invoice.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startOfThisMonth, $lt: startOfNextMonth }
    });

    const lastMonthInvoices = await Invoice.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }
    });

    let invoicesTrend = null;
    if (lastMonthInvoices > 0) {
      invoicesTrend = Math.round(((thisMonthInvoices - lastMonthInvoices) / lastMonthInvoices) * 100);
    }

    const thisMonthBilledAgg = await Invoice.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $nin: ['draft', 'cancelled'] },
          invoiceDate: { $gte: startOfThisMonth, $lt: startOfNextMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' }
        }
      }
    ]);

    const lastMonthBilledAgg = await Invoice.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $nin: ['draft', 'cancelled'] },
          invoiceDate: { $gte: startOfLastMonth, $lt: startOfThisMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' }
        }
      }
    ]);

    const thisMonthBilled = thisMonthBilledAgg[0]?.total || 0;
    const lastMonthBilled = lastMonthBilledAgg[0]?.total || 0;

    let billedTrend = null;
    if (lastMonthBilled > 0) {
      billedTrend = Math.round(((thisMonthBilled - lastMonthBilled) / lastMonthBilled) * 100);
    }

    const stats = {
      totalInvoices,
      issuedCount,
      draftCount,
      cancelledCount,
      totalBilledAmount: fin.totalBilledAmount,
      totalPaidAmount: fin.totalPaidAmount,
      pendingAmount: fin.pendingAmount,
      pendingInvoicesCount: fin.pendingInvoicesCount,
      paidInvoicesCount: fin.paidInvoicesCount,
      totalCustomers,
      thisMonthInvoices,
      lastMonthInvoices,
      invoicesTrend,
      thisMonthBilled,
      lastMonthBilled,
      billedTrend
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlySummary = async (req, res, next) => {
  try {
    const monthlyData = await Invoice.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
          },
          billedAmount: { $sum: '$grandTotal' },
          paidAmount: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ isDeleted: false })
      .populate('customer', 'name organization phone email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivity = async (req, res, next) => {
  try {
    const activities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(8)
      .lean();

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};
