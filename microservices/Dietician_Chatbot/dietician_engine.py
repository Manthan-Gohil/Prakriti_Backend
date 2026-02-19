import json
from rag_retriever import retrieve_context
from llm_engine import ask_llm

rules = json.load(open("ayurveda_rules.json"))

SYSTEM_PROMPT = """
You are an Ayurvedic dietician.

Rules:
- Only answer diet, dosha, and food questions
- Use Ayurveda context provided
- Never give medical advice
- Follow structured format

Response format:

Suitability:
Dosha Impact:
Digestive Effect:
Season Advice:
Recommendation:
"""


def diet_query(dosha, food, goal):

    rule_info = rules.get(dosha, {})

    context = retrieve_context(f"Ayurveda advice for {food}")

    prompt = f"""
{SYSTEM_PROMPT}

User Dosha: {dosha}
Goal: {goal}
Food: {food}

Rule Data:
{rule_info}

Ayurveda Knowledge:
{context}
"""

    answer = ask_llm(prompt)

    return answer
