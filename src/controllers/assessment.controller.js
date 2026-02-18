const assessmentService = require('../services/assessment.service');
const { successResponse } = require('../utils/helpers');

class AssessmentController {
    async getQuestions(req, res, next) {
        try {
            const result = await assessmentService.getQuestions(req.query);
            return successResponse(res, 'Questions fetched.', result);
        } catch (error) { next(error); }
    }

    async startAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.startAssessment(req.user.id);
            return successResponse(res, 'Assessment started.', { assessment }, null, 201);
        } catch (error) { next(error); }
    }

    async submitResponse(req, res, next) {
        try {
            const result = await assessmentService.submitResponse(req.user.id, req.params.id, req.body);
            return successResponse(res, 'Response recorded.', result);
        } catch (error) { next(error); }
    }

    async submitBulkResponses(req, res, next) {
        try {
            const result = await assessmentService.submitBulkResponses(req.user.id, req.params.id, req.body.responses);
            return successResponse(res, `${result.count} responses recorded.`, result);
        } catch (error) { next(error); }
    }

    async uploadImages(req, res, next) {
        try {
            const result = await assessmentService.uploadImages(req.params.id, req.files);
            return successResponse(res, 'Images uploaded.', result);
        } catch (error) { next(error); }
    }

    async completeAssessment(req, res, next) {
        try {
            const result = await assessmentService.completeAssessment(req.user.id, req.params.id);
            return successResponse(res, 'Assessment completed.', result);
        } catch (error) { next(error); }
    }

    async getAssessment(req, res, next) {
        try {
            const assessment = await assessmentService.getAssessment(req.user.id, req.params.id);
            return successResponse(res, 'Assessment fetched.', { assessment });
        } catch (error) { next(error); }
    }

    async listAssessments(req, res, next) {
        try {
            const result = await assessmentService.listAssessments(req.user.id, req.query);
            return successResponse(res, 'Assessments fetched.', { assessments: result.assessments }, result.meta);
        } catch (error) { next(error); }
    }

    async getDoshaProfile(req, res, next) {
        try {
            const doshaProfile = await assessmentService.getDoshaProfile(req.user.id);
            return successResponse(res, 'Dosha profile fetched.', { doshaProfile });
        } catch (error) { next(error); }
    }
}

module.exports = new AssessmentController();
