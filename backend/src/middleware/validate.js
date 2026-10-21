export const validate = (schema) => async (req, res, next) => {
  try {
    const validatedData = await schema.parseAsync(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        detail: errorMessages
      });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};
