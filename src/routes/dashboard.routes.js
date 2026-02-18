const express = require('express');
const { authenticate, requireVerified } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireVerified);

router.get('/overview', dashboardController.getOverview);
router.get('/nutrition-analytics', dashboardController.getNutritionAnalytics);
router.get('/health-analytics', dashboardController.getHealthAnalytics);
router.get('/sleep-analytics', dashboardController.getSleepAnalytics);
router.get('/activity-analytics', dashboardController.getActivityAnalytics);
router.get('/mood-analytics', dashboardController.getMoodAnalytics);
router.get('/dosha-analytics', dashboardController.getDoshaAnalytics);
router.get('/dinacharya-analytics', dashboardController.getDinacharyaAnalytics);
router.get('/wellness-progress', dashboardController.getWellnessProgress);
router.get('/recognition-stats', dashboardController.getRecognitionStats);
router.get('/stats-summary', dashboardController.getStatsSummary);

module.exports = router;
