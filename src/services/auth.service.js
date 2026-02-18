const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

class AuthService {
    generateToken(userId) {
        return jwt.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });
    }

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
            data: { username, email, passwordHash, isEmailVerified: true },
            select: { id: true, username: true, email: true, isEmailVerified: true, isProfileComplete: true, createdAt: true },
        });

        const token = this.generateToken(user.id);

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), loginCount: 1 },
        });

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
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

        const token = this.generateToken(user.id);

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
                isEmailVerified: user.isEmailVerified,
                isProfileComplete: user.isProfileComplete,
            },
        };
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
