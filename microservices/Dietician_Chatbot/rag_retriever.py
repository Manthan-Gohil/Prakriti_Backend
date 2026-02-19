from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle

# load vector DB
index = faiss.read_index("ayurveda_index.faiss")

# load embedding model
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# load stored chunks
with open("chunks.pkl", "rb") as f:
    chunks = pickle.load(f)


def retrieve_context(query, top_k=3):
    query_embedding = embed_model.encode([query])
    D, I = index.search(np.array(query_embedding), top_k)

    results = []
    for idx in I[0]:
        results.append(chunks[idx].page_content)

    return "\n\n".join(results)
