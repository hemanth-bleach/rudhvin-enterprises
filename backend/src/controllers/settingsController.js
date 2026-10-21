import { Company } from '../models/Company.js';
import { logAudit } from '../services/auditService.js';

export const getCompanySettings = async (req, res, next) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({});
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanySettings = async (req, res, next) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({});
    }

    const previousValues = company.toObject ? company.toObject() : { ...company };

    const toPlain = (val) => (val && typeof val.toObject === 'function' ? val.toObject() : (val ? { ...val } : {}));

    // Deep merge sub-objects
    const updates = { ...req.body };
    if (updates.bankDetails) {
      company.bankDetails = {
        ...toPlain(company.bankDetails),
        ...updates.bankDetails
      };
      delete updates.bankDetails;
    }

    if (updates.financialYearConfig) {
      company.financialYearConfig = {
        ...toPlain(company.financialYearConfig),
        ...updates.financialYearConfig
      };
      delete updates.financialYearConfig;
    }

    if (updates.taxPreference) {
      company.taxPreference = {
        ...toPlain(company.taxPreference),
        ...updates.taxPreference
      };
      delete updates.taxPreference;
    }

    Object.assign(company, updates);
    await company.save();

    await logAudit({
      user: req.user,
      action: 'COMPANY_SETTINGS_UPDATED',
      entityType: 'Company',
      entityId: company._id,
      previousValues,
      newValues: company.toObject ? company.toObject() : { ...company },
      notes: 'Updated company profile, bank details, or invoice preferences'
    });

    res.status(200).json({
      success: true,
      message: 'Company settings updated successfully',
      data: company
    });
  } catch (error) {
    next(error);
  }
};
