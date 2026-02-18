const wellnessService = require('../services/wellness.service');
const { successResponse } = require('../utils/helpers');

class WellnessController {
    // ── RECOMMENDATIONS ─────────────────────────────
    async getRecommendations(req, res, next) {
        try {
            const result = await wellnessService.getRecommendations(req.user.id, req.query);
            return successResponse(res, 'Recommendations fetched.', { recommendations: result.recommendations }, result.meta);
        } catch (error) { next(error); }
    }

    async updateRecommendation(req, res, next) {
        try {
            await wellnessService.updateRecommendation(req.user.id, req.params.id, req.body);
            return successResponse(res, 'Recommendation updated.');
        } catch (error) { next(error); }
    }

    // ── NOTIFICATIONS ───────────────────────────────
    async getNotifications(req, res, next) {
        try {
            const result = await wellnessService.getNotifications(req.user.id, req.query);
            return successResponse(res, 'Notifications fetched.', { notifications: result.notifications }, result.meta);
        } catch (error) { next(error); }
    }

    async markNotificationRead(req, res, next) {
        try {
            await wellnessService.markNotificationRead(req.user.id, req.params.id);
            return successResponse(res, 'Notification marked as read.');
        } catch (error) { next(error); }
    }

    async markAllNotificationsRead(req, res, next) {
        try {
            await wellnessService.markAllNotificationsRead(req.user.id);
            return successResponse(res, 'All notifications marked as read.');
        } catch (error) { next(error); }
    }

    // ── PREFERENCES ─────────────────────────────────
    async getPreferences(req, res, next) {
        try {
            const preferences = await wellnessService.getPreferences(req.user.id);
            return successResponse(res, 'Preferences fetched.', { preferences });
        } catch (error) { next(error); }
    }

    async updatePreferences(req, res, next) {
        try {
            const preferences = await wellnessService.updatePreferences(req.user.id, req.body);
            return successResponse(res, 'Preferences updated.', { preferences });
        } catch (error) { next(error); }
    }

    // ── SEASONAL ROUTINES ───────────────────────────
    async saveSeasonalRoutine(req, res, next) {
        try {
            const routine = await wellnessService.saveSeasonalRoutine(req.user.id, req.body);
            return successResponse(res, 'Seasonal routine saved.', { routine }, null, 201);
        } catch (error) { next(error); }
    }

    async getSeasonalRoutines(req, res, next) {
        try {
            const routines = await wellnessService.getSeasonalRoutines(req.user.id, req.query.year);
            return successResponse(res, 'Seasonal routines fetched.', { routines });
        } catch (error) { next(error); }
    }

    // ── ARTICLES ────────────────────────────────────
    async getArticles(req, res, next) {
        try {
            const result = await wellnessService.getArticles(req.query);
            return successResponse(res, 'Articles fetched.', { articles: result.articles }, result.meta);
        } catch (error) { next(error); }
    }

    async getArticleBySlug(req, res, next) {
        try {
            const result = await wellnessService.getArticleBySlug(req.params.slug, req.user?.id);
            return successResponse(res, 'Article fetched.', result);
        } catch (error) { next(error); }
    }

    async bookmarkArticle(req, res, next) {
        try {
            const bookmark = await wellnessService.bookmarkArticle(req.user.id, req.params.articleId);
            return successResponse(res, bookmark ? 'Article bookmarked.' : 'Article already bookmarked.', { bookmark }, null, 201);
        } catch (error) { next(error); }
    }

    async removeBookmark(req, res, next) {
        try {
            await wellnessService.removeBookmark(req.user.id, req.params.articleId);
            return successResponse(res, 'Bookmark removed.');
        } catch (error) { next(error); }
    }

    async getBookmarks(req, res, next) {
        try {
            const bookmarks = await wellnessService.getBookmarks(req.user.id);
            return successResponse(res, 'Bookmarks fetched.', { bookmarks });
        } catch (error) { next(error); }
    }
}

module.exports = new WellnessController();
