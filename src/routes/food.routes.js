const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const foodController = require('../controllers/food.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', foodController.list);
router.get('/search', foodController.search);
router.get('/category/:category', foodController.getByCategory);
router.get('/dosha/:dosha', foodController.getByDosha);
router.get('/:id', foodController.getById);

router.post(
    '/',
    requireVerified,
    [body('name').trim().notEmpty().withMessage('Food name is required.')],
    validate,
    foodController.create
);

router.put('/:id', requireVerified, foodController.update);

module.exports = router;
