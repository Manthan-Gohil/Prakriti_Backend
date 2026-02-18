const prisma = require('../config/database');
const { getPagination, paginationMeta } = require('../utils/helpers');
const { analyzePrakriti, determineAgniType, getDominantGunas } = require('../utils/prakritiEngine');

class AssessmentService {
    async getQuestions(category) {
        const where = { isActive: true };
        if (category) where.category = category;

        const questions = await prisma.prakritiQuestion.findMany({
            where,
            include: { options: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
        });

        const grouped = {};
        questions.forEach((q) => {
            if (!grouped[q.category]) grouped[q.category] = [];
            grouped[q.category].push(q);
        });

        return { questions, grouped, totalQuestions: questions.length };
    }

    async startAssessment(userId, { assessmentType = 'INITIAL', assessmentMethod = 'QUESTIONNAIRE' }) {
        const incomplete = await prisma.prakritiAssessment.findFirst({
            where: { userId, status: 'IN_PROGRESS' },
        });

        if (incomplete) return { assessment: incomplete, isExisting: true };

        const assessment = await prisma.prakritiAssessment.create({
            data: { userId, assessmentType, assessmentMethod },
        });

        return { assessment, isExisting: false };
    }

    async submitResponse(userId, assessmentId, { questionId, optionId }) {
        const assessment = await prisma.prakritiAssessment.findFirst({
            where: { id: assessmentId, userId, status: 'IN_PROGRESS' },
        });

        if (!assessment) {
            const err = new Error('Assessment not found or already completed.');
            err.status = 404;
            throw err;
        }

        const response = await prisma.prakritiQuestionResponse.upsert({
            where: { assessmentId_questionId: { assessmentId, questionId } },
            create: { assessmentId, questionId, optionId },
            update: { optionId },
            include: { question: true, option: true },
        });

        const totalQuestions = await prisma.prakritiQuestion.count({ where: { isActive: true } });
        const answered = await prisma.prakritiQuestionResponse.count({ where: { assessmentId } });

        return {
            response,
            progress: {
                answered,
                total: totalQuestions,
                percentage: parseFloat(((answered / totalQuestions) * 100).toFixed(1)),
            },
        };
    }

    async submitBulkResponses(userId, assessmentId, responses) {
        const assessment = await prisma.prakritiAssessment.findFirst({
            where: { id: assessmentId, userId, status: 'IN_PROGRESS' },
        });

        if (!assessment) {
            const err = new Error('Assessment not found or already completed.');
            err.status = 404;
            throw err;
        }

        const results = await prisma.$transaction(
            responses.map((r) =>
                prisma.prakritiQuestionResponse.upsert({
                    where: { assessmentId_questionId: { assessmentId, questionId: r.questionId } },
                    create: { assessmentId, questionId: r.questionId, optionId: r.optionId },
                    update: { optionId: r.optionId },
                })
            )
        );

        const totalQuestions = await prisma.prakritiQuestion.count({ where: { isActive: true } });
        const answered = await prisma.prakritiQuestionResponse.count({ where: { assessmentId } });

        return {
            savedCount: results.length,
            progress: {
                answered,
                total: totalQuestions,
                percentage: parseFloat(((answered / totalQuestions) * 100).toFixed(1)),
            },
        };
    }

    async uploadImages(userId, assessmentId, files) {
        const assessment = await prisma.prakritiAssessment.findFirst({
            where: { id: assessmentId, userId },
        });

        if (!assessment) {
            const err = new Error('Assessment not found.');
            err.status = 404;
            throw err;
        }

        const imageUrls = files.map((f) => `/uploads/assessment/${f.filename}`);

        await prisma.prakritiAssessment.update({
            where: { id: assessmentId },
            data: {
                imageUrls: [...(assessment.imageUrls || []), ...imageUrls],
                assessmentMethod: 'COMBINED',
            },
        });

        return imageUrls;
    }

    async completeAssessment(userId, assessmentId) {
        const assessment = await prisma.prakritiAssessment.findFirst({
            where: { id: assessmentId, userId, status: 'IN_PROGRESS' },
            include: {
                responses: { include: { question: true, option: true } },
            },
        });

        if (!assessment) {
            const err = new Error('Assessment not found or already completed.');
            err.status = 404;
            throw err;
        }

        if (assessment.responses.length === 0) {
            const err = new Error('No responses submitted. Please answer the questions first.');
            err.status = 400;
            throw err;
        }

        const result = analyzePrakriti(assessment.responses);
        const timeTaken = Math.round((Date.now() - new Date(assessment.startedAt).getTime()) / 1000);

        const completed = await prisma.prakritiAssessment.update({
            where: { id: assessmentId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                timeTakenSeconds: timeTaken,
                vataScore: result.vataScore,
                pittaScore: result.pittaScore,
                kaphaScore: result.kaphaScore,
                primaryDosha: result.primaryDosha,
                secondaryDosha: result.secondaryDosha,
                prakritiType: result.prakritiType,
                physicalVata: result.physicalVata,
                physicalPitta: result.physicalPitta,
                physicalKapha: result.physicalKapha,
                mentalVata: result.mentalVata,
                mentalPitta: result.mentalPitta,
                mentalKapha: result.mentalKapha,
                digestiveVata: result.digestiveVata,
                digestivePitta: result.digestivePitta,
                digestiveKapha: result.digestiveKapha,
                confidence: assessment.responses.length >= 20 ? 0.9 : 0.7,
                rawData: result,
            },
        });

        await prisma.doshaProfile.upsert({
            where: { userId },
            create: {
                userId,
                prakritiVata: result.vataScore,
                prakritiPitta: result.pittaScore,
                prakritiKapha: result.kaphaScore,
                prakritiType: result.prakritiType,
                vikritiVata: result.vataScore,
                vikritiPitta: result.pittaScore,
                vikritiKapha: result.kaphaScore,
                vikritiType: result.prakritiType,
                agniType: determineAgniType(result.primaryDosha),
                dominantGunas: getDominantGunas(result.primaryDosha),
                lastAssessmentId: assessmentId,
                lastAssessedAt: new Date(),
            },
            update: {
                prakritiVata: result.vataScore,
                prakritiPitta: result.pittaScore,
                prakritiKapha: result.kaphaScore,
                prakritiType: result.prakritiType,
                vikritiVata: result.vataScore,
                vikritiPitta: result.pittaScore,
                vikritiKapha: result.kaphaScore,
                vikritiType: result.prakritiType,
                agniType: determineAgniType(result.primaryDosha),
                dominantGunas: getDominantGunas(result.primaryDosha),
                lastAssessmentId: assessmentId,
                lastAssessedAt: new Date(),
            },
        });

        return { assessment: completed, result };
    }

    async getAssessment(userId, assessmentId) {
        const assessment = await prisma.prakritiAssessment.findFirst({
            where: { id: assessmentId, userId },
            include: { responses: { include: { question: true, option: true } } },
        });

        if (!assessment) {
            const err = new Error('Assessment not found.');
            err.status = 404;
            throw err;
        }

        return assessment;
    }

    async listAssessments(userId, { page, limit }) {
        const pagination = getPagination(page, limit);

        const [assessments, total] = await Promise.all([
            prisma.prakritiAssessment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
                select: {
                    id: true, assessmentType: true, assessmentMethod: true,
                    status: true, vataScore: true, pittaScore: true, kaphaScore: true,
                    prakritiType: true, primaryDosha: true, confidence: true,
                    startedAt: true, completedAt: true, timeTakenSeconds: true,
                },
            }),
            prisma.prakritiAssessment.count({ where: { userId } }),
        ]);

        return { assessments, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async getDoshaProfile(userId) {
        const doshaProfile = await prisma.doshaProfile.findUnique({ where: { userId } });

        if (!doshaProfile) {
            const err = new Error('No dosha profile found. Please complete a Prakriti assessment.');
            err.status = 404;
            throw err;
        }

        return doshaProfile;
    }
}

module.exports = new AssessmentService();
