const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const trackingController = require('../controllers/tracking.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireVerified);

// Food Diary
router.post(
    '/diary',
    [
        body('foodName').trim().notEmpty().withMessage('Food name is required.'),
        body('mealType').isIn([
            'EARLY_MORNING', 'BREAKFAST', 'MID_MORNING_SNACK', 'LUNCH',
            'AFTERNOON_SNACK', 'EVENING_SNACK', 'DINNER', 'BEDTIME',
        ]).withMessage('Valid meal type required.'),
    ],
    validate,
    trackingController.addDiaryEntry
);
router.get('/diary', trackingController.getDiary);
router.delete('/diary/:id', trackingController.deleteDiaryEntry);
router.get('/nutrients/daily', trackingController.getDailyNutrients);

// Water
router.post(
    '/water',
    [body('amountMl').isInt({ min: 1 }).withMessage('Amount in ml is required.')],
    validate,
    trackingController.addWater
);
router.get('/water', trackingController.getWater);

// Sleep
router.post(
    '/sleep',
    [
        body('bedtime').notEmpty().withMessage('Bedtime is required.'),
        body('wakeTime').notEmpty().withMessage('Wake time is required.'),
        body('durationHours').isFloat({ min: 0 }).withMessage('Duration is required.'),
        body('quality').isInt({ min: 1, max: 10 }).withMessage('Quality must be 1-10.'),
    ],
    validate,
    trackingController.addSleep
);
router.get('/sleep', trackingController.getSleep);

// Exercise
router.post(
    '/exercise',
    [
        body('exerciseType').trim().notEmpty().withMessage('Exercise type is required.'),
        body('durationMinutes').isInt({ min: 1 }).withMessage('Duration is required.'),
    ],
    validate,
    trackingController.addExercise
);
router.get('/exercise', trackingController.getExercise);

// Yoga
router.post(
    '/yoga',
    [
        body('yogaType').trim().notEmpty().withMessage('Yoga type is required.'),
        body('durationMinutes').isInt({ min: 1 }).withMessage('Duration is required.'),
    ],
    validate,
    trackingController.addYoga
);
router.get('/yoga', trackingController.getYoga);

// Mood
router.post(
    '/mood',
    [body('mood').notEmpty().withMessage('Mood is required.')],
    validate,
    trackingController.addMood
);
router.get('/mood', trackingController.getMood);

// Stress
router.post(
    '/stress',
    [body('level').isInt({ min: 1, max: 10 }).withMessage('Stress level must be 1-10.')],
    validate,
    trackingController.addStress
);
router.get('/stress', trackingController.getStress);

// Health Vitals
router.post('/health', trackingController.addHealth);
router.get('/health', trackingController.getHealth);

// Dinacharya
router.post('/dinacharya', trackingController.addDinacharya);
router.get('/dinacharya', trackingController.getDinacharya);

module.exports = router;
