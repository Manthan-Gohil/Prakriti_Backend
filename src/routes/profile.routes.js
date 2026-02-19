const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const { uploadProfile, setUploadType } = require('../middleware/upload');
const profileController = require('../controllers/profile.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireVerified);

router.post(
    '/',
    [
        body('firstName').trim().notEmpty().withMessage('First name is required.'),
        body('lastName').trim().notEmpty().withMessage('Last name is required.'),
        body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required.'),
        body('gender').isIn(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']).withMessage('Valid gender is required.'),
        body('heightCm').isFloat({ min: 50, max: 300 }).withMessage('Height must be between 50-300 cm.'),
        body('weightKg').isFloat({ min: 10, max: 500 }).withMessage('Weight must be between 10-500 kg.'),
    ],
    validate,
    profileController.createOrUpdate
);

router.get('/', profileController.getProfile);
router.patch('/', profileController.updateProfile);

router.post(
    '/image',
    setUploadType('profile'),
    uploadProfile.single('image'),
    profileController.uploadImage
);

router.get('/summary', profileController.getSummary);

router.post(
    '/prakriti-traits',
    profileController.savePrakritiTraits
);

router.post(
    '/dosha-traits',
    profileController.saveDoshaTraits
);

router.get(
    '/dosha-traits',
    profileController.getDoshaTraits
);

// ML Prediction endpoints
router.post('/predict/prakriti', profileController.predictPrakriti);
router.post('/predict/dosha', profileController.predictDosha);
router.get('/predictions', profileController.getPredictions);
router.get('/predictions/prakriti-history', profileController.getPrakritiHistory);
router.get('/predictions/dosha-history', profileController.getDoshaHistory);

module.exports = router;
