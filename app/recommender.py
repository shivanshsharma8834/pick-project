import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from .data_loader import load_users, load_products

# Load pre-computed embeddings and product data once when the module is imported
with open('data/product_embeddings.pkl', 'rb') as f:
    embedding_data = pickle.load(f)

product_embeddings = embedding_data['embeddings']
product_ids = embedding_data['ids']
id_to_index = {pid: i for i, pid in enumerate(product_ids)}

all_products = load_products()
products_dict = {p['id']: p for p in all_products}

def get_recommendations(user_id: int, top_n: int = 3):
    """
    Generates personalized product recommendations for a user.
    """
    users = load_users()
    user = next((u for u in users if u['id'] == user_id), None)
    
    if not user:
        return {"error": "User not found"}

    # Identify seed products from user behavior
    seed_product_ids = []
    if user.get('last_viewed_product_id'):
        seed_product_ids.append(user['last_viewed_product_id'])
        #tweaked up part to include last viewed product
    # if user.get('last_purchased_product_id'):
    #     seed_product_ids.append(user['last_purchased_product_id'])
    # Use the most recent purchase as a seed, if available

    if user.get('purchase_history'):
        # Get the most recent purchase based on date (or just the last one in the list for simplicity)
        most_recent_purchase = user['purchase_history'][-1]
        seed_product_ids.append(most_recent_purchase['product_id'])

    if not seed_product_ids:
        # If user has no history, return some popular or random items (future improvement)
        return {"message": "No user history found. Showing popular items.", "recommendations": all_products[:top_n]}

    # Get embeddings for seed products
    seed_indices = [id_to_index[pid] for pid in seed_product_ids if pid in id_to_index]
    if not seed_indices:
        return {"error": "Seed products not found in embedding data."}
        
    seed_vectors = product_embeddings[seed_indices]

    # Calculate cosine similarity between seed products and all other products
    # We take the average similarity if there are multiple seed products
    sim_scores = cosine_similarity(seed_vectors, product_embeddings)
    avg_sim_scores = sim_scores.mean(axis=0)

    # Get indices of top N most similar products
    # We add 1 to top_n because the most similar items will be the seeds themselves
    # then filter them out later.
    num_recommendations = top_n + len(seed_product_ids)
    top_indices = np.argsort(avg_sim_scores)[-num_recommendations:][::-1]

    # Filter out products the user has already interacted with
    recommended_ids = []
    for idx in top_indices:
        p_id = product_ids[idx]
        if p_id not in seed_product_ids:
            recommended_ids.append(p_id)
        if len(recommended_ids) == top_n:
            break
            
    # Get full product details for the recommendations
    recommendations = [products_dict[pid] for pid in recommended_ids]
    
    return {"user": user, "recommendations": recommendations}