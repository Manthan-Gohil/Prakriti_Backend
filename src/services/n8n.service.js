const prisma = require('../config/database');

class N8nService {
    async prakritiAnalysis({ userId, assessmentId, aiAnalysis, confidence, workflowId }) {
        await prisma.n8nWebhookLog.create({
            data: {
                userId,
                workflowId: workflowId || 'prakriti-analysis',
                workflowName: 'Prakriti AI Analysis',
                triggerType: 'PRAKRITI_ANALYSIS',
                requestPayload: { userId, assessmentId, aiAnalysis, confidence, workflowId },
                status: 'SUCCESS',
            },
        });

        if (assessmentId) {
            await prisma.prakritiAssessment.update({
                where: { id: assessmentId },
                data: { aiAnalysis, confidence: confidence ? parseFloat(confidence) : undefined },
            });
        }

        return { assessmentId };
    }

    async foodRecognition(payload) {
        const { logId, workflowId } = payload;

        await prisma.n8nWebhookLog.create({
            data: {
                workflowId: workflowId || 'food-recognition',
                workflowName: 'Food Recognition AI',
                triggerType: 'FOOD_RECOGNITION',
                requestPayload: payload,
                status: 'SUCCESS',
            },
        });

        if (logId) {
            await prisma.foodRecognitionLog.update({
                where: { id: logId },
                data: {
                    recognizedFood: payload.recognizedFood,
                    foodItemId: payload.foodItemId,
                    confidence: payload.confidence ? parseFloat(payload.confidence) : undefined,
                    alternativeMatches: payload.alternativeMatches,
                    aiModel: payload.aiModel,
                    aiResponse: payload,
                    nutritionBreakdown: payload.nutritionBreakdown,
                    estimatedCalories: payload.estimatedCalories ? parseFloat(payload.estimatedCalories) : undefined,
                    estimatedPortionG: payload.estimatedPortionG ? parseFloat(payload.estimatedPortionG) : undefined,
                    estimatedDoshaEffect: payload.estimatedDoshaEffect,
                    ayurvedicSuggestion: payload.ayurvedicSuggestion,
                    processingTimeMs: payload.processingTimeMs ? parseInt(payload.processingTimeMs, 10) : undefined,
                    status: 'COMPLETED',
                },
            });
        }

        return { logId };
    }

    async mealPlan({ userId, mealPlan, workflowId }) {
        await prisma.n8nWebhookLog.create({
            data: {
                userId,
                workflowId: workflowId || 'meal-plan-generation',
                workflowName: 'AI Meal Plan Generator',
                triggerType: 'MEAL_PLAN',
                requestPayload: { userId, mealPlan, workflowId },
                status: 'SUCCESS',
            },
        });

        if (userId && mealPlan) {
            const plan = await prisma.mealPlan.create({
                data: {
                    userId,
                    name: mealPlan.name || 'AI-Generated Meal Plan',
                    description: mealPlan.description,
                    planType: mealPlan.planType || 'WEEKLY',
                    startDate: new Date(mealPlan.startDate),
                    endDate: new Date(mealPlan.endDate),
                    targetCalories: mealPlan.targetCalories,
                    targetDosha: mealPlan.targetDosha,
                    season: mealPlan.season,
                    isAiGenerated: true,
                    aiPrompt: mealPlan.prompt,
                    aiResponse: mealPlan,
                    status: 'ACTIVE',
                },
            });
            return { planId: plan.id };
        }

        return {};
    }

    async recommendations({ userId, recommendations, workflowId }) {
        await prisma.n8nWebhookLog.create({
            data: {
                userId,
                workflowId: workflowId || 'recommendations',
                workflowName: 'AI Recommendations',
                triggerType: 'RECOMMENDATIONS',
                requestPayload: { userId, recommendations, workflowId },
                status: 'SUCCESS',
            },
        });

        if (userId && Array.isArray(recommendations)) {
            const created = await prisma.recommendation.createMany({
                data: recommendations.map((r) => ({
                    userId,
                    type: r.type || 'GENERAL_WELLNESS',
                    category: r.category || 'general',
                    title: r.title,
                    description: r.description,
                    details: r.details,
                    priority: r.priority || 'MEDIUM',
                    doshaTarget: r.doshaTarget,
                    source: 'N8N',
                    sourceRef: workflowId,
                })),
            });
            return { count: created.count };
        }

        return { count: 0 };
    }

    async wellnessProgress({ userId, progress, workflowId }) {
        await prisma.n8nWebhookLog.create({
            data: {
                userId,
                workflowId: workflowId || 'wellness-progress',
                workflowName: 'Wellness Progress Calculator',
                triggerType: 'WELLNESS_PROGRESS',
                requestPayload: { userId, progress, workflowId },
                status: 'SUCCESS',
            },
        });

        if (userId && progress) {
            await prisma.wellnessProgress.create({
                data: {
                    userId,
                    ...progress,
                    periodStart: new Date(progress.periodStart),
                    periodEnd: new Date(progress.periodEnd),
                },
            });
        }
    }

    async getLogs({ userId, workflowId, status, limit = 50 }) {
        const where = {};
        if (userId) where.userId = userId;
        if (workflowId) where.workflowId = workflowId;
        if (status) where.status = status;

        return prisma.n8nWebhookLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit, 10),
        });
    }

    async logFailure(triggerType, payload, errorMessage) {
        await prisma.n8nWebhookLog.create({
            data: {
                workflowId: payload.workflowId || triggerType.toLowerCase(),
                triggerType,
                requestPayload: payload,
                status: 'FAILED',
                errorMessage,
            },
        }).catch(() => { });
    }
}

module.exports = new N8nService();
