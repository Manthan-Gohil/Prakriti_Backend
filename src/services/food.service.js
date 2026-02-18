const prisma = require('../config/database');
const { getPagination, paginationMeta } = require('../utils/helpers');

class FoodService {
    async list({ page, limit, category, search, dosha, season, dietType }) {
        const pagination = getPagination(page, limit);
        const where = { isActive: true };

        if (category) where.category = category;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { nameHindi: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (dosha) {
            const doshaField = `${dosha.toLowerCase()}Effect`;
            where[doshaField] = 1;
        }

        if (season) where.bestSeasons = { has: season };
        if (dietType === 'sattvic') where.isSattvic = true;
        if (dietType === 'rajasic') where.isRajasic = true;
        if (dietType === 'tamasic') where.isTamasic = true;

        const [foods, total] = await Promise.all([
            prisma.foodItem.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma.foodItem.count({ where }),
        ]);

        return { foods, meta: paginationMeta(total, pagination.page, pagination.limit) };
    }

    async getById(id) {
        const food = await prisma.foodItem.findUnique({ where: { id } });
        if (!food) {
            const err = new Error('Food item not found.');
            err.status = 404;
            throw err;
        }
        return food;
    }

    async getByCategory(category) {
        const foods = await prisma.foodItem.findMany({
            where: { category, isActive: true },
            orderBy: { name: 'asc' },
        });
        return { foods, count: foods.length };
    }

    async getByDosha(dosha) {
        dosha = dosha.toUpperCase();
        if (!['VATA', 'PITTA', 'KAPHA'].includes(dosha)) {
            const err = new Error('Invalid dosha type.');
            err.status = 400;
            throw err;
        }

        const fieldMap = { VATA: 'vataEffect', PITTA: 'pittaEffect', KAPHA: 'kaphaEffect' };

        const [balancing, aggravating, neutral] = await Promise.all([
            prisma.foodItem.findMany({ where: { [fieldMap[dosha]]: 1, isActive: true }, orderBy: { name: 'asc' } }),
            prisma.foodItem.findMany({ where: { [fieldMap[dosha]]: -1, isActive: true }, orderBy: { name: 'asc' } }),
            prisma.foodItem.findMany({ where: { [fieldMap[dosha]]: 0, isActive: true }, orderBy: { name: 'asc' } }),
        ]);

        return {
            dosha,
            balancing: { foods: balancing, count: balancing.length },
            aggravating: { foods: aggravating, count: aggravating.length },
            neutral: { foods: neutral, count: neutral.length },
        };
    }

    async create(data) {
        const floatFields = [
            'caloriesKcal', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sugarG',
            'sodiumMg', 'potassiumMg', 'calciumMg', 'ironMg', 'vitaminAMcg',
            'vitaminCMg', 'vitaminDMcg', 'vitaminEMg', 'vitaminKMcg',
            'vitaminB12Mcg', 'folateMcg', 'magnesiumMg', 'zincMg',
            'omega3G', 'omega6G', 'cholesterolMg', 'transFatG', 'saturatedFatG',
            'servingSizeG',
        ];
        floatFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseFloat(data[f]); });

        if (data.glycemicIndex) data.glycemicIndex = parseInt(data.glycemicIndex, 10);
        if (data.vataEffect) data.vataEffect = parseInt(data.vataEffect, 10);
        if (data.pittaEffect) data.pittaEffect = parseInt(data.pittaEffect, 10);
        if (data.kaphaEffect) data.kaphaEffect = parseInt(data.kaphaEffect, 10);

        return prisma.foodItem.create({ data });
    }

    async update(id, data) {
        return prisma.foodItem.update({ where: { id }, data });
    }

    async search(q) {
        if (!q || q.length < 2) {
            const err = new Error('Search query must be at least 2 characters.');
            err.status = 400;
            throw err;
        }

        const foods = await prisma.foodItem.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { nameHindi: { contains: q, mode: 'insensitive' } },
                    { nameSanskrit: { contains: q, mode: 'insensitive' } },
                    { subcategory: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 20,
            orderBy: { name: 'asc' },
        });

        return { foods, count: foods.length };
    }
}

module.exports = new FoodService();
