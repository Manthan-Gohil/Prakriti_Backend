const prisma = require('../config/database');
const { getPagination, paginationMeta } = require('../utils/helpers');

class WellnessService {
    // ── RECOMMENDATIONS ─────────────────────────────
    async getRecommendations(userId, { page, limit, type, isRead }) {
        const pagination = getPagination(page, limit);
        const where = { userId };
        if (type) where.type = type;
        if (isRead !== undefined) where.isRead = isRead === 'true';

        const [recommendations, total] = await Promise.all([
            prisma.recommendation.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.take }),
            prisma.recommendation.count({ where }),
        ]);

        return { recommendations, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async updateRecommendation(userId, id, { isRead, isFollowed, userFeedback, rating }) {
        const data = {};
        if (isRead !== undefined) data.isRead = isRead;
        if (isFollowed !== undefined) data.isFollowed = isFollowed;
        if (userFeedback) data.userFeedback = userFeedback;
        if (rating) data.rating = parseInt(rating, 10);

        const result = await prisma.recommendation.updateMany({ where: { id, userId }, data });
        if (result.count === 0) {
            const err = new Error('Recommendation not found.');
            err.status = 404;
            throw err;
        }
    }

    // ── NOTIFICATIONS ───────────────────────────────
    async getNotifications(userId, { page, limit, isRead }) {
        const pagination = getPagination(page, limit);
        const where = { userId };
        if (isRead !== undefined) where.isRead = isRead === 'true';

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.take }),
            prisma.notification.count({ where }),
        ]);

        return { notifications, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async markNotificationRead(userId, id) {
        await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true, readAt: new Date() } });
    }

    async markAllNotificationsRead(userId) {
        await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    }

    // ── PREFERENCES ─────────────────────────────────
    async getPreferences(userId) {
        let prefs = await prisma.userPreference.findUnique({ where: { userId } });
        if (!prefs) {
            prefs = await prisma.userPreference.create({ data: { userId } });
        }
        return prefs;
    }

    async updatePreferences(userId, data) {
        if (data.waterReminderInterval) data.waterReminderInterval = parseInt(data.waterReminderInterval, 10);
        return prisma.userPreference.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
    }

    // ── SEASONAL ROUTINES ───────────────────────────
    async saveSeasonalRoutine(userId, data) {
        data.userId = userId;
        data.year = data.year || new Date().getFullYear();
        return prisma.seasonalRoutine.upsert({
            where: { userId_season_year: { userId, season: data.season, year: data.year } },
            create: data,
            update: data,
        });
    }

    async getSeasonalRoutines(userId, year) {
        const where = { userId };
        if (year) where.year = parseInt(year, 10);
        return prisma.seasonalRoutine.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    // ── ARTICLES ────────────────────────────────────
    async getArticles({ page, limit, category, search, dosha }) {
        const pagination = getPagination(page, limit);
        const where = { isPublished: true };
        if (category) where.category = category;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } },
            ];
        }
        if (dosha) where.doshaRelevance = { has: dosha };

        const [articles, total] = await Promise.all([
            prisma.ayurvedicArticle.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
                select: { id: true, title: true, slug: true, summary: true, category: true, tags: true, imageUrl: true, doshaRelevance: true, readTimeMinutes: true, viewCount: true, createdAt: true },
            }),
            prisma.ayurvedicArticle.count({ where }),
        ]);

        return { articles, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async getArticleBySlug(slug, userId) {
        const article = await prisma.ayurvedicArticle.findUnique({ where: { slug } });
        if (!article) {
            const err = new Error('Article not found.');
            err.status = 404;
            throw err;
        }

        await prisma.ayurvedicArticle.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } });

        let isBookmarked = false;
        if (userId) {
            const bookmark = await prisma.bookmarkedArticle.findUnique({
                where: { userId_articleId: { userId, articleId: article.id } },
            });
            isBookmarked = !!bookmark;
        }

        return { article, isBookmarked };
    }

    async bookmarkArticle(userId, articleId) {
        try {
            return await prisma.bookmarkedArticle.create({ data: { userId, articleId } });
        } catch (error) {
            if (error.code === 'P2002') return null; // already bookmarked
            throw error;
        }
    }

    async removeBookmark(userId, articleId) {
        await prisma.bookmarkedArticle.deleteMany({ where: { userId, articleId } });
    }

    async getBookmarks(userId) {
        return prisma.bookmarkedArticle.findMany({
            where: { userId },
            include: { article: { select: { id: true, title: true, slug: true, summary: true, category: true, imageUrl: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
}

module.exports = new WellnessService();
