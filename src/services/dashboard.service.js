const prisma = require('../config/database');
const { getDateRange } = require('../utils/helpers');

class DashboardService {
    async getOverview(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const [
            user,
            healthProfile,
            doshaProfile,
            latestAssessment,
            todayNutrients,
            recentHealthLogs,
            recentDiary,
            activePlan,
            unreadNotifications,
            unreadRecommendations,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, email: true, avatarUrl: true, isProfileComplete: true, loginCount: true, createdAt: true },
            }),
            prisma.healthProfile.findUnique({ where: { userId } }),
            prisma.doshaProfile.findUnique({ where: { userId } }),
            prisma.prakritiAssessment.findFirst({
                where: { userId, status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
                select: { id: true, prakritiType: true, vataScore: true, pittaScore: true, kaphaScore: true, completedAt: true, confidence: true },
            }),
            prisma.dailyNutrientLog.findFirst({
                where: { userId, date: new Date(new Date().toISOString().split('T')[0]) },
            }),
            prisma.healthTrackingLog.findMany({
                where: { userId, date: { gte: start, lte: end } },
                orderBy: { date: 'desc' },
                take: 7,
            }),
            prisma.userFoodDiary.findMany({
                where: { userId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                orderBy: { date: 'desc' },
                include: { foodItem: true },
            }),
            prisma.mealPlan.findFirst({
                where: { userId, status: 'ACTIVE' },
                include: { meals: { take: 5, orderBy: { date: 'asc' } } },
            }),
            prisma.notification.count({ where: { userId, isRead: false } }),
            prisma.recommendation.count({ where: { userId, isRead: false } }),
        ]);

        return {
            user,
            healthProfile: healthProfile
                ? {
                    name: `${healthProfile.firstName} ${healthProfile.lastName}`,
                    age: healthProfile.dateOfBirth ? Math.floor((Date.now() - new Date(healthProfile.dateOfBirth).getTime()) / 31557600000) : null,
                    gender: healthProfile.gender,
                    heightCm: healthProfile.heightCm,
                    weightKg: healthProfile.weightKg,
                    bmi: healthProfile.bmi,
                    bloodGroup: healthProfile.bloodGroup,
                    activityLevel: healthProfile.activityLevel,
                    dietType: healthProfile.dietType,
                    profileImageUrl: healthProfile.profileImageUrl,
                }
                : null,
            doshaProfile: doshaProfile
                ? {
                    prakritiType: doshaProfile.prakritiType,
                    prakritiVata: doshaProfile.prakritiVata,
                    prakritiPitta: doshaProfile.prakritiPitta,
                    prakritiKapha: doshaProfile.prakritiKapha,
                    agniType: doshaProfile.agniType,
                    isImbalanced: doshaProfile.isImbalanced,
                }
                : null,
            latestAssessment,
            todayNutrients: todayNutrients || { totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0 },
            todayMeals: recentDiary,
            activeMealPlan: activePlan,
            recentHealthLogs,
            unreadNotifications,
            unreadRecommendations,
        };
    }

    async getNutritionAnalytics(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const nutrientLogs = await prisma.dailyNutrientLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
        });

        const caloriesTrend = nutrientLogs.map((l) => ({ date: l.date, calories: l.totalCalories }));
        const macrosTrend = nutrientLogs.map((l) => ({ date: l.date, protein: l.totalProteinG, carbs: l.totalCarbsG, fat: l.totalFatG }));

        const count = nutrientLogs.length || 1;
        const avgCalories = nutrientLogs.reduce((s, l) => s + l.totalCalories, 0) / count;
        const avgProtein = nutrientLogs.reduce((s, l) => s + l.totalProteinG, 0) / count;
        const avgCarbs = nutrientLogs.reduce((s, l) => s + l.totalCarbsG, 0) / count;
        const avgFat = nutrientLogs.reduce((s, l) => s + l.totalFatG, 0) / count;

        const rasaTotals = nutrientLogs.reduce(
            (acc, l) => ({
                sweet: acc.sweet + l.sweetCount,
                sour: acc.sour + l.sourCount,
                salty: acc.salty + l.saltyCount,
                pungent: acc.pungent + l.pungentCount,
                bitter: acc.bitter + l.bitterCount,
                astringent: acc.astringent + l.astringentCount,
            }),
            { sweet: 0, sour: 0, salty: 0, pungent: 0, bitter: 0, astringent: 0 }
        );

        const foodQuality = nutrientLogs.reduce(
            (acc, l) => ({
                sattvic: acc.sattvic + l.sattvicMealCount,
                rajasic: acc.rajasic + l.rajasicMealCount,
                tamasic: acc.tamasic + l.tamasicMealCount,
            }),
            { sattvic: 0, rajasic: 0, tamasic: 0 }
        );

        const adherenceTrend = nutrientLogs.map((l) => ({ date: l.date, planned: l.mealsPlanned, consumed: l.mealsConsumed, score: l.adherenceScore }));

        return {
            trends: { caloriesTrend, macrosTrend, adherenceTrend },
            averages: {
                calories: parseFloat(avgCalories.toFixed(1)),
                protein: parseFloat(avgProtein.toFixed(1)),
                carbs: parseFloat(avgCarbs.toFixed(1)),
                fat: parseFloat(avgFat.toFixed(1)),
            },
            rasaDistribution: rasaTotals,
            foodQualityDistribution: foodQuality,
            totalDaysTracked: nutrientLogs.length,
        };
    }

    async getHealthAnalytics(userId, range = '90d') {
        const { start, end } = getDateRange(range);

        const healthLogs = await prisma.healthTrackingLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
        });

        const weightTrend = healthLogs.filter((l) => l.weightKg).map((l) => ({ date: l.date, weight: l.weightKg, bmi: l.bmi }));
        const bpTrend = healthLogs.filter((l) => l.bloodPressureSystolic).map((l) => ({ date: l.date, systolic: l.bloodPressureSystolic, diastolic: l.bloodPressureDiastolic }));
        const wellbeingTrend = healthLogs.filter((l) => l.energyLevel || l.overallWellbeing).map((l) => ({ date: l.date, energy: l.energyLevel, wellbeing: l.overallWellbeing, mentalClarity: l.mentalClarity, digestiveComfort: l.digestiveComfort }));
        const skinTrend = healthLogs.filter((l) => l.skinClarity).map((l) => ({ date: l.date, skinClarity: l.skinClarity, eyeBrightness: l.eyeBrightness }));
        const digestiveTrend = healthLogs.filter((l) => l.bloating || l.acidity || l.gasLevel).map((l) => ({ date: l.date, bloating: l.bloating, acidity: l.acidity, gasLevel: l.gasLevel }));

        const symptomFreq = {};
        healthLogs.forEach((l) => {
            l.symptoms.forEach((s) => { symptomFreq[s] = (symptomFreq[s] || 0) + 1; });
        });

        return {
            trends: { weightTrend, bpTrend, wellbeingTrend, skinTrend, digestiveTrend },
            symptomFrequency: symptomFreq,
            totalDaysTracked: healthLogs.length,
        };
    }

    async getSleepAnalytics(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const sleepLogs = await prisma.sleepLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
        });

        const durationTrend = sleepLogs.map((l) => ({ date: l.date, duration: l.durationHours, quality: l.quality }));
        const avgDuration = sleepLogs.length > 0 ? sleepLogs.reduce((s, l) => s + l.durationHours, 0) / sleepLogs.length : 0;
        const avgQuality = sleepLogs.length > 0 ? sleepLogs.reduce((s, l) => s + l.quality, 0) / sleepLogs.length : 0;

        const bedtimes = {};
        sleepLogs.forEach((l) => {
            const hour = l.bedtime.split(':')[0];
            bedtimes[`${hour}:00`] = (bedtimes[`${hour}:00`] || 0) + 1;
        });

        return {
            trends: { durationTrend },
            averages: { duration: parseFloat(avgDuration.toFixed(1)), quality: parseFloat(avgQuality.toFixed(1)) },
            bedtimeDistribution: bedtimes,
            totalNightsTracked: sleepLogs.length,
        };
    }

    async getActivityAnalytics(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const [exerciseLogs, yogaSessions] = await Promise.all([
            prisma.exerciseLog.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }),
            prisma.yogaSession.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }),
        ]);

        const exerciseTypes = {};
        exerciseLogs.forEach((l) => { exerciseTypes[l.exerciseType] = (exerciseTypes[l.exerciseType] || 0) + l.durationMinutes; });
        const yogaTypes = {};
        yogaSessions.forEach((s) => { yogaTypes[s.yogaType] = (yogaTypes[s.yogaType] || 0) + s.durationMinutes; });

        const activityByDay = {};
        exerciseLogs.forEach((l) => { const key = l.date.toISOString().split('T')[0]; activityByDay[key] = (activityByDay[key] || 0) + l.durationMinutes; });
        yogaSessions.forEach((s) => { const key = s.date.toISOString().split('T')[0]; activityByDay[key] = (activityByDay[key] || 0) + s.durationMinutes; });

        const activityTrend = Object.entries(activityByDay).map(([date, minutes]) => ({ date, minutes })).sort((a, b) => a.date.localeCompare(b.date));

        return {
            trends: { activityTrend },
            exerciseTypeDistribution: exerciseTypes,
            yogaTypeDistribution: yogaTypes,
            totalExerciseMinutes: exerciseLogs.reduce((s, l) => s + l.durationMinutes, 0),
            totalYogaMinutes: yogaSessions.reduce((s, l) => s + l.durationMinutes, 0),
            totalExerciseSessions: exerciseLogs.length,
            totalYogaSessions: yogaSessions.length,
        };
    }

    async getMoodAnalytics(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const [moodLogs, stressLogs] = await Promise.all([
            prisma.moodLog.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }),
            prisma.stressLog.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }),
        ]);

        const moodFreq = {};
        moodLogs.forEach((l) => { moodFreq[l.mood] = (moodFreq[l.mood] || 0) + 1; });
        const emotionFreq = {};
        moodLogs.forEach((l) => { l.emotions.forEach((e) => { emotionFreq[e] = (emotionFreq[e] || 0) + 1; }); });
        const stressTrend = stressLogs.map((l) => ({ date: l.date, level: l.level, source: l.source }));
        const stressSources = {};
        stressLogs.forEach((l) => { if (l.source) stressSources[l.source] = (stressSources[l.source] || 0) + 1; });
        const avgStress = stressLogs.length > 0 ? stressLogs.reduce((s, l) => s + l.level, 0) / stressLogs.length : 0;

        return {
            trends: { stressTrend },
            moodDistribution: moodFreq,
            emotionFrequency: emotionFreq,
            stressSourceDistribution: stressSources,
            averageStressLevel: parseFloat(avgStress.toFixed(1)),
            totalMoodEntries: moodLogs.length,
            totalStressEntries: stressLogs.length,
        };
    }

    async getDoshaAnalytics(userId) {
        const assessments = await prisma.prakritiAssessment.findMany({
            where: { userId, status: 'COMPLETED' },
            orderBy: { completedAt: 'asc' },
            select: {
                id: true, vataScore: true, pittaScore: true, kaphaScore: true,
                prakritiType: true, primaryDosha: true,
                physicalVata: true, physicalPitta: true, physicalKapha: true,
                mentalVata: true, mentalPitta: true, mentalKapha: true,
                digestiveVata: true, digestivePitta: true, digestiveKapha: true,
                completedAt: true, confidence: true,
            },
        });

        const doshaTrend = assessments.map((a) => ({ date: a.completedAt, vata: a.vataScore, pitta: a.pittaScore, kapha: a.kaphaScore, type: a.prakritiType }));
        const latest = assessments[assessments.length - 1];
        const subScoreComparison = latest
            ? {
                physical: { vata: latest.physicalVata, pitta: latest.physicalPitta, kapha: latest.physicalKapha },
                mental: { vata: latest.mentalVata, pitta: latest.mentalPitta, kapha: latest.mentalKapha },
                digestive: { vata: latest.digestiveVata, pitta: latest.digestivePitta, kapha: latest.digestiveKapha },
            }
            : null;

        return { doshaTrend, subScoreComparison, totalAssessments: assessments.length, latestPrakritiType: latest?.prakritiType || null };
    }

    async getDinacharyaAnalytics(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const logs = await prisma.dinacharyaLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
        });

        const adherenceTrend = logs.map((l) => ({ date: l.date, score: l.adherenceScore, completed: l.completedItems, total: l.totalItems }));

        const routineItems = [
            'tongueScraping', 'oilPulling', 'nasya', 'abhyanga',
            'morningExercise', 'morningMeditation', 'morningPrayer',
            'eveningWalk', 'eveningMeditation', 'selfReflection', 'bedtimeRoutine',
        ];

        const itemAdherence = {};
        routineItems.forEach((item) => {
            const count = logs.filter((l) => l[item]).length;
            itemAdherence[item] = {
                completed: count,
                total: logs.length,
                percentage: logs.length > 0 ? parseFloat(((count / logs.length) * 100).toFixed(1)) : 0,
            };
        });

        const avgAdherence = logs.length > 0 ? logs.reduce((s, l) => s + (l.adherenceScore || 0), 0) / logs.length : 0;

        return { trends: { adherenceTrend }, itemAdherence, averageAdherence: parseFloat(avgAdherence.toFixed(1)), totalDaysTracked: logs.length };
    }

    async getWellnessProgress(userId) {
        return prisma.wellnessProgress.findMany({
            where: { userId },
            orderBy: { periodStart: 'desc' },
            take: 12,
        });
    }

    async getRecognitionStats(userId, range = '30d') {
        const { start, end } = getDateRange(range);

        const logs = await prisma.foodRecognitionLog.findMany({
            where: { userId, createdAt: { gte: start, lte: end } },
            orderBy: { createdAt: 'desc' },
        });

        const statusCounts = {};
        logs.forEach((l) => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

        const withConf = logs.filter((l) => l.confidence);
        const avgConfidence = withConf.reduce((s, l) => s + l.confidence, 0) / (withConf.length || 1);
        const verifiedCount = logs.filter((l) => l.userVerified).length;
        const correctedCount = logs.filter((l) => l.userCorrectedFood).length;

        return {
            totalUploads: logs.length,
            statusDistribution: statusCounts,
            averageConfidence: parseFloat(avgConfidence.toFixed(2)),
            verifiedCount,
            correctedCount,
            accuracyRate: verifiedCount > 0 ? parseFloat((((verifiedCount - correctedCount) / verifiedCount) * 100).toFixed(1)) : null,
        };
    }

    async getStatsSummary(userId) {
        const [
            totalAssessments, totalFoodRecognitions, totalDiaryEntries,
            totalExerciseSessions, totalYogaSessions, totalMealPlans,
            totalWaterLogs, totalSleepLogs, totalMoodLogs,
            totalStressLogs, totalDinacharyaLogs, totalRecommendations,
        ] = await Promise.all([
            prisma.prakritiAssessment.count({ where: { userId } }),
            prisma.foodRecognitionLog.count({ where: { userId } }),
            prisma.userFoodDiary.count({ where: { userId } }),
            prisma.exerciseLog.count({ where: { userId } }),
            prisma.yogaSession.count({ where: { userId } }),
            prisma.mealPlan.count({ where: { userId } }),
            prisma.waterIntakeLog.count({ where: { userId } }),
            prisma.sleepLog.count({ where: { userId } }),
            prisma.moodLog.count({ where: { userId } }),
            prisma.stressLog.count({ where: { userId } }),
            prisma.dinacharyaLog.count({ where: { userId } }),
            prisma.recommendation.count({ where: { userId } }),
        ]);

        return {
            totalAssessments, totalFoodRecognitions, totalDiaryEntries,
            totalExerciseSessions, totalYogaSessions, totalMealPlans,
            totalWaterLogs, totalSleepLogs, totalMoodLogs,
            totalStressLogs, totalDinacharyaLogs, totalRecommendations,
        };
    }
}

module.exports = new DashboardService();
