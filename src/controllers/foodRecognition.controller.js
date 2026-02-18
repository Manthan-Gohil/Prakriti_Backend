const foodRecognitionService = require('../services/foodRecognition.service');
const { successResponse } = require('../utils/helpers');

class FoodRecognitionController {
    async upload(req, res, next) {
        try {
            const log = await foodRecognitionService.upload(req.user.id, req.file);
            return successResponse(res, 'Image uploaded for recognition.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async updateResult(req, res, next) {
        try {
            const log = await foodRecognitionService.updateResult(req.params.id, req.body);
            return successResponse(res, 'Recognition result updated.', { log });
        } catch (error) { next(error); }
    }

    async verify(req, res, next) {
        try {
            const log = await foodRecognitionService.verify(req.params.id, req.body);
            return successResponse(res, 'Verification recorded.', { log });
        } catch (error) { next(error); }
    }

    async list(req, res, next) {
        try {
            const result = await foodRecognitionService.list(req.user.id, req.query);
            return successResponse(res, 'Recognition logs fetched.', { logs: result.logs }, result.meta);
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try {
            const log = await foodRecognitionService.getById(req.user.id, req.params.id);
            return successResponse(res, 'Recognition log fetched.', { log });
        } catch (error) { next(error); }
    }

    async addToDiary(req, res, next) {
        try {
            const entry = await foodRecognitionService.addToDiary(req.user.id, req.params.id, req.body.mealType);
            return successResponse(res, 'Added to food diary.', { entry }, null, 201);
        } catch (error) { next(error); }
    }
}

module.exports = new FoodRecognitionController();
