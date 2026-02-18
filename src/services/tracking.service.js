const prisma = require('../config/database');
const { getPagination, paginationMeta, getDateRange } = require('../utils/helpers');

class TrackingService {
    // ── FOOD DIARY ──────────────────────────────────
    async addDiaryEntry(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();
        if (data.quantityG) data.quantityG = parseFloat(data.quantityG);
        if (data.servings) data.servings = parseFloat(data.servings);
        if (data.calories) data.calories = parseFloat(data.calories);
        if (data.proteinG) data.proteinG = parseFloat(data.proteinG);
        if (data.carbsG) data.carbsG = parseFloat(data.carbsG);
        if (data.fatG) data.fatG = parseFloat(data.fatG);
        if (data.fiberG) data.fiberG = parseFloat(data.fiberG);

        if (data.foodItemId) {
            const foodItem = await prisma.foodItem.findUnique({ where: { id: data.foodItemId } });
            if (foodItem && data.quantityG) {
                const ratio = data.quantityG / 100;
                data.calories = data.calories || (foodItem.caloriesKcal ? foodItem.caloriesKcal * ratio : null);
                data.proteinG = data.proteinG || (foodItem.proteinG ? foodItem.proteinG * ratio : null);
                data.carbsG = data.carbsG || (foodItem.carbsG ? foodItem.carbsG * ratio : null);
                data.fatG = data.fatG || (foodItem.fatG ? foodItem.fatG * ratio : null);
                data.fiberG = data.fiberG || (foodItem.fiberG ? foodItem.fiberG * ratio : null);
                data.isSattvic = foodItem.isSattvic;
                data.doshaEffect = foodItem.doshaEffect;
                data.rpiRasa = foodItem.rpiRasa;
            }
        }

        const entry = await prisma.userFoodDiary.create({ data });
        await this._updateDailyNutrientLog(userId, data.date);
        return entry;
    }

