const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post(
    '/signup',
    [
        body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters.'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    ],
    validate,
    authController.signup
);

router.post(
    '/verify-otp',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
        body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
    ],
    validate,
    authController.verifyOtp
);

router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
        body('password').notEmpty().withMessage('Password is required.'),
    ],
    validate,
    authController.login
);

router.post(
    '/resend-otp',
    [body('email').isEmail().normalizeEmail().withMessage('Valid email is required.')],
    validate,
    authController.resendOtp
);

router.post(
    '/forgot-password',
    [body('email').isEmail().normalizeEmail().withMessage('Valid email is required.')],
    validate,
    authController.forgotPassword
);

router.post(
    '/reset-password',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
        body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
        body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    ],
    validate,
    authController.resetPassword
);

router.get('/me', authenticate, authController.getMe);

router.post(
    '/change-password',
    authenticate,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required.'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
    ],
    validate,
    authController.changePassword
);

module.exports = router;
