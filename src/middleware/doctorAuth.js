const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { errorResponse } = require('../utils/helpers');

/**
 * Authenticate doctor JWT token
 */
const authenticateDoctor = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Access denied. No token provided.', 401);
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'doctor') {
            return errorResponse(res, 'Access denied. Doctor token required.', 403);
        }

        const doctor = await prisma.doctor.findUnique({
            where: { id: decoded.doctorId },
            select: {
                id: true, name: true, email: true, specialty: true,
                imageUrl: true, isAvailable: true, isPortalActive: true,
            },
        });

        if (!doctor) {
            return errorResponse(res, 'Doctor not found.', 401);
        }

        req.doctor = doctor;
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

module.exports = { authenticateDoctor };