    async getDiary(userId, { date, range = '7d', page, limit }) {
        const pagination = getPagination(page, limit);
        const where = { userId };

        if (date) {
            const d = new Date(date);
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            where.date = { gte: d, lt: nextDay };
        } else {
            const { start, end } = getDateRange(range);
            where.date = { gte: start, lte: end };
        }

        const [entries, total] = await Promise.all([
            prisma.userFoodDiary.findMany({
                where,
                orderBy: [{ date: 'desc' }, { mealType: 'asc' }],
                skip: pagination.skip,
                take: pagination.take,
                include: { foodItem: true },
            }),
            prisma.userFoodDiary.count({ where }),
        ]);

        const grouped = {};
        entries.forEach((e) => {
            const dateKey = e.date.toISOString().split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = {};
            if (!grouped[dateKey][e.mealType]) grouped[dateKey][e.mealType] = [];
            grouped[dateKey][e.mealType].push(e);
        });

        return { entries, grouped, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async deleteDiaryEntry(userId, id) {
        const entry = await prisma.userFoodDiary.findFirst({ where: { id, userId } });
        if (!entry) {
            const err = new Error('Diary entry not found.');
            err.status = 404;
            throw err;
        }
        await prisma.userFoodDiary.delete({ where: { id } });
        await this._updateDailyNutrientLog(userId, entry.date);
    }

    async getDailyNutrients(userId, { date, range = '7d' }) {
        const where = { userId };
        if (date) {
            where.date = new Date(date);
        } else {
            const { start, end } = getDateRange(range);
            where.date = { gte: start, lte: end };
        }
        return prisma.dailyNutrientLog.findMany({ where, orderBy: { date: 'desc' } });
    }

    // ── WATER INTAKE ────────────────────────────────
    async addWater(userId, { amountMl, waterType, time, date }) {
        const d = date ? new Date(date) : new Date();
        const log = await prisma.waterIntakeLog.create({
            data: {
                userId,
                date: d,
                amountMl: parseInt(amountMl, 10),
                waterType,
                time: time || new Date().toTimeString().slice(0, 5),
            },
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayTotal = await prisma.waterIntakeLog.aggregate({
            where: { userId, date: { gte: todayStart, lte: todayEnd } },
            _sum: { amountMl: true },
        });

        return { log, todayTotal: todayTotal._sum.amountMl || 0 };
    }

    async getWater(userId, { date, range = '7d' }) {
        const where = { userId };
        if (date) {
            where.date = new Date(date);
        } else {
            const { start, end } = getDateRange(range);
            where.date = { gte: start, lte: end };
        }

        const logs = await prisma.waterIntakeLog.findMany({
            where,
            orderBy: [{ date: 'desc' }, { time: 'desc' }],
        });

        const daily = {};
        logs.forEach((l) => {
            const key = l.date.toISOString().split('T')[0];
            daily[key] = (daily[key] || 0) + l.amountMl;
        });

        return { logs, dailyTotals: daily };
    }

    // ── SLEEP ───────────────────────────────────────
    async addSleep(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();
        data.durationHours = parseFloat(data.durationHours);
        data.quality = parseInt(data.quality, 10);
        if (data.deepSleepHours) data.deepSleepHours = parseFloat(data.deepSleepHours);
        if (data.remSleepHours) data.remSleepHours = parseFloat(data.remSleepHours);
        if (data.awakenings) data.awakenings = parseInt(data.awakenings, 10);

        return prisma.sleepLog.upsert({
            where: { userId_date: { userId, date: data.date } },
            create: data,
            update: data,
        });
    }

    async getSleep(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        const logs = await prisma.sleepLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });

        const avgDuration = logs.length > 0 ? logs.reduce((s, l) => s + l.durationHours, 0) / logs.length : 0;
        const avgQuality = logs.length > 0 ? logs.reduce((s, l) => s + l.quality, 0) / logs.length : 0;

        return {
            logs,
            stats: {
                avgDuration: parseFloat(avgDuration.toFixed(1)),
                avgQuality: parseFloat(avgQuality.toFixed(1)),
                totalLogs: logs.length,
            },
        };
    }

    // ── EXERCISE ────────────────────────────────────
    async addExercise(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();
        data.durationMinutes = parseInt(data.durationMinutes, 10);
        if (data.caloriesBurned) data.caloriesBurned = parseFloat(data.caloriesBurned);
        if (data.heartRateAvg) data.heartRateAvg = parseInt(data.heartRateAvg, 10);
        return prisma.exerciseLog.create({ data });
    }

    async getExercise(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        const logs = await prisma.exerciseLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });

        const totalMinutes = logs.reduce((s, l) => s + l.durationMinutes, 0);
        const totalCalories = logs.reduce((s, l) => s + (l.caloriesBurned || 0), 0);

        return {
            logs,
            stats: { totalMinutes, totalCalories: parseFloat(totalCalories.toFixed(1)), totalSessions: logs.length },
        };
    }

    // ── YOGA ────────────────────────────────────────
    async addYoga(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();
        data.durationMinutes = parseInt(data.durationMinutes, 10);
        if (data.meditationMinutes) data.meditationMinutes = parseInt(data.meditationMinutes, 10);
        return prisma.yogaSession.create({ data });
    }

