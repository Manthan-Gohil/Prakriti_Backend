/**
 * Rule-based Prakriti Assessment Engine
 * Calculates dosha scores and determines Prakriti type
 */

/**
 * Calculate dosha scores from assessment responses
 */
const calculateDoshaScores = (responses) => {
    let vataScore = 0;
    let pittaScore = 0;
    let kaphaScore = 0;
    let totalWeightage = 0;

    for (const response of responses) {
        const weightage = response.option?.weightage || 1;
        totalWeightage += weightage;

        switch (response.option?.doshaType) {
            case 'VATA':
                vataScore += weightage;
                break;
            case 'PITTA':
                pittaScore += weightage;
                break;
            case 'KAPHA':
                kaphaScore += weightage;
                break;
        }
    }

    // Normalize to 0-100 scale
    if (totalWeightage > 0) {
        vataScore = parseFloat(((vataScore / totalWeightage) * 100).toFixed(2));
        pittaScore = parseFloat(((pittaScore / totalWeightage) * 100).toFixed(2));
        kaphaScore = parseFloat(((kaphaScore / totalWeightage) * 100).toFixed(2));
    }

    return { vataScore, pittaScore, kaphaScore };
};

/**
 * Calculate category-wise sub-scores
 */
const calculateSubScores = (responses) => {
    const categories = {
        BODY_STRUCTURE: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        SKIN_HAIR_NAILS: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        METABOLISM_DIGESTION: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        APPETITE_TASTE: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        SLEEP_PATTERNS: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        MENTAL_EMOTIONAL: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        STRESS_RESPONSE: { vata: 0, pitta: 0, kapha: 0, total: 0 },
        ENERGY_STAMINA: { vata: 0, pitta: 0, kapha: 0, total: 0 },
    };

    for (const response of responses) {
        const cat = response.question?.category;
        if (cat && categories[cat]) {
            const w = response.option?.weightage || 1;
            categories[cat].total += w;
            const dosha = response.option?.doshaType?.toLowerCase();
            if (dosha && categories[cat][dosha] !== undefined) {
                categories[cat][dosha] += w;
            }
        }
    }

    const subScores = {};
    for (const [cat, scores] of Object.entries(categories)) {
        if (scores.total > 0) {
            subScores[cat] = {
                vata: parseFloat(((scores.vata / scores.total) * 100).toFixed(2)),
                pitta: parseFloat(((scores.pitta / scores.total) * 100).toFixed(2)),
                kapha: parseFloat(((scores.kapha / scores.total) * 100).toFixed(2)),
            };
        }
    }

    return subScores;
};

/**
 * Determine primary and secondary dosha
 */
const determineDoshaType = (vataScore, pittaScore, kaphaScore) => {
    const scores = [
        { type: 'VATA', score: vataScore },
        { type: 'PITTA', score: pittaScore },
        { type: 'KAPHA', score: kaphaScore },
    ].sort((a, b) => b.score - a.score);

    const primaryDosha = scores[0].type;
    const secondaryDosha = scores[1].type;

    // If difference between top two is < 10%, it's a dual type
    const diff = scores[0].score - scores[1].score;
    let prakritiType;

    if (diff < 5 && scores[0].score - scores[2].score < 10) {
        // Tridoshic
        prakritiType = 'Tridoshic';
    } else if (diff < 10) {
        // Dual dosha
        prakritiType = `${capitalize(primaryDosha)}-${capitalize(secondaryDosha)}`;
    } else {
        // Single dominant dosha
        prakritiType = capitalize(primaryDosha);
    }

    return { primaryDosha, secondaryDosha, prakritiType };
};

/**
 * Determine Agni type based on dosha
 */
const determineAgniType = (primaryDosha) => {
    const agniMap = {
        VATA: 'VISHAMA',
        PITTA: 'TIKSHNA',
        KAPHA: 'MANDA',
    };
    return agniMap[primaryDosha] || 'SAMA';
};

/**
 * Get dominant gunas based on dosha
 */
const getDominantGunas = (primaryDosha) => {
    const gunaMap = {
        VATA: ['Dry', 'Light', 'Cold', 'Rough', 'Subtle', 'Mobile'],
        PITTA: ['Hot', 'Sharp', 'Light', 'Liquid', 'Oily', 'Spreading'],
        KAPHA: ['Heavy', 'Slow', 'Cold', 'Oily', 'Smooth', 'Dense'],
    };
    return gunaMap[primaryDosha] || [];
};

/**
 * Check for dosha imbalance (Vikriti)
 */
