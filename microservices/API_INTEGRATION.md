Ayurvedic Intelligence API - Integration Guide
Version: 1.0.0
Base URL: http://54.226.87.3:8000
Status: Live (Production)

1. Overview
This API provides clinical-grade Ayurvedic food analysis by combining computer vision (InceptionV3) with generative AI (Gemini). It identifies food from images and evaluates its suitability based on Ayurvedic principles (Dosha, Guna, Virya, Vipaka).

2. Authentication
Currently, the API is open for internal integration. No API key is required in the headers.

3. Endpoint: Analyze Food
Request
URL: /analyze
Method: POST
Content-Type: multipart/form-data
Parameters
Field	Type	Required	Description
file
File	Yes	Image of the food (JPG/PNG). Max size 10MB.
user_id	String	No	Unique User ID (e.g., "u123") to fetch specific Pakriti profile. Defaults to standard profile if omitted.
Response Schema
The API returns a JSON object with the following structure:

json
{
  "food_detected": "string (e.g., 'burger')",
  "nutrition": {
    "serving_energy_kcal": "float",
    "serving_protein_g": "float",
    "serving_carbs_g": "float",
    "serving_fat_g": "float"
  },
  "dosha_analysis": {
    "is_suitable": "boolean",
    "impact": "string (Detailed impact on Vata/Pitta/Kapha)",
    "why": "string (Explanation based on Guna/Virya/Vipaka)"
  },
  "health_impact": {
    "sleep_effect": "string",
    "stress_effect": "string",
    "activity_impact": "string"
  },
  "viruddha_alert": {
    "risk": "boolean",
    "reason": "string (Explanation of incompatible combinations)"
  },
  "ayurvedic_recommendation": "string (Clinical advice)",
  "best_time_to_consume": "string (e.g., 'Lunch only')"
}
4. Integration Code Examples
Python (Requests)
python
import requests
url = "http://54.226.87.3:8000/analyze"
file_path = "path/to/food.jpg"
try:
    with open(file_path, "rb") as image_file:
        # Define optional user context
        payload = {"user_id": "u123"}
        files = {"file": image_file}
        
        response = requests.post(url, data=payload, files=files)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Detected: {data['food_detected']}")
            print(f"Recommendation: {data['ayurvedic_recommendation']}")
        else:
            print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"Connection failed: {str(e)}")
Node.js (Axios)
javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
async function analyzeFood() {
  const form = new FormData();
  form.append('file', fs.createReadStream('food.jpg'));
  form.append('user_id', 'u123');
  try {
    const response = await axios.post('http://54.226.87.3:8000/analyze', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error('API Error:', error.message);
  }
}
analyzeFood();
cURL (Terminal)
bash
curl -X POST \
  http://54.226.87.3:8000/analyze \
  -F "file=@/path/to/your/image.jpg" \
  -F "user_id=u123"
5. Error Codes
Code	Meaning	Action
200	Success	Parse JSON body.
422	Validation Error	Check if image file is valid and parameters are correct.
500	Server Error	Internal processing failed (Context/Gemini issue). Retry request.