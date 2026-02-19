"""
Prakriti Prediction Script
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

        with open(os.path.join(model_dir, "best_model.pkl"), "rb") as f:
            model = pickle.load(f)
        with open(os.path.join(model_dir, "label_encoder.pkl"), "rb") as f:
            le = pickle.load(f)

        # Map frontend snake_case keys to model's expected column names
        field_map = {
            "body_size": "Body Size",
            "body_weight_tendency": "Body Weight",
            "height": "Height",
            "bone_structure": "Bone Structure",
            "complexion": "Complexion",
            "skin_type": "General feel of skin",
            "skin_texture": "Texture of Skin",
            "hair_color": "Hair Color",
            "hair_appearance": "Appearance of Hair",
            "face_shape": "Shape of face",
            "eyes": "Eyes",
            "eyelashes": "Eyelashes",
            "blinking_pattern": "Blinking of Eyes",
            "cheeks": "Cheeks",
            "nose_shape": "Nose",
            "teeth_structure": "Teeth and gums",
            "lips": "Lips",
            "nails": "Nails",
            "appetite": "Appetite",
            "taste_preference": "Liking tastes",
        }

        model_input = {}
        for frontend_key, model_key in field_map.items():
            value = input_json.get(frontend_key, "")
            if not value:
                print(
                    json.dumps(
                        {
                            "success": False,
                            "error": f"Missing required field: {frontend_key}",
                        }
                    )
                )
                sys.exit(0)
            model_input[model_key] = value

        df = pd.DataFrame([model_input])
        prediction_idx = model.predict(df)
        prediction_label = le.inverse_transform(prediction_idx)

        result = {
            "success": True,
            "prakritiType": prediction_label[0],
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(0)


if __name__ == "__main__":
    main()
