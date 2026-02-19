const profileService = require('../services/profile.service');
const { successResponse } = require('../utils/helpers');

class ProfileController {
    async createOrUpdate(req, res, next) {
        try {
            const result = await profileService.createOrUpdate(req.user.id, req.body);
            return successResponse(res, result.message, { profile: result.profile }, null, result.created ? 201 : 200);
        } catch (error) { next(error); }
    }

    async getProfile(req, res, next) {
        try {
            const profile = await profileService.getProfile(req.user.id);
            return successResponse(res, 'Profile fetched.', { profile });
        } catch (error) { next(error); }
    }

    async updateProfile(req, res, next) {
        try {
            const profile = await profileService.updateProfile(req.user.id, req.body);
            return successResponse(res, 'Profile updated.', { profile });
        } catch (error) { next(error); }
    }

    async uploadImage(req, res, next) {
        try {
            const profile = await profileService.uploadImage(req.user.id, req.file, req.body.type);
            return successResponse(res, 'Image uploaded.', { profile });
        } catch (error) { next(error); }
    }

    async getSummary(req, res, next) {
        try {
            const summary = await profileService.getSummary(req.user.id);
            return successResponse(res, 'Profile summary fetched.', summary);
        } catch (error) { next(error); }
    }

    async savePrakritiTraits(req, res, next) {
        try {
            const profile = await profileService.savePrakritiTraits(req.user.id, req.body);
            return successResponse(res, 'Prakriti traits saved.', { profile }, null, 201);
        } catch (error) { next(error); }
    }

    async saveDoshaTraits(req, res, next) {
        try {
            const doshaTraits = await profileService.saveDoshaTraits(req.user.id, req.body);
            return successResponse(res, 'Dosha traits saved.', { doshaTraits }, null, 201);
        } catch (error) { next(error); }
    }

    async getDoshaTraits(req, res, next) {
        try {
            const doshaTraits = await profileService.getDoshaTraits(req.user.id);
            return successResponse(res, 'Dosha traits fetched.', { doshaTraits });
        } catch (error) { next(error); }
    }

    async predictPrakriti(req, res, next) {
        try {
            const result = await profileService.runPrakritiPrediction(req.user.id, req.body);
            return successResponse(res, 'Prakriti prediction completed.', result, null, 201);
        } catch (error) { next(error); }
    }

    async predictDosha(req, res, next) {
        try {
            const result = await profileService.runDoshaPrediction(req.user.id, req.body);
            return successResponse(res, 'Dosha imbalance prediction completed.', result, null, 201);
        } catch (error) { next(error); }
    }

    async getPredictions(req, res, next) {
        try {
            const predictions = await profileService.getPredictions(req.user.id);
            return successResponse(res, 'Predictions fetched.', predictions);
        } catch (error) { next(error); }
    }

    async getPrakritiHistory(req, res, next) {
        try {
            const history = await profileService.getPrakritiHistory(req.user.id);
            return successResponse(res, 'Prakriti prediction history fetched.', { history });
        } catch (error) { next(error); }
    }

    async getDoshaHistory(req, res, next) {
        try {
            const history = await profileService.getDoshaHistory(req.user.id);
            return successResponse(res, 'Dosha prediction history fetched.', { history });
        } catch (error) { next(error); }
    }
}

module.exports = new ProfileController();
