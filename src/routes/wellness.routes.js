const express = require('express');
const { authenticate, requireVerified, optionalAuth } = require('../middleware/auth');
const wellnessController = require('../controllers/wellness.controller');

const router = express.Router();

// Recommendations
router.get('/recommendations', authenticate, requireVerified, wellnessController.getRecommendations);
router.patch('/recommendations/:id', authenticate, wellnessController.updateRecommendation);

// Notifications
router.get('/notifications', authenticate, wellnessController.getNotifications);
router.patch('/notifications/:id/read', authenticate, wellnessController.markNotificationRead);
router.patch('/notifications/read-all', authenticate, wellnessController.markAllNotificationsRead);

// Preferences
router.get('/preferences', authenticate, wellnessController.getPreferences);
router.put('/preferences', authenticate, wellnessController.updatePreferences);

// Seasonal Routines
router.post('/seasonal-routine', authenticate, requireVerified, wellnessController.saveSeasonalRoutine);
router.get('/seasonal-routine', authenticate, requireVerified, wellnessController.getSeasonalRoutines);

// Articles (public with optional auth)
router.get('/articles', optionalAuth, wellnessController.getArticles);
router.get('/articles/:slug', optionalAuth, wellnessController.getArticleBySlug);
router.post('/articles/:articleId/bookmark', authenticate, wellnessController.bookmarkArticle);
router.delete('/articles/:articleId/bookmark', authenticate, wellnessController.removeBookmark);
router.get('/bookmarks', authenticate, wellnessController.getBookmarks);

module.exports = router;
