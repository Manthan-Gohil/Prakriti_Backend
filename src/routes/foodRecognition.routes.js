const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const { uploadFood, setUploadType } = require('../middleware/upload');
const foodRecognitionController = require('../controllers/foodRecognition.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireVerified);

router.post('/upload', setUploadType('food'), uploadFood.single('image'), foodRecognitionController.upload);

router.patch(
    '/:id/result',
    [body('recognizedFood').trim().notEmpty().withMessage('Recognized food name is required.')],
    validate,
    foodRecognitionController.updateResult
);

router.patch(
    '/:id/verify',
    [body('isCorrect').isBoolean().withMessage('isCorrect must be a boolean.')],
    validate,
    foodRecognitionController.verify
);

router.get('/', foodRecognitionController.list);
router.get('/:id', foodRecognitionController.getById);

router.post(
    '/:id/add-to-diary',
    [
        body('mealType').isIn([
            'EARLY_MORNING', 'BREAKFAST', 'MID_MORNING_SNACK', 'LUNCH',
            'AFTERNOON_SNACK', 'EVENING_SNACK', 'DINNER', 'BEDTIME',
        ]).withMessage('Valid meal type required.'),
    ],
    validate,
    foodRecognitionController.addToDiary
);

module.exports = router;
