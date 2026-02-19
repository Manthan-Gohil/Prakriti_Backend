import json

data = {
    "Vata": {},
    "Pitta": {},
    "Kapha": {}
}

current_dosha = None
current_category = None
current_mode = None

CATEGORIES = [
    "Fruits","Vegetables","Grains","Legumes","Dairy","Animal Foods",
    "Condiments","Nuts","Seeds","Oils","Beverages","Herbal Teas",
    "Spices","Sweeteners","Food Supplements"
]

DOSHAS = ["Vata", "Pitta", "Kapha"]

with open("data.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

for raw_line in lines:
    line = raw_line.strip()

    if not line:
        continue

    # detect dosha
    if line in DOSHAS:
        current_dosha = line
        continue

    # detect category
    if line in CATEGORIES:
        current_category = line

        # ensure category exists for all doshas
        for d in DOSHAS:
            if current_category not in data[d]:
                data[d][current_category] = {"avoid": [], "favor": []}

        continue

    # detect mode
    if line.lower() == "avoid":
        current_mode = "avoid"
        continue

    if line.lower() == "favor":
        current_mode = "favor"
        continue

    # add items safely
    if current_dosha and current_category and current_mode:
        data[current_dosha][current_category][current_mode].append(line)

with open("ayurveda_rules.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("JSON created successfully!")