const checkImbalance = (prakritiScores, currentScores) => {
    const threshold = 15; // If current deviates >15% from prakriti
    const imbalances = [];

    const doshas = ['vata', 'pitta', 'kapha'];
    for (const dosha of doshas) {
        const diff = currentScores[dosha] - prakritiScores[dosha];
        if (Math.abs(diff) > threshold) {
            imbalances.push({
                dosha: dosha.toUpperCase(),
                direction: diff > 0 ? 'EXCESS' : 'DEFICIENT',
                deviation: parseFloat(Math.abs(diff).toFixed(2)),
            });
        }
    }

    return {
        isImbalanced: imbalances.length > 0,
        imbalances,
        balancingActions: imbalances.map((i) => getBalancingActions(i.dosha, i.direction)),
    };
};

/**
 * Get balancing actions for dosha imbalance
 */
const getBalancingActions = (dosha, direction) => {
    const actions = {
        VATA_EXCESS: {
            diet: ['Warm, cooked foods', 'Sweet, sour, salty tastes', 'Ghee and warm oils', 'Avoid raw/cold foods'],
            lifestyle: ['Regular routine', 'Warm oil massage (Abhyanga)', 'Early bedtime', 'Gentle yoga'],
            herbs: ['Ashwagandha', 'Shatavari', 'Bala', 'Dashmool'],
        },
        PITTA_EXCESS: {
            diet: ['Cool, refreshing foods', 'Sweet, bitter, astringent tastes', 'Coconut oil', 'Avoid spicy/fried foods'],
            lifestyle: ['Moonlight walks', 'Cool showers', 'Moderate exercise', 'Meditation'],
            herbs: ['Amalaki', 'Brahmi', 'Neem', 'Guduchi'],
        },
        KAPHA_EXCESS: {
            diet: ['Light, warm foods', 'Pungent, bitter, astringent tastes', 'Honey', 'Avoid heavy/oily foods'],
            lifestyle: ['Vigorous exercise', 'Dry brushing', 'Wake early', 'Variety in routine'],
            herbs: ['Trikatu', 'Guggulu', 'Punarnava', 'Tulsi'],
        },
    };

    return actions[`${dosha}_${direction}`] || { diet: [], lifestyle: [], herbs: [] };
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Full Prakriti analysis
 */
const analyzePrakriti = (responses) => {
    const { vataScore, pittaScore, kaphaScore } = calculateDoshaScores(responses);
    const { primaryDosha, secondaryDosha, prakritiType } = determineDoshaType(vataScore, pittaScore, kaphaScore);
    const subScores = calculateSubScores(responses);
    const agniType = determineAgniType(primaryDosha);
    const dominantGunas = getDominantGunas(primaryDosha);

    // Map sub-scores to specific fields
    const physicalCategories = ['BODY_STRUCTURE', 'SKIN_HAIR_NAILS'];
    const mentalCategories = ['MENTAL_EMOTIONAL', 'STRESS_RESPONSE'];
    const digestiveCategories = ['METABOLISM_DIGESTION', 'APPETITE_TASTE'];

    const avgSubScore = (cats, doshaKey) => {
        const validCats = cats.filter((c) => subScores[c]);
        if (validCats.length === 0) return null;
        const sum = validCats.reduce((acc, c) => acc + subScores[c][doshaKey], 0);
        return parseFloat((sum / validCats.length).toFixed(2));
    };

    return {
        vataScore,
        pittaScore,
        kaphaScore,
        primaryDosha,
        secondaryDosha,
        prakritiType,
        agniType,
        dominantGunas,
        subScores,
        physicalVata: avgSubScore(physicalCategories, 'vata'),
        physicalPitta: avgSubScore(physicalCategories, 'pitta'),
        physicalKapha: avgSubScore(physicalCategories, 'kapha'),
        mentalVata: avgSubScore(mentalCategories, 'vata'),
        mentalPitta: avgSubScore(mentalCategories, 'pitta'),
        mentalKapha: avgSubScore(mentalCategories, 'kapha'),
        digestiveVata: avgSubScore(digestiveCategories, 'vata'),
        digestivePitta: avgSubScore(digestiveCategories, 'pitta'),
        digestiveKapha: avgSubScore(digestiveCategories, 'kapha'),
    };
};

module.exports = {
    calculateDoshaScores,
    calculateSubScores,
    determineDoshaType,
    determineAgniType,
    getDominantGunas,
    checkImbalance,
    getBalancingActions,
    analyzePrakriti,
};
