import json
import os
from rag_retriever import retrieve_context
from llm_engine import ask_llm
from chat_memory import get_history, save_message

_base = os.path.dirname(os.path.abspath(__file__))
rules = json.load(open(os.path.join(_base, "ayurveda_rules.json")))

SYSTEM_PROMPT = """
You are an Ayurvedic dietician chatbot.

You behave like ChatGPT but ONLY for:
- food
- diet
- dosha
- digestion
- prakriti
- lifestyle

Rules:
- always remember user's dosha
- always recommend alternatives
- if food is avoid, suggest better options
- maintain conversational tone
- answer should be concise and apt
- provide reasoning in only one or two lines

"""


def chat(user_id, dosha, message):

    history = get_history(user_id)

    context = retrieve_context(message)

    rule_data = rules.get(dosha, {})

    full_prompt = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # add chat history
    full_prompt.extend(history)

    # add new user message
    full_prompt.append(
        {
            "role": "user",
            "content": f"""
User Dosha: {dosha}

Ayurveda rules:
{rule_data}

Knowledge context:
{context}

User question:
{message}
""",
        }
    )

    response = ask_llm(full_prompt)

    save_message(user_id, "user", message)
    save_message(user_id, "assistant", response)

    return response
