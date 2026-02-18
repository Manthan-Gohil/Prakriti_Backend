const prisma = require('../config/database');
const { getPagination, paginationMeta } = require('../utils/helpers');

class FoodRecognitionService {
    async upload(userId, file) {
        const imageUrl = `/uploads/food/${file.filename}`;

        return prisma.foodRecognitionLog.create({
            data: {
                userId,
                imageUrl,
                imagePath: file.path,
                imageSize: file.size,
                mimeType: file.mimetype,
                status: 'PENDING',
            },
        });
    }

    async updateResult(logId, data) {
        return prisma.foodRecognitionLog.update({
            where: { id: logId },
            data: {
                recognizedFood: data.recognizedFood,
                foodItemId: data.foodItemId,
                confidence: data.confidence ? parseFloat(data.confidence) : undefined,
                alternativeMatches: data.alternativeMatches,
                aiModel: data.aiModel,
                aiResponse: data.aiResponse,
                processingTimeMs: data.processingTimeMs ? parseInt(data.processingTimeMs, 10) : undefined,
                estimatedCalories: data.estimatedCalories ? parseFloat(data.estimatedCalories) : undefined,
                estimatedPortionG: data.estimatedPortionG ? parseFloat(data.estimatedPortionG) : undefined,
                nutritionBreakdown: data.nutritionBreakdown,
                estimatedDoshaEffect: data.estimatedDoshaEffect,
                ayurvedicSuggestion: data.ayurvedicSuggestion,
                status: 'COMPLETED',
            },
            include: { foodItem: true },
        });
    }

    async verify(logId, { isCorrect, correctedFood, correctedFoodItemId }) {
        return prisma.foodRecognitionLog.update({
            where: { id: logId },
            data: {
                userVerified: true,
                userCorrectedFood: isCorrect ? null : correctedFood,
                foodItemId: isCorrect ? undefined : correctedFoodItemId,
            },
        });
    }

    async list(userId, { page, limit, status }) {
        const pagination = getPagination(page, limit);
        const where = { userId };
        if (status) where.status = status;

        const [logs, total] = await Promise.all([
            prisma.foodRecognitionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
                include: { foodItem: true },
            }),
            prisma.foodRecognitionLog.count({ where }),
        ]);

        return { logs, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async getById(userId, logId) {
        const log = await prisma.foodRecognitionLog.findFirst({
            where: { id: logId, userId },
            include: { foodItem: true },
        });

        if (!log) {
            const err = new Error('Log not found.');
            err.status = 404;
            throw err;
        }

        return log;
    }

    async addToDiary(userId, logId, mealType) {
        const log = await prisma.foodRecognitionLog.findFirst({
            where: { id: logId, userId },
            include: { foodItem: true },
        });

        if (!log) {
            const err = new Error('Recognition log not found.');
            err.status = 404;
            throw err;
        }

        const foodName = log.userCorrectedFood || log.recognizedFood || 'Unknown Food';

        const diaryEntry = await prisma.userFoodDiary.create({
            data: {
                userId,
                date: new Date(),
                mealType,
                foodItemId: log.foodItemId,
                foodName,
                quantityG: log.estimatedPortionG,
                calories: log.estimatedCalories,
                proteinG: log.nutritionBreakdown?.proteinG,
                carbsG: log.nutritionBreakdown?.carbsG,
                fatG: log.nutritionBreakdown?.fatG,
                source: 'IMAGE_RECOGNITION',
                imageUrl: log.imageUrl,
                recognitionLogId: log.id,
                doshaEffect: log.estimatedDoshaEffect,
            },
        });

        await prisma.foodRecognitionLog.update({
            where: { id: log.id },
            data: { diaryEntryId: diaryEntry.id },
        });

        return diaryEntry;
    }
}

module.exports = new FoodRecognitionService();
