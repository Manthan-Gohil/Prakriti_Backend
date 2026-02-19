import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


model = genai.GenerativeModel("gemini-2.5-flash")


def ask_llm(prompt):
    try:
        if isinstance(prompt, list):
            system_instruction = None
            contents = []
            for msg in prompt:
                role = msg.get("role")
                content = msg.get("content")
                if role == "system":
                    system_instruction = content
                elif role == "user":
                    contents.append({"role": "user", "parts": [content]})
                elif role == "assistant":
                    contents.append({"role": "model", "parts": [content]})

            config = {"max_output_tokens": 1000}
            if system_instruction:
                # instantiate with system instruction
                local_model = genai.GenerativeModel(
                    "gemini-2.5-flash", system_instruction=system_instruction
                )
                response = local_model.generate_content(
                    contents, generation_config=config
                )
            else:
                response = model.generate_content(contents, generation_config=config)
        else:
            response = model.generate_content(
                prompt, generation_config={"max_output_tokens": 150}
            )

        return response.text

    except Exception as e:
        print(f"Error in ask_llm: {e}")
        return "I am sorry, I am unable to answer right now due to an internal error."
