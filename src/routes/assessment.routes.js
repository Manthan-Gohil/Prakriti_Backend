const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const { uploadAssessment, setUploadType } = require('../middleware/upload');
const assessmentController = require('../controllers/assessment.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireVerified);

router.get('/questions', assessmentController.getQuestions);

router.post(
    '/start',
    [
        body('assessmentType').optional().isIn(['INITIAL', 'PERIODIC', 'SEASONAL', 'FOLLOW_UP']),
        body('assessmentMethod').optional().isIn(['QUESTIONNAIRE', 'IMAGE_BASED', 'COMBINED', 'AI_ASSISTED']),
    ],
    validate,
    assessmentController.startAssessment
);

router.post(
    '/:id/response',
    [
        body('questionId').notEmpty().withMessage('Question ID is required.'),
        body('optionId').notEmpty().withMessage('Option ID is required.'),
    ],
    validate,
    assessmentController.submitResponse
);

router.post(
    '/:id/responses',
    [body('responses').isArray({ min: 1 }).withMessage('At least one response is required.')],
    validate,
    assessmentController.submitBulkResponses
);

router.post(
    '/:id/images',
    setUploadType('assessment'),
    uploadAssessment.array('images', 5),
    assessmentController.uploadImages
);

router.post('/:id/complete', assessmentController.completeAssessment);
router.get('/:id', assessmentController.getAssessment);
router.get('/', assessmentController.listAssessments);
router.get('/dosha/profile', assessmentController.getDoshaProfile);

module.exports = router;
