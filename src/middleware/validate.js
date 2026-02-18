const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => e.msg);
        return errorResponse(res, 'Validation failed.', 400, messages);
    }
    next();
};

module.exports = { validate };
