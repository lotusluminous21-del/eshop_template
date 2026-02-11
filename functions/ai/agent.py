from firebase_functions import https_fn, options
from firebase_admin import firestore
from google import genai
from google.genai import types
from .config import AIConfig
import numpy as np

# Advisor Agent
# Uses Vector Search (RAG) to find relevant products in the catalogue
# and uses Gemini to reason about bundling them.

@https_fn.on_call(
    region=AIConfig.LOCATION,
    memory=options.MemoryOption.MB_512,
)
def suggest_bundles(req: https_fn.CallableRequest) -> dict:
    """
    Suggests a bundle of products based on a seed product or a user need.
    """
    data = req.data
    product_title = data.get("productTitle") # e.g. "Red Wall Paint"
    user_need = data.get("userNeed") # e.g. "I want to paint my living room"
    
    if not product_title and not user_need:
        return {"error": "Provide productTitle or userNeed"}

    db = firestore.client()
    client = genai.Client(
        vertexai=True, 
        project=AIConfig.PROJECT_ID, 
        location=AIConfig.LOCATION
    )

    # 1. Search Logic (The "FileSearch" equivalent using our Vector Store)
    # We query the 'product_drafts' (which act as our catalogue memory)
    # matching the semantic need.
    
    query_text = user_need if user_need else f"Accessories and complementary items for {product_title}"
    
    # Generate embedding for the query
    embedding_resp = client.models.embed_content(
        model="text-embedding-004",
        contents=query_text
    )
    query_vector = embedding_resp.embeddings[0].values
    
    # Vector Search in Firestore
    # User requested to ONLY search Live products (the actual shopify backend mirror)
    collection = db.collection("products_live")
    
    # Require a vector index on 'embedding_field'
    vector_query = collection.find_nearest(
        vector_field="embedding_field",
        query_vector=query_vector,
        distance_measure=firestore.DistanceMeasure.COSINE,
        limit=10, # Fetch top 10 candidates
        distance_result_field="vector_distance"
    )
    
    docs = vector_query.get()
    candidates = []
    for doc in docs:
        d = doc.to_dict()
        # Remove vector to save tokens
        if "embedding_field" in d:
            del d["embedding_field"]
        candidates.append(d)
        
    # 2. Reasoning (The Agent)
    # We feed the candidates to Gemini and ask it to form a logical bundle.
    
    # Prompt for the Bundler Agent
    prompt = f"""
    You are an expert Personal Shopper and Bundle Advisor.
    User Need: "{query_text}"
    
    Here are the available products from our catalogue that match this need (retrieved via RAG):
    {candidates}
    
    Task:
    1. Select the best 3-5 items that form a COMPLETE usage set (e.g. Paint + Brush + Tape).
    2. Explain WHY they go together.
    3. Return a JSON with:
       - bundle_title: Catchy name for the set
       - items: List of selected product titles and their prices
       - total_price: Sum of prices
       - reason: Explanation
       
    If no good bundle can be made, explain missing items.
    """
    
    response = client.models.generate_content(
        model=AIConfig.MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.3
        )
    )
    
    return {"recommendation": response.text}
