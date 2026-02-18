const dashboardService = require('../services/dashboard.service');
const { successResponse } = require('../utils/helpers');

class DashboardController {
    async getOverview(req, res, next) {
        try {
            const data = await dashboardService.getOverview(req.user.id, req.query.range);
            return successResponse(res, 'Dashboard overview fetched.', data);
        } catch (error) { next(error); }
    }

    async getNutritionAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getNutritionAnalytics(req.user.id, req.query.range);
            return successResponse(res, 'Nutrition analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getHealthAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getHealthAnalytics(req.user.id, req.query.range);
            return successResponse(res, 'Health analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getSleepAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getSleepAnalytics(req.user.id, req.query.range);
            return successResponse(res, 'Sleep analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getActivityAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getActivityAnalytics(req.user.id, req.query.range);
            return successResponse(res, 'Activity analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getMoodAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getMoodAnalytics(req.user.id, req.query.range);
            return successResponse(res, 'Mood & stress analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getDoshaAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getDoshaAnalytics(req.user.id);
            return successResponse(res, 'Dosha analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getDinacharyaAnalytics(req, res, next) {
        try {
            const data = await dashboardService.getDinacharyaAnalytics(req.user.id, req.query.range);
            return successResponse(res, 'Dinacharya analytics fetched.', data);
        } catch (error) { next(error); }
    }

    async getWellnessProgress(req, res, next) {
        try {
            const progress = await dashboardService.getWellnessProgress(req.user.id);
            return successResponse(res, 'Wellness progress fetched.', { progress });
        } catch (error) { next(error); }
    }

    async getRecognitionStats(req, res, next) {
        try {
            const data = await dashboardService.getRecognitionStats(req.user.id, req.query.range);
            return successResponse(res, 'Food recognition stats fetched.', data);
        } catch (error) { next(error); }
    }

    async getStatsSummary(req, res, next) {
        try {
            const data = await dashboardService.getStatsSummary(req.user.id);
            return successResponse(res, 'Stats summary fetched.', data);
        } catch (error) { next(error); }
    }
}

module.exports = new DashboardController();
