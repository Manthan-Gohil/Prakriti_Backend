const { spawn } = require('child_process');
const path = require('path');

const MODEL_DIR = path.join(__dirname, '../../trained_model');

/**
 * Run a Python prediction script and return parsed JSON result.
 * @param {string} scriptName - Python script filename (e.g., 'predict_prakriti.py')
 * @param {object} inputData  - Input data to send as JSON via stdin
 * @returns {Promise<object>} - Parsed prediction result
 */
function runPythonPrediction(scriptName, inputData) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(MODEL_DIR, scriptName);
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        const proc = spawn(pythonCmd, [scriptPath], {
            cwd: MODEL_DIR,
            env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (stdout.trim()) {
                try {
                    const result = JSON.parse(stdout.trim());
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Prediction failed'));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Python output: ${stdout}`));
                }
            } else {
                reject(new Error(`Python script error (code ${code}): ${stderr || 'No output'}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start Python: ${err.message}. Ensure Python 3 is installed with pandas, scikit-learn, xgboost, catboost, joblib.`));
        });

        // Send input as JSON via stdin
        proc.stdin.write(JSON.stringify(inputData));
        proc.stdin.end();
    });
}

/**
 * Predict Prakriti (body constitution) from physical traits.
 */
async function predictPrakriti(traitData) {
    return runPythonPrediction('predict_prakriti.py', traitData);
}

/**
 * Predict Dosha Imbalance from symptoms & lifestyle data.
 */
async function predictDoshaImbalance(doshaData) {
    return runPythonPrediction('predict_dosha.py', doshaData);
}

module.exports = { predictPrakriti, predictDoshaImbalance };
