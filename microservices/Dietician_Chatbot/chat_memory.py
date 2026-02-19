chat_sessions = {}

def get_history(user_id):
    return chat_sessions.get(user_id, [])

def save_message(user_id, role, message):
    if user_id not in chat_sessions:
        chat_sessions[user_id] = []

    chat_sessions[user_id].append({
        "role": role,
        "content": message
    })
