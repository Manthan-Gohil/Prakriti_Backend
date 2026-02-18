const { errorResponse } = require('../utils/helpers');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
    console.error('❌ Error:', err);

    // Prisma errors
    if (err.code === 'P2002') {
        const field = err.meta?.target?.[0] || 'field';
        return errorResponse(res, `A record with this ${field} already exists.`, 409);
    }

    if (err.code === 'P2025') {
        return errorResponse(res, 'Record not found.', 404);
    }

    if (err.code === 'P2003') {
        return errorResponse(res, 'Related record not found.', 400);
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return errorResponse(res, err.message, 400);
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(res, 'File too large. Maximum size is 10MB.', 400);
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return errorResponse(res, 'Unexpected file field.', 400);
    }

    // Default
    return errorResponse(
        res,
        process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.',
        err.status || 500
    );
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    return errorResponse(res, `Route ${req.method} ${req.originalUrl} not found.`, 404);
};

module.exports = { errorHandler, notFoundHandler };
