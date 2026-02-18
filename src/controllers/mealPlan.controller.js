const mealPlanService = require('../services/mealPlan.service');
const { successResponse } = require('../utils/helpers');

class MealPlanController {
    async create(req, res, next) {
        try {
            const plan = await mealPlanService.create(req.user.id, req.body);
            return successResponse(res, 'Meal plan created.', { plan }, null, 201);
        } catch (error) { next(error); }
    }

    async list(req, res, next) {
        try {
            const result = await mealPlanService.list(req.user.id, req.query);
            return successResponse(res, 'Meal plans fetched.', { plans: result.plans }, result.meta);
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try {
            const plan = await mealPlanService.getById(req.user.id, req.params.id);
            return successResponse(res, 'Meal plan fetched.', { plan });
        } catch (error) { next(error); }
    }

    async update(req, res, next) {
        try {
            const plan = await mealPlanService.update(req.user.id, req.params.id, req.body);
            return successResponse(res, 'Meal plan updated.', { plan });
        } catch (error) { next(error); }
    }

    async delete(req, res, next) {
        try {
            await mealPlanService.delete(req.user.id, req.params.id);
            return successResponse(res, 'Meal plan deleted.');
        } catch (error) { next(error); }
    }

    async addMeal(req, res, next) {
        try {
            const meal = await mealPlanService.addMeal(req.user.id, req.params.id, req.body);
            return successResponse(res, 'Meal added.', { meal }, null, 201);
        } catch (error) { next(error); }
    }

    async addFoodToMeal(req, res, next) {
        try {
            const item = await mealPlanService.addFoodToMeal(req.params.mealId, req.body);
            return successResponse(res, 'Food added to meal.', { item }, null, 201);
        } catch (error) { next(error); }
    }

    async markConsumed(req, res, next) {
        try {
            const item = await mealPlanService.markConsumed(req.params.itemId, req.body.consumed);
            return successResponse(res, 'Consumption updated.', { item });
        } catch (error) { next(error); }
    }

    async removeFoodFromMeal(req, res, next) {
        try {
            await mealPlanService.removeFoodFromMeal(req.params.itemId);
            return successResponse(res, 'Food removed from meal.');
        } catch (error) { next(error); }
    }
}

module.exports = new MealPlanController();
