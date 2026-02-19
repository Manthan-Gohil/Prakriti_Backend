from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle
import os

# ── Lazy-load heavy models to reduce startup memory ──
_index = None
_embed_model = None
_chunks = None


def _load():
    global _index, _embed_model, _chunks
    if _index is None:
        base = os.path.dirname(os.path.abspath(__file__))
        _index = faiss.read_index(os.path.join(base, "ayurveda_index.faiss"))
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
        with open(os.path.join(base, "chunks.pkl"), "rb") as f:
            _chunks = pickle.load(f)


def retrieve_context(query, top_k=3):
    _load()
    query_embedding = _embed_model.encode([query])
    D, I = _index.search(np.array(query_embedding), top_k)

    results = []
    for idx in I[0]:
        results.append(_chunks[idx].page_content)

    return "\n\n".join(results)
