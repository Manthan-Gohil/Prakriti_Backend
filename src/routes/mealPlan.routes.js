const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const mealPlanController = require('../controllers/mealPlan.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireVerified);

router.post(
    '/',
    [
        body('name').trim().notEmpty().withMessage('Plan name is required.'),
        body('startDate').isISO8601().withMessage('Valid start date is required.'),
        body('endDate').isISO8601().withMessage('Valid end date is required.'),
    ],
    validate,
    mealPlanController.create
);

router.get('/', mealPlanController.list);
router.get('/:id', mealPlanController.getById);
router.put('/:id', mealPlanController.update);
router.delete('/:id', mealPlanController.delete);

router.post(
    '/:id/meals',
    [
        body('mealType').isIn([
            'EARLY_MORNING', 'BREAKFAST', 'MID_MORNING_SNACK', 'LUNCH',
            'AFTERNOON_SNACK', 'EVENING_SNACK', 'DINNER', 'BEDTIME',
        ]).withMessage('Valid meal type required.'),
        body('date').isISO8601().withMessage('Valid date required.'),
    ],
    validate,
    mealPlanController.addMeal
);

router.post(
    '/meals/:mealId/foods',
    [body('foodItemId').notEmpty().withMessage('Food item ID required.')],
    validate,
    mealPlanController.addFoodToMeal
);

router.patch('/meals/foods/:itemId/consumed', mealPlanController.markConsumed);
router.delete('/meals/foods/:itemId', mealPlanController.removeFoodFromMeal);

module.exports = router;
