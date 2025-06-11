import json
import pickle
from sentence_transformers import SentenceTransformer
import numpy as np

print("Loading sentence transformer model...")
# Using a lightweight, high-performance model
model = SentenceTransformer('all-MiniLM-L6-v2') 

print("Loading product data...")
with open('data/products.json', 'r') as f:
    products = json.load(f)

# We'll use a combination of name and description for richer context
product_texts = [f"{p['name']}: {p['description']}" for p in products]
product_ids = [p['id'] for p in products]

print("Generating embeddings for all products...")
embeddings = model.encode(product_texts, show_progress_bar=True)
print(f"Embeddings generated with shape: {embeddings.shape}")

# Store embeddings in a dictionary for easy lookup by product_id
embedding_data = {
    "ids": product_ids,
    "embeddings": embeddings
}

# Save the data using pickle for efficiency with numpy arrays
with open('data/product_embeddings.pkl', 'wb') as f:
    pickle.dump(embedding_data, f)

print("Product embeddings have been generated and saved to data/product_embeddings.pkl")