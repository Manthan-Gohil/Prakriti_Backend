const prisma = require('../config/database');
const { calculateBmi } = require('../utils/helpers');

class ProfileService {
    async createOrUpdate(userId, data) {
        if (data.heightCm && data.weightKg) {
            data.bmi = calculateBmi(data.weightKg, data.heightCm);
        }

        if (data.dateOfBirth) {
            data.dateOfBirth = new Date(data.dateOfBirth);
        }

        const floatFields = [
            'heightCm', 'weightKg', 'bmi', 'waistCm', 'hipCm', 'chestCm',
            'neckCm', 'wristCm', 'bodyFatPct', 'bodyTemperature', 'oxygenSaturation',
            'averageSleepHours', 'targetWeightKg',
        ];
        const intFields = [
            'bloodPressureSystolic', 'bloodPressureDiastolic', 'restingHeartRate',
            'dailyWaterIntakeMl', 'menstrualCycleDays', 'targetTimelineWeeks',
        ];

        floatFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseFloat(data[f]); });
        intFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseInt(data[f], 10); });

        const arrayFields = [
            'allergies', 'medications', 'supplements', 'chronicConditions',
            'pastSurgeries', 'familyHistory', 'cuisinePreferences',
            'foodAllergies', 'foodIntolerances', 'skinConditions', 'healthGoals',
        ];
        arrayFields.forEach((f) => {
            if (data[f] && typeof data[f] === 'string') {
                data[f] = data[f].split(',').map((s) => s.trim()).filter(Boolean);
            }
        });

        const profile = await prisma.healthProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });

        await prisma.user.update({
            where: { id: userId },
            data: { isProfileComplete: true },
        });

        return profile;
    }

    async savePrakritiTraits(userId, data) {
        // Map incoming snake_case keys to camelCase DB fields
        const fieldMap = {
            body_size: 'bodySize',
            body_weight_tendency: 'bodyWeightTendency',
            height: 'height',
            bone_structure: 'boneStructure',
            body_frame: 'bodyFrameTrait',
            complexion: 'complexion',
            skin_type: 'skinTypeTrait',
            skin_texture: 'skinTexture',
            hair_color: 'hairColor',
            hair_density: 'hairDensity',
            hair_texture: 'hairTexture',
            hair_appearance: 'hairAppearance',
            hair_graying: 'hairGraying',
            face_shape: 'faceShape',
            cheeks: 'cheeks',
            jaw_structure: 'jawStructure',
            eyes: 'eyes',
            eye_luster: 'eyeLuster',
            eyelashes: 'eyelashes',
            blinking_pattern: 'blinkingPattern',
            nose_shape: 'noseShape',
            nose_tip: 'noseTip',
            teeth_structure: 'teethStructure',
            teeth_gums: 'teethGums',
            lips: 'lips',
            nails: 'nails',
            appetite: 'appetiteTrait',
            digestion_speed: 'digestionSpeed',
            hunger_frequency: 'hungerFrequency',
            thirst_level: 'thirstLevel',
            sweating: 'sweating',
            bowel_habit: 'bowelHabit',
            taste_preference: 'tastePreference',
            food_temperature_preference: 'foodTemperaturePreference',
            weather_preference: 'weatherPreference',
        };

        const mapped = {};
        for (const [key, dbField] of Object.entries(fieldMap)) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                mapped[dbField] = data[key];
            }
        }

        if (Object.keys(mapped).length === 0) {
            const err = new Error('At least one trait field is required.');
            err.status = 400;
            throw err;
        }

        const profile = await prisma.healthProfile.upsert({
            where: { userId },
            create: { userId, firstName: 'User', lastName: 'User', dateOfBirth: new Date('2000-01-01'), gender: 'PREFER_NOT_TO_SAY', heightCm: 0, weightKg: 0, ...mapped },
            update: mapped,
        });

        return profile;
    }

    async getProfile(userId) {
        const profile = await prisma.healthProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            const err = new Error('Health profile not found. Please complete your profile.');
            err.status = 404;
            throw err;
        }

        return profile;
    }

    async updateProfile(userId, data) {
        const floatFields = [
            'heightCm', 'weightKg', 'waistCm', 'hipCm', 'chestCm',
            'neckCm', 'wristCm', 'bodyFatPct', 'bodyTemperature', 'oxygenSaturation',
            'averageSleepHours', 'targetWeightKg',
        ];
        const intFields = [
            'bloodPressureSystolic', 'bloodPressureDiastolic', 'restingHeartRate',
            'dailyWaterIntakeMl', 'menstrualCycleDays', 'targetTimelineWeeks',
        ];

        floatFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseFloat(data[f]); });
        intFields.forEach((f) => { if (data[f] !== undefined) data[f] = parseInt(data[f], 10); });

        if (data.heightCm && data.weightKg) {
            data.bmi = calculateBmi(data.weightKg, data.heightCm);
        }

        if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);

        return prisma.healthProfile.update({
            where: { userId },
            data,
        });
    }

    async uploadImage(userId, imageType, filename) {
        const validTypes = ['profileImageUrl', 'bodyImageUrl', 'tongueImageUrl', 'nailImageUrl', 'eyeImageUrl'];
        if (!imageType || !validTypes.includes(imageType)) {
            const err = new Error(`imageType must be one of: ${validTypes.join(', ')}`);
            err.status = 400;
            throw err;
        }

        const imageUrl = `/uploads/profile/${filename}`;

        await prisma.healthProfile.update({
            where: { userId },
            data: { [imageType]: imageUrl },
        });

        if (imageType === 'profileImageUrl') {
            await prisma.user.update({
                where: { id: userId },
                data: { avatarUrl: imageUrl },
            });
        }

        return { imageUrl, imageType };
    }

    async getSummary(userId) {
        const [profile, doshaProfile, latestAssessment, latestHealth] = await Promise.all([
            prisma.healthProfile.findUnique({ where: { userId } }),
            prisma.doshaProfile.findUnique({ where: { userId } }),
            prisma.prakritiAssessment.findFirst({
                where: { userId, status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
            }),
            prisma.healthTrackingLog.findFirst({
                where: { userId },
                orderBy: { date: 'desc' },
            }),
        ]);

        return {
            profile,
            doshaProfile,
            latestAssessment: latestAssessment
                ? {
                    prakritiType: latestAssessment.prakritiType,
                    vataScore: latestAssessment.vataScore,
                    pittaScore: latestAssessment.pittaScore,
                    kaphaScore: latestAssessment.kaphaScore,
                    completedAt: latestAssessment.completedAt,
                }
                : null,
            latestHealth,
        };
    }
}

module.exports = new ProfileService();
