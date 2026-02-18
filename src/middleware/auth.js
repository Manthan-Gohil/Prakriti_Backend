const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { errorResponse } = require('../utils/helpers');

/**
 * Authenticate JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Access denied. No token provided.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                isEmailVerified: true,
                isProfileComplete: true,
                isActive: true,
            },
        });

        if (!user) {
            return errorResponse(res, 'User not found.', 401);
        }

        if (!user.isActive) {
            return errorResponse(res, 'Account is deactivated.', 403);
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return errorResponse(res, 'Invalid token.', 401);
        }
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 'Token expired.', 401);
        }
        return errorResponse(res, 'Authentication failed.', 500);
    }
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, username: true, email: true, isEmailVerified: true, isActive: true },
            });
            if (user && user.isActive) {
                req.user = user;
            }
        }
    } catch (_) {
        // Silent fail for optional auth
    }
    next();
};

/**
 * Require email verified (no-op — all users are auto-verified on signup)
 */
const requireVerified = (_req, _res, next) => {
    next();
};

module.exports = { authenticate, optionalAuth, requireVerified };
