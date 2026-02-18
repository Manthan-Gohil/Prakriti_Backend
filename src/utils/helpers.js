const crypto = require('crypto');

/**
 * Generate a 6-digit OTP
 */
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Standard API response
 */
const apiResponse = (res, statusCode, success, message, data = null, meta = null) => {
    const response = { success, message };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    return res.status(statusCode).json(response);
};

/**
 * Success response
 */
const successResponse = (res, message, data = null, meta = null, statusCode = 200) => {
    return apiResponse(res, statusCode, true, message, data, meta);
};

/**
 * Error response
 */
const errorResponse = (res, message, statusCode = 400, errors = null) => {
    const response = { success: false, message };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
};

/**
 * Calculate BMI
 */
const calculateBmi = (weightKg, heightCm) => {
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
};

/**
 * Parse date range for queries
 */
const getDateRange = (range) => {
    const now = new Date();
    const start = new Date();

    switch (range) {
        case '7d':
            start.setDate(now.getDate() - 7);
            break;
        case '30d':
            start.setDate(now.getDate() - 30);
            break;
        case '90d':
            start.setDate(now.getDate() - 90);
            break;
        case '6m':
            start.setMonth(now.getMonth() - 6);
            break;
        case '1y':
            start.setFullYear(now.getFullYear() - 1);
            break;
        default:
            start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
};

/**
 * Paginate query results
 */
const getPagination = (page = 1, limit = 10) => {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    return { skip: (p - 1) * l, take: l, page: p, limit: l };
};

/**
 * Build pagination meta
 */
const paginationMeta = (total, page, limit) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
});

module.exports = {
    generateOtp,
    apiResponse,
    successResponse,
    errorResponse,
    calculateBmi,
    getDateRange,
    getPagination,
    paginationMeta,
};
