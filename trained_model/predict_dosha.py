"""
Dosha Imbalance Prediction Script
Called from Node.js via child_process.
Reads JSON input from stdin, outputs JSON result to stdout.
"""

import sys
import json
import os
import pandas as pd
import pickle


def main():
    try:
        input_json = json.loads(sys.stdin.read())

        model_dir = os.path.dirname(os.path.abspath(__file__))

        with open(os.path.join(model_dir, "imbalance_model.pkl"), "rb") as f:
            model = pickle.load(f)
        with open(os.path.join(model_dir, "mlb_encoder.pkl"), "rb") as f:
            mlb = pickle.load(f)

        # Map frontend snake_case keys to model's expected column names
        # Text fields (free text, concatenated into Combined_Text)
        text_field_map = {
            "current_symptoms": "Symptoms",
            "medical_history": "Medical History",
            "digestion_quality": "Digestive Health",
            "mental_state": "Mental Emotional Status",
            "current_medications": "Disease History",
            "bowel_pattern": "Bio-Characteristics",
            "gas_bloating": "Family History",
        }

        # Categorical fields (must match training categories)
        cat_field_map = {
            "sleep_quality": "Sleep Patterns",
            "stress_level": "Stress Levels",
            "physical_activity_level": "Physical Activity Levels",
            "season": "Seasonal Variation",
            "age_group": "Age Group",
            "gender": "Gender",
            "work_type": "Occupation and Lifestyle",
            "cultural_diet_preference": "Cultural Preferences",
            "climate_exposure": "Environmental Factors",
        }

        model_input = {}

        # Map text fields
        for frontend_key, model_key in text_field_map.items():
            model_input[model_key] = input_json.get(frontend_key, "") or ""

        # Map categorical fields
        for frontend_key, model_key in cat_field_map.items():
            model_input[model_key] = input_json.get(frontend_key, "") or ""

        df = pd.DataFrame([model_input])

        # Build Combined_Text from text columns
        text_cols = [
            "Symptoms",
            "Medical History",
            "Digestive Health",
            "Mental Emotional Status",
            "Disease History",
            "Bio-Characteristics",
            "Family History",
        ]
        df["Combined_Text"] = df[text_cols].fillna("").agg(" ".join, axis=1)

        # Predict
        predictions = model.predict(df)
        predicted_labels = mlb.inverse_transform(predictions)

        imbalances = list(predicted_labels[0]) if predicted_labels[0] else []

        result = {
            "success": True,
            "imbalances": imbalances,
            "imbalanceType": "-".join(imbalances) if imbalances else "Balanced",
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(0)


if __name__ == "__main__":
    main()
