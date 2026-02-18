const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { sendOtpEmail } = require('../config/email');
const { generateOtp } = require('../utils/helpers');

class AuthService {
    async signup({ username, email, password }) {
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });

        if (existing) {
            const field = existing.email === email ? 'email' : 'username';
            const err = new Error(`An account with this ${field} already exists.`);
            err.status = 409;
            throw err;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { username, email, passwordHash },
            select: { id: true, username: true, email: true, createdAt: true },
        });

        const otp = generateOtp();
        await prisma.otpCode.create({
            data: {
                userId: user.id,
                code: otp,
                type: 'EMAIL_VERIFICATION',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        await sendOtpEmail(email, otp, 'verification');

        return user;
    }

    async verifyOtp({ email, otp }) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const err = new Error('User not found.');
            err.status = 404;
            throw err;
        }

        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                userId: user.id,
                code: otp,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            const err = new Error('Invalid or expired OTP.');
            err.status = 400;
            throw err;
        }

        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { isUsed: true },
        });

        if (otpRecord.type === 'EMAIL_VERIFICATION') {
            await prisma.user.update({
                where: { id: user.id },
                data: { isEmailVerified: true },
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                loginCount: { increment: 1 },
            },
        });

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isEmailVerified: true,
                isProfileComplete: user.isProfileComplete,
            },
        };
    }

    async login({ email, password }) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const err = new Error('Invalid email or password.');
            err.status = 401;
            throw err;
        }

        if (!user.isActive) {
            const err = new Error('Account is deactivated.');
            err.status = 403;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            const err = new Error('Invalid email or password.');
            err.status = 401;
            throw err;
        }

        const otp = generateOtp();
        await prisma.otpCode.create({
            data: {
                userId: user.id,
                code: otp,
                type: 'LOGIN_VERIFICATION',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        await sendOtpEmail(email, otp, 'login');

        return { requireOtp: true, email: user.email };
    }

    async resendOtp({ email, type = 'EMAIL_VERIFICATION' }) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const err = new Error('User not found.');
            err.status = 404;
            throw err;
        }

        const recentOtp = await prisma.otpCode.findFirst({
            where: {
                userId: user.id,
                createdAt: { gt: new Date(Date.now() - 60 * 1000) },
            },
        });

        if (recentOtp) {
            const err = new Error('Please wait before requesting another OTP.');
            err.status = 429;
            throw err;
        }

        const otp = generateOtp();
        await prisma.otpCode.create({
            data: {
                userId: user.id,
                code: otp,
                type,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        const otpTypeMap = {
            EMAIL_VERIFICATION: 'verification',
            LOGIN_VERIFICATION: 'login',
            PASSWORD_RESET: 'reset',
        };

        await sendOtpEmail(email, otp, otpTypeMap[type] || 'verification');
    }

    async forgotPassword({ email }) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return; // Don't reveal if user exists

        const otp = generateOtp();
        await prisma.otpCode.create({
            data: {
                userId: user.id,
                code: otp,
                type: 'PASSWORD_RESET',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        await sendOtpEmail(email, otp, 'reset');
    }

    async resetPassword({ email, otp, newPassword }) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const err = new Error('User not found.');
            err.status = 404;
            throw err;
        }

        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                userId: user.id,
                code: otp,
                type: 'PASSWORD_RESET',
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            const err = new Error('Invalid or expired OTP.');
            err.status = 400;
            throw err;
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.$transaction([
            prisma.otpCode.update({ where: { id: otpRecord.id }, data: { isUsed: true } }),
            prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        ]);
    }

    async getMe(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                isEmailVerified: true,
                isProfileComplete: true,
                lastLoginAt: true,
                loginCount: true,
                createdAt: true,
            },
        });
    }

    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            const err = new Error('Current password is incorrect.');
            err.status = 400;
            throw err;
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    }
}

module.exports = new AuthService();
