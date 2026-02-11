import os
import json
import tempfile
import time
from firebase_functions import https_fn, storage_fn, options
from firebase_admin import firestore, storage, initialize_app
from google import genai
from google.genai import types
from .config import AIConfig

# Initialize Firebase if not already done
try:
    initialize_app()
except ValueError:
    pass

@storage_fn.on_object_finalized(
    region=AIConfig.LOCATION,
    memory=options.MemoryOption.GB_1,
    timeout_sec=540,
    cpu=1,
    bucket=os.environ.get("FIREBASE_STORAGE_BUCKET") # Dynamic bucket
)
def process_catalogue_upload(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Triggered when a file is uploaded to the catalogue bucket.
    Extracts product data using Gemini and stores it in Firestore 'product_drafts'.
    """
    bucket_name = event.data.bucket
    file_path = event.data.name
    
    # Only process files in the 'catalogues/' path
    if not file_path.startswith("catalogues/"):
        print(f"Skipping file {file_path} (not in catalogues/)")
        return

    db = firestore.client()
    bucket = storage.bucket(bucket_name)

    print(f"Processing catalogue file: {file_path}")

    # Initialize Gemini Client
    client = genai.Client(
        vertexai=True, 
        project=AIConfig.PROJECT_ID, 
        location=AIConfig.LOCATION
    )

    gcs_uri = f"gs://{bucket_name}/{file_path}"
    blob = bucket.blob(file_path)
    content_type = event.data.content_type

    # 1. Extract Product Data using Gemini Long Context
    # We use Long Context (passing the file URI directly) because we want ALL products.
    # RAG (FileSearch) is better for querying specific info, not bulk extraction.
    
    prompt = """
    You are an expert e-commerce data entry specialist.
    Analyze this catalogue file and extract ALL products found.
    For each product, return a JSON object with:
    - title: Product name
    - description: Detailed description (include material, care instructions if available)
    - price: Price as a number (if found, else null)
    - currency: Currency code (e.g., EUR, USD)
    - sku: SKU or identifier (if found, else null)
    - tags: List of relevant category tags (e.g. 'Men', 'Summer', 'Casual', 'Shirt')
    - options: List of variants if available (e.g. sizes, colors)
    
    Return the response as a JSON object with a key "products" containing the list.
    """
    
    try:
        response = client.models.generate_content(
            model=AIConfig.MODEL_NAME,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(file_uri=gcs_uri, mime_type=content_type),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json", 
                temperature=0.1
            )
        )
        products_data = json.loads(response.text)
        if isinstance(products_data, dict):
             products_data = products_data.get("products", [])
        
    except Exception as e:
        print(f"Gemini Extraction Failed: {e}")
        # Log failure logic here?
        return

    print(f"Extracted {len(products_data)} products.")

    # 2. Store in Firestore 'product_drafts'
    batch = db.batch()
    
    for product in products_data:
        # Create Document Ref in DRAFTS
        doc_ref = db.collection("product_drafts").document()
        
        # Generate embedding for the draft (for Agent searching later)
        text_to_embed = f"{product.get('title', '')} {product.get('description', '')} {' '.join(product.get('tags', []))}"
        
        try:
            embedding_resp = client.models.embed_content(
                model="text-embedding-004",
                contents=text_to_embed
            )
            embedding_vector = embedding_resp.embeddings[0].values
        except Exception:
            embedding_vector = None # Proceed even if embedding fails

        product_draft = {
            "title": product.get("title"),
            "description": product.get("description"),
            "price": product.get("price"),
            "currency": product.get("currency", "EUR"),
            "sku": product.get("sku"),
            "tags": product.get("tags", []),
            "options": product.get("options", []),
            
            # Metadata
            "source_file": file_path,
            "source_gcs_uri": gcs_uri,
            "status": "pending_review", # <--- Key Change
            "created_at": firestore.SERVER_TIMESTAMP,
            "ai_confidence": 0.85, # Placeholder or could be derived
            
            # Search
            "embedding_field": firestore.Vector(embedding_vector) if embedding_vector else None
        }
        
        batch.set(doc_ref, product_draft)
        
        if len(batch) >= 400:
            batch.commit()
            batch = db.batch()
    
    if len(batch) > 0:
        batch.commit()

    print("Catalogue processing complete. Drafts created.")
