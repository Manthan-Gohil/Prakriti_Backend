const foodService = require('../services/food.service');
const { successResponse } = require('../utils/helpers');

class FoodController {
    async list(req, res, next) {
        try {
            const result = await foodService.list(req.query);
            return successResponse(res, 'Food items fetched.', { foods: result.foods }, result.meta);
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try {
            const food = await foodService.getById(req.params.id);
            return successResponse(res, 'Food item fetched.', { food });
        } catch (error) { next(error); }
    }

    async getByCategory(req, res, next) {
        try {
            const result = await foodService.getByCategory(req.params.category, req.query);
            return successResponse(res, 'Food items fetched.', { foods: result.foods }, result.meta);
        } catch (error) { next(error); }
    }

    async getByDosha(req, res, next) {
        try {
            const result = await foodService.getByDosha(req.params.dosha, req.query);
            return successResponse(res, `${req.query.effect || 'all'} foods for ${req.params.dosha} fetched.`, { foods: result.foods }, result.meta);
        } catch (error) { next(error); }
    }

    async create(req, res, next) {
        try {
            const food = await foodService.create(req.body);
            return successResponse(res, 'Food item created.', { food }, null, 201);
        } catch (error) { next(error); }
    }

    async update(req, res, next) {
        try {
            const food = await foodService.update(req.params.id, req.body);
            return successResponse(res, 'Food item updated.', { food });
        } catch (error) { next(error); }
    }

    async search(req, res, next) {
        try {
            const result = await foodService.search(req.query);
            return successResponse(res, 'Search results.', { foods: result.foods }, result.meta);
        } catch (error) { next(error); }
    }
}

module.exports = new FoodController();
