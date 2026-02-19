const prisma = require('../config/database');
const { calculateBmi } = require('../utils/helpers');
const { predictPrakriti, predictDoshaImbalance } = require('./prediction.service');

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

    async saveDoshaTraits(userId, data) {
        const fieldMap = {
            current_symptoms: 'currentSymptoms',
            symptom_duration: 'symptomDuration',
            symptom_severity: 'symptomSeverity',
            medical_history: 'medicalHistory',
            current_medications: 'currentMedications',
            appetite_level: 'appetiteLevel',
            digestion_quality: 'digestionQuality',
            bowel_pattern: 'bowelPattern',
            gas_bloating: 'gasBloating',
            acidity_burning: 'acidityBurning',
            sleep_quality: 'sleepQuality',
            sleep_duration: 'sleepDuration',
            daytime_energy: 'daytimeEnergy',
            mental_state: 'mentalState',
            stress_level: 'stressLevel',
            physical_activity_level: 'physicalActivityLevel',
            daily_routine_consistency: 'dailyRoutineConsistency',
            work_type: 'workType',
            travel_frequency: 'travelFrequency',
            diet_type: 'dietType',
            food_quality: 'foodQuality',
            taste_dominance: 'tasteDominance',
            meal_timing_regular: 'mealTimingRegular',
            hydration_level: 'hydrationLevel',
            caffeine_intake: 'caffeineIntakeTrait',
            climate_exposure: 'climateExposure',
            season: 'season',
            pollution_exposure: 'pollutionExposure',
            screen_exposure: 'screenExposure',
            age_group: 'ageGroup',
            gender: 'genderTrait',
            occupation: 'occupation',
            cultural_diet_preference: 'culturalDietPreference',
        };

        const mapped = {};
        for (const [key, dbField] of Object.entries(fieldMap)) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                mapped[dbField] = data[key];
            }
        }

        if (Object.keys(mapped).length === 0) {
            const err = new Error('At least one dosha trait field is required.');
            err.status = 400;
            throw err;
        }

        const doshaTraits = await prisma.doshaTraits.upsert({
            where: { userId },
            create: { userId, ...mapped },
            update: mapped,
        });

        return doshaTraits;
    }

    async getDoshaTraits(userId) {
        const traits = await prisma.doshaTraits.findUnique({ where: { userId } });
        if (!traits) {
            const err = new Error('Dosha traits not found. Please complete the form.');
            err.status = 404;
            throw err;
        }
        return traits;
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

    /**
     * Run Prakriti ML prediction on saved traits and store result.
     */
    async runPrakritiPrediction(userId, inputData) {
        const result = await predictPrakriti(inputData);

        const prediction = await prisma.prakritiPrediction.create({
            data: {
                userId,
                inputData,
                prakritiType: result.prakritiType,
            },
        });

        // Also update DoshaProfile with prakriti result
        await prisma.doshaProfile.upsert({
            where: { userId },
            create: {
                userId,
                prakritiType: result.prakritiType,
                lastAssessedAt: new Date(),
            },
            update: {
                prakritiType: result.prakritiType,
                lastAssessedAt: new Date(),
            },
        });

        return { prediction, prakritiType: result.prakritiType };
    }

    /**
     * Run Dosha Imbalance ML prediction on saved traits and store result.
     */
    async runDoshaPrediction(userId, inputData) {
        const result = await predictDoshaImbalance(inputData);

        const prediction = await prisma.doshaPrediction.create({
            data: {
                userId,
                inputData,
                imbalances: result.imbalances,
                imbalanceType: result.imbalanceType,
            },
        });

        // Also update DoshaProfile with vikriti (imbalance) result
        await prisma.doshaProfile.upsert({
            where: { userId },
            create: {
                userId,
                vikritiType: result.imbalanceType,
                isImbalanced: result.imbalances.length > 0,
                lastAssessedAt: new Date(),
            },
            update: {
                vikritiType: result.imbalanceType,
                isImbalanced: result.imbalances.length > 0,
                lastAssessedAt: new Date(),
            },
        });

        return { prediction, imbalances: result.imbalances, imbalanceType: result.imbalanceType };
    }

    /**
     * Get latest prediction results for a user.
     */
    async getPredictions(userId) {
        const [latestPrakriti, latestDosha] = await Promise.all([
            prisma.prakritiPrediction.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.doshaPrediction.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return { prakritiPrediction: latestPrakriti, doshaPrediction: latestDosha };
    }

    /**
     * Get full history of Prakriti predictions for a user.
     */
    async getPrakritiHistory(userId) {
        const history = await prisma.prakritiPrediction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return history;
    }

    /**
     * Get full history of Dosha imbalance predictions for a user.
     */
    async getDoshaHistory(userId) {
        const history = await prisma.doshaPrediction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return history;
    }
}

module.exports = new ProfileService();
