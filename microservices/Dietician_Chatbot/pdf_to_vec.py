from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import os

pdfs = [
    "439608483-Ayurvedic-Diet-Plan.pdf",
    "782019141-Vata-Pitta-Dietary-Guidelines-and-Food-Chart.pdf",
    "357276522-Ayurvedic-Diet-and-Foodlists-3-Doshas.pdf"
]

docs = []

print("Loading PDFs...")

for pdf in pdfs:
    print(f"Processing {pdf}")
    if not os.path.exists(pdf):
        print(f"{pdf} not found")
        continue

    loader = PyPDFLoader(pdf)
    pages = loader.load()
    print(f"Loaded {len(pages)} pages from {pdf}")
    docs.extend(pages)

print(f"Total pages loaded: {len(docs)}")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100
)

chunks = splitter.split_documents(docs)
print(f"Created {len(chunks)} chunks")

print("Loading embedding model...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

texts = [c.page_content for c in chunks]

print("Generating embeddings...")
embeddings = embed_model.encode(texts)

dimension = embeddings.shape[1]

print("Creating FAISS index...")
index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings))

faiss.write_index(index, "ayurveda_index.faiss")

print("Vector DB created successfully!")


import pickle

with open("chunks.pkl", "wb") as f:
    pickle.dump(chunks, f)

