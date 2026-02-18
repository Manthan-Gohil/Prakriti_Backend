const express = require('express');
const n8nController = require('../controllers/n8n.controller');

const router = express.Router();

router.post('/prakriti-analysis', n8nController.prakritiAnalysis);
router.post('/food-recognition', n8nController.foodRecognition);
router.post('/meal-plan', n8nController.mealPlan);
router.post('/recommendations', n8nController.recommendations);
router.post('/wellness-progress', n8nController.wellnessProgress);
router.get('/logs', n8nController.getLogs);

module.exports = router;
