import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from chatbot_engine import chat
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Prakriti Dietician Chatbot", version="1.0.0")

# CORS — allow the Express backend (and any configured origins) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGIN", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "dietician-chatbot"}


@app.post("/chat")
def chat_api(user: dict):
    user_id = user["user_id"]
    dosha = user["dosha"]
    message = user["message"]

    response = chat(user_id, dosha, message)

    return {"response": response}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