    async getYoga(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        const sessions = await prisma.yogaSession.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });
        return { sessions, totalSessions: sessions.length };
    }

    // ── MOOD ────────────────────────────────────────
    async addMood(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();
        return prisma.moodLog.create({ data });
    }

    async getMood(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        const logs = await prisma.moodLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });
        const frequency = {};
        logs.forEach((l) => { frequency[l.mood] = (frequency[l.mood] || 0) + 1; });
        return { logs, frequency };
    }

    // ── STRESS ──────────────────────────────────────
    async addStress(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();
        data.level = parseInt(data.level, 10);
        return prisma.stressLog.create({ data });
    }

    async getStress(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        const logs = await prisma.stressLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });
        const avgLevel = logs.length > 0 ? logs.reduce((s, l) => s + l.level, 0) / logs.length : 0;
        return {
            logs,
            stats: { avgLevel: parseFloat(avgLevel.toFixed(1)), totalLogs: logs.length },
        };
    }

    // ── HEALTH VITALS ───────────────────────────────
    async addHealth(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();

        const floatFields = ['weightKg', 'bmi', 'bodyFatPct', 'bodyTemperature', 'oxygenSaturation', 'waistCm', 'hipCm', 'chestCm'];
        const intFields = [
            'bloodPressureSystolic', 'bloodPressureDiastolic', 'restingHeartRate',
            'digestiveComfort', 'bowelMovements', 'bloating', 'acidity', 'gasLevel',
            'energyLevel', 'mentalClarity', 'overallWellbeing', 'painLevel', 'inflammationLevel',
            'skinClarity', 'eyeBrightness',
        ];

        floatFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseFloat(data[f]); });
        intFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseInt(data[f], 10); });

        return prisma.healthTrackingLog.upsert({
            where: { userId_date: { userId, date: data.date } },
            create: data,
            update: data,
        });
    }

    async getHealth(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        return prisma.healthTrackingLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });
    }

    // ── DINACHARYA ──────────────────────────────────
    async addDinacharya(userId, data) {
        data.userId = userId;
        data.date = data.date ? new Date(data.date) : new Date();

        const routineItems = [
            'tongueScraping', 'oilPulling', 'nasya', 'abhyanga',
            'morningExercise', 'morningMeditation', 'morningPrayer',
            'eveningWalk', 'eveningMeditation', 'selfReflection', 'bedtimeRoutine',
        ];
        data.totalItems = routineItems.length;
        data.completedItems = routineItems.filter((item) => data[item] === true).length;
        data.adherenceScore = parseFloat(((data.completedItems / data.totalItems) * 100).toFixed(1));

        return prisma.dinacharyaLog.upsert({
            where: { userId_date: { userId, date: data.date } },
            create: data,
            update: data,
        });
    }

    async getDinacharya(userId, { range = '30d' }) {
        const { start, end } = getDateRange(range);
        const logs = await prisma.dinacharyaLog.findMany({
            where: { userId, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
        });

        const avgAdherence = logs.length > 0 ? logs.reduce((s, l) => s + (l.adherenceScore || 0), 0) / logs.length : 0;

        return {
            logs,
            stats: { avgAdherence: parseFloat(avgAdherence.toFixed(1)), totalDays: logs.length },
        };
    }

    // ── HELPER ──────────────────────────────────────
    async _updateDailyNutrientLog(userId, date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const entries = await prisma.userFoodDiary.findMany({
            where: { userId, date: { gte: dayStart, lte: dayEnd } },
        });

        const totals = entries.reduce(
            (acc, e) => ({
                totalCalories: acc.totalCalories + (e.calories || 0),
                totalProteinG: acc.totalProteinG + (e.proteinG || 0),
                totalCarbsG: acc.totalCarbsG + (e.carbsG || 0),
                totalFatG: acc.totalFatG + (e.fatG || 0),
                totalFiberG: acc.totalFiberG + (e.fiberG || 0),
                sattvicMealCount: acc.sattvicMealCount + (e.isSattvic ? 1 : 0),
                mealsConsumed: acc.mealsConsumed + 1,
            }),
            { totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0, totalFiberG: 0, sattvicMealCount: 0, mealsConsumed: 0 }
        );

        const rasaCounts = { sweetCount: 0, sourCount: 0, saltyCount: 0, pungentCount: 0, bitterCount: 0, astringentCount: 0 };
        entries.forEach((e) => {
            if (e.rpiRasa) {
                e.rpiRasa.forEach((r) => {
                    const map = { MADHURA: 'sweetCount', AMLA: 'sourCount', LAVANA: 'saltyCount', KATU: 'pungentCount', TIKTA: 'bitterCount', KASHAYA: 'astringentCount' };
                    if (map[r]) rasaCounts[map[r]]++;
                });
            }
        });

        await prisma.dailyNutrientLog.upsert({
            where: { userId_date: { userId, date: dayStart } },
            create: { userId, date: dayStart, ...totals, ...rasaCounts },
            update: { ...totals, ...rasaCounts },
        });
    }
}

module.exports = new TrackingService();
