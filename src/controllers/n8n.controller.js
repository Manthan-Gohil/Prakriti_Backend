const n8nService = require('../services/n8n.service');
const { successResponse } = require('../utils/helpers');

class N8nController {
    async prakritiAnalysis(req, res, next) {
        try {
            const result = await n8nService.prakritiAnalysis(req.body);
            return successResponse(res, 'Prakriti analysis received.', result);
        } catch (error) {
            await n8nService.logFailure('PRAKRITI_ANALYSIS', req.body, error.message);
            next(error);
        }
    }

    async foodRecognition(req, res, next) {
        try {
            const result = await n8nService.foodRecognition(req.body);
            return successResponse(res, 'Food recognition result received.', result);
        } catch (error) {
            await n8nService.logFailure('FOOD_RECOGNITION', req.body, error.message);
            next(error);
        }
    }

    async mealPlan(req, res, next) {
        try {
            const result = await n8nService.mealPlan(req.body);
            return successResponse(res, 'Meal plan received.', result);
        } catch (error) { next(error); }
    }

    async recommendations(req, res, next) {
        try {
            const result = await n8nService.recommendations(req.body);
            return successResponse(res, `${result.count} recommendations created.`, result);
        } catch (error) { next(error); }
    }

    async wellnessProgress(req, res, next) {
        try {
            await n8nService.wellnessProgress(req.body);
            return successResponse(res, 'Wellness progress received.');
        } catch (error) { next(error); }
    }

    async getLogs(req, res, next) {
        try {
            const logs = await n8nService.getLogs(req.query);
            return successResponse(res, 'Webhook logs fetched.', { logs });
        } catch (error) { next(error); }
    }
}

module.exports = new N8nController();
