const authService = require('../services/auth.service');
const { successResponse } = require('../utils/helpers');

class AuthController {
    async signup(req, res, next) {
        try {
            const result = await authService.signup(req.body);
            return successResponse(res, result.message, { userId: result.userId }, null, 201);
        } catch (error) { next(error); }
    }

    async verifyOtp(req, res, next) {
        try {
            const result = await authService.verifyOtp(req.body);
            return successResponse(res, 'Email verified successfully.', result);
        } catch (error) { next(error); }
    }

    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);
            return successResponse(res, 'Login successful.', result);
        } catch (error) { next(error); }
    }

    async resendOtp(req, res, next) {
        try {
            const result = await authService.resendOtp(req.body.email);
            return successResponse(res, result.message);
        } catch (error) { next(error); }
    }

    async forgotPassword(req, res, next) {
        try {
            const result = await authService.forgotPassword(req.body.email);
            return successResponse(res, result.message);
        } catch (error) { next(error); }
    }

    async resetPassword(req, res, next) {
        try {
            await authService.resetPassword(req.body);
            return successResponse(res, 'Password reset successful.');
        } catch (error) { next(error); }
    }

    async getMe(req, res, next) {
        try {
            const user = await authService.getMe(req.user.id);
            return successResponse(res, 'User fetched.', { user });
        } catch (error) { next(error); }
    }

    async changePassword(req, res, next) {
        try {
            await authService.changePassword(req.user.id, req.body);
            return successResponse(res, 'Password changed successfully.');
        } catch (error) { next(error); }
    }
}

module.exports = new AuthController();
