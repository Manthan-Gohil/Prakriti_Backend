const prisma = require('../config/database');
const { getPagination, paginationMeta } = require('../utils/helpers');

class MealPlanService {
    async create(userId, data) {
        data.userId = userId;
        data.startDate = new Date(data.startDate);
        data.endDate = new Date(data.endDate);
        if (data.targetCalories) data.targetCalories = parseInt(data.targetCalories, 10);
        if (data.targetProteinG) data.targetProteinG = parseFloat(data.targetProteinG);
        if (data.targetCarbsG) data.targetCarbsG = parseFloat(data.targetCarbsG);
        if (data.targetFatG) data.targetFatG = parseFloat(data.targetFatG);

        return prisma.mealPlan.create({ data });
    }

    async list(userId, { page, limit, status }) {
        const pagination = getPagination(page, limit);
        const where = { userId };
        if (status) where.status = status;

        const [plans, total] = await Promise.all([
            prisma.mealPlan.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
                include: {
                    meals: {
                        include: { foodItems: { include: { foodItem: true } } },
                        orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
                    },
                },
            }),
            prisma.mealPlan.count({ where }),
        ]);

        return { plans, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async getById(userId, id) {
        const plan = await prisma.mealPlan.findFirst({
            where: { id, userId },
            include: {
                meals: {
                    include: { foodItems: { include: { foodItem: true } } },
                    orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
                },
            },
        });

        if (!plan) {
            const err = new Error('Meal plan not found.');
            err.status = 404;
            throw err;
        }

        return plan;
    }

    async update(userId, id, data) {
        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);
        if (data.targetCalories) data.targetCalories = parseInt(data.targetCalories, 10);

        const result = await prisma.mealPlan.updateMany({
            where: { id, userId },
            data,
        });

        if (result.count === 0) {
            const err = new Error('Meal plan not found.');
            err.status = 404;
            throw err;
        }

        return prisma.mealPlan.findUnique({ where: { id } });
    }

    async delete(userId, id) {
        const result = await prisma.mealPlan.deleteMany({ where: { id, userId } });
        if (result.count === 0) {
            const err = new Error('Meal plan not found.');
            err.status = 404;
            throw err;
        }
    }

    async addMeal(userId, planId, data) {
        const plan = await prisma.mealPlan.findFirst({ where: { id: planId, userId } });
        if (!plan) {
            const err = new Error('Meal plan not found.');
            err.status = 404;
            throw err;
        }

        data.mealPlanId = planId;
        data.date = new Date(data.date);

        return prisma.meal.create({
            data,
            include: { foodItems: { include: { foodItem: true } } },
        });
    }

    async addFoodToMeal(mealId, { foodItemId, quantityG, servings = 1, notes }) {
        const foodItem = await prisma.foodItem.findUnique({ where: { id: foodItemId } });
        if (!foodItem) {
            const err = new Error('Food item not found.');
            err.status = 404;
            throw err;
        }

        const ratio = quantityG / 100;
        const mealFoodItem = await prisma.mealFoodItem.create({
            data: {
                mealId,
                foodItemId,
                quantityG: parseFloat(quantityG),
                servings: parseFloat(servings),
                notes,
                calories: foodItem.caloriesKcal ? parseFloat((foodItem.caloriesKcal * ratio).toFixed(2)) : null,
                proteinG: foodItem.proteinG ? parseFloat((foodItem.proteinG * ratio).toFixed(2)) : null,
                carbsG: foodItem.carbsG ? parseFloat((foodItem.carbsG * ratio).toFixed(2)) : null,
                fatG: foodItem.fatG ? parseFloat((foodItem.fatG * ratio).toFixed(2)) : null,
            },
            include: { foodItem: true },
        });

        // Update meal totals
        const allFoodItems = await prisma.mealFoodItem.findMany({ where: { mealId } });
        const totals = allFoodItems.reduce(
            (acc, item) => ({
                totalCalories: acc.totalCalories + (item.calories || 0),
                totalProteinG: acc.totalProteinG + (item.proteinG || 0),
                totalCarbsG: acc.totalCarbsG + (item.carbsG || 0),
                totalFatG: acc.totalFatG + (item.fatG || 0),
            }),
            { totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0 }
        );

        await prisma.meal.update({ where: { id: mealId }, data: totals });

        return mealFoodItem;
    }

    async markConsumed(mealId) {
        return prisma.meal.update({
            where: { id: mealId },
            data: {
                isConsumed: true,
                consumedAt: new Date(),
                actualTime: new Date().toTimeString().slice(0, 5),
            },
        });
    }

    async removeFoodFromMeal(mealFoodItemId) {
        await prisma.mealFoodItem.delete({ where: { id: mealFoodItemId } });
    }
}

module.exports = new MealPlanService();
