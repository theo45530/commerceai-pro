const { validationResult } = require('express-validator');

/**
 * Middleware pour gérer les erreurs de validation express-validator
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Données de requête invalides',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validateRequest
};