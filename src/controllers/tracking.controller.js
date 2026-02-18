const trackingService = require('../services/tracking.service');
const { successResponse } = require('../utils/helpers');

class TrackingController {
    // ── FOOD DIARY ──────────────────────────────────
    async addDiaryEntry(req, res, next) {
        try {
            const entry = await trackingService.addDiaryEntry(req.user.id, req.body);
            return successResponse(res, 'Diary entry added.', { entry }, null, 201);
        } catch (error) { next(error); }
    }

    async getDiary(req, res, next) {
        try {
            const result = await trackingService.getDiary(req.user.id, req.query);
            return successResponse(res, 'Food diary fetched.', { entries: result.entries, grouped: result.grouped }, result.meta);
        } catch (error) { next(error); }
    }

    async deleteDiaryEntry(req, res, next) {
        try {
            await trackingService.deleteDiaryEntry(req.user.id, req.params.id);
            return successResponse(res, 'Diary entry deleted.');
        } catch (error) { next(error); }
    }

    async getDailyNutrients(req, res, next) {
        try {
            const logs = await trackingService.getDailyNutrients(req.user.id, req.query);
            return successResponse(res, 'Daily nutrient logs fetched.', { logs });
        } catch (error) { next(error); }
    }

    // ── WATER ───────────────────────────────────────
    async addWater(req, res, next) {
        try {
            const result = await trackingService.addWater(req.user.id, req.body);
            return successResponse(res, 'Water intake logged.', result, null, 201);
        } catch (error) { next(error); }
    }

    async getWater(req, res, next) {
        try {
            const result = await trackingService.getWater(req.user.id, req.query);
            return successResponse(res, 'Water intake logs fetched.', result);
        } catch (error) { next(error); }
    }

    // ── SLEEP ───────────────────────────────────────
    async addSleep(req, res, next) {
        try {
            const log = await trackingService.addSleep(req.user.id, req.body);
            return successResponse(res, 'Sleep log saved.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async getSleep(req, res, next) {
        try {
            const result = await trackingService.getSleep(req.user.id, req.query);
            return successResponse(res, 'Sleep logs fetched.', result);
        } catch (error) { next(error); }
    }

    // ── EXERCISE ────────────────────────────────────
    async addExercise(req, res, next) {
        try {
            const log = await trackingService.addExercise(req.user.id, req.body);
            return successResponse(res, 'Exercise logged.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async getExercise(req, res, next) {
        try {
            const result = await trackingService.getExercise(req.user.id, req.query);
            return successResponse(res, 'Exercise logs fetched.', result);
        } catch (error) { next(error); }
    }

    // ── YOGA ────────────────────────────────────────
    async addYoga(req, res, next) {
        try {
            const session = await trackingService.addYoga(req.user.id, req.body);
            return successResponse(res, 'Yoga session logged.', { session }, null, 201);
        } catch (error) { next(error); }
    }

    async getYoga(req, res, next) {
        try {
            const result = await trackingService.getYoga(req.user.id, req.query);
            return successResponse(res, 'Yoga sessions fetched.', result);
        } catch (error) { next(error); }
    }

    // ── MOOD ────────────────────────────────────────
    async addMood(req, res, next) {
        try {
            const log = await trackingService.addMood(req.user.id, req.body);
            return successResponse(res, 'Mood logged.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async getMood(req, res, next) {
        try {
            const result = await trackingService.getMood(req.user.id, req.query);
            return successResponse(res, 'Mood logs fetched.', result);
        } catch (error) { next(error); }
    }

    // ── STRESS ──────────────────────────────────────
    async addStress(req, res, next) {
        try {
            const log = await trackingService.addStress(req.user.id, req.body);
            return successResponse(res, 'Stress logged.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async getStress(req, res, next) {
        try {
            const result = await trackingService.getStress(req.user.id, req.query);
            return successResponse(res, 'Stress logs fetched.', result);
        } catch (error) { next(error); }
    }

    // ── HEALTH ──────────────────────────────────────
    async addHealth(req, res, next) {
        try {
            const log = await trackingService.addHealth(req.user.id, req.body);
            return successResponse(res, 'Health data logged.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async getHealth(req, res, next) {
        try {
            const logs = await trackingService.getHealth(req.user.id, req.query);
            return successResponse(res, 'Health tracking logs fetched.', { logs });
        } catch (error) { next(error); }
    }

    // ── DINACHARYA ──────────────────────────────────
    async addDinacharya(req, res, next) {
        try {
            const log = await trackingService.addDinacharya(req.user.id, req.body);
            return successResponse(res, 'Dinacharya log saved.', { log }, null, 201);
        } catch (error) { next(error); }
    }

    async getDinacharya(req, res, next) {
        try {
            const result = await trackingService.getDinacharya(req.user.id, req.query);
            return successResponse(res, 'Dinacharya logs fetched.', result);
        } catch (error) { next(error); }
    }
}

module.exports = new TrackingController();
