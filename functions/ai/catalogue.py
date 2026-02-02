import os
import json
import tempfile
from firebase_functions import https_fn, storage_fn, options
from firebase_admin import firestore, storage, initialize_app
from google import genai
from google.genai import types
import numpy as np

# Initialize Firebase if not already done
try:
    initialize_app()
except ValueError:
    pass

@storage_fn.on_object_finalized(
    region="europe-west1",
    memory=options.MemoryOption.MB_1024,
    timeout_sec=540,
    cpu=1
)
def process_catalogue_upload(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Triggered when a file is uploaded to the catalogue bucket.
    Extracts product data using Gemini and stores it in Firestore with vector embeddings.
    """
    bucket_name = event.data.bucket
    file_path = event.data.name
    
    # Only process files in the 'catalogues/' path
    if not file_path.startswith("catalogues/"):
        print(f"Skipping file {file_path} (not in catalogues/)")
        return

    db = firestore.client()
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(file_path)

    print(f"Processing catalogue file: {file_path}")

    # Initialize Gemini Client
    # Uses GOOGLE_APPLICATION_CREDENTIALS or api_key from env
    client = genai.Client(
        vertexai=True, 
        project=os.environ.get("GOOGLE_CLOUD_PROJECT"), 
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    )

    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file_path)[1]) as temp_file:
        blob.download_to_filename(temp_file.name)
        
        # Upload to Gemini File API (or verify if we can pass bytes directly for some models)
        # For simplicity with Vertex AI, we often use Part.from_data or Part.from_uri if in GCS
        # Since it's already in GCS, we can try using the GCS URI directly if permissions allow.
        # However, Storage triggers usually mean we can access the file. 
        # Let's read the content for smaller files or use the GCS URI for larger ones.
        # For this template, we'll read small files to keep it simple, or use GCS URI.
        
        gcs_uri = f"gs://{bucket_name}/{file_path}"
        
        # 1. Extract Product Data using Gemini 1.5 Flash
        prompt = """
        You are an expert e-commerce data entry specialist.
        Analyze this catalogue file and extract ALL products found.
        For each product, return a JSON object with:
        - title: Product name
        - description: Detailed description
        - price: Price as a number (if found, else null)
        - sku: SKU or identifier (if found, else null)
        - tags: List of relevant category tags
        
        Return the response as a JSON list of objects.
        """
        
        # Gemini 1.5 Flash is efficient for document processing
        response = client.models.generate_content(
            model="gemini-1.5-flash-001",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(file_uri=gcs_uri, mime_type=event.data.content_type),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                # JSON schema validation could be added here for stricter output
            )
        )
        
        try:
            products_data = json.loads(response.text)
            if isinstance(products_data, dict):
                 # Handle case where model returns {"products": [...]}
                 products_data = products_data.get("products", [])
        except json.JSONDecodeError:
            print(f"Failed to parse JSON response: {response.text}")
            return

        print(f"Extracted {len(products_data)} products.")

        # 2. Generate Embeddings & Store in Firestore
        batch = db.batch()
        
        for product in products_data:
            # Generate text embedding for semantic search
            # Combine title, description, and tags for rich context
            text_to_embed = f"{product.get('title', '')} {product.get('description', '')} {' '.join(product.get('tags', []))}"
            
            embedding_resp = client.models.embed_content(
                model="text-embedding-004",
                contents=text_to_embed
            )
            embedding_vector = embedding_resp.embeddings[0].values
            
            # Create Document Ref
            doc_ref = db.collection("products").document()
            
            product_doc = {
                "title": product.get("title"),
                "description": product.get("description"),
                "price": product.get("price"),
                "sku": product.get("sku"),
                "tags": product.get("tags", []),
                # Vector Field for Firestore Vector Search
                "embedding_field": firestore.Vector(embedding_vector), 
                "source_file": file_path,
                "created_at": firestore.SERVER_TIMESTAMP,
                "status": "active" # Ready for sale
            }
            
            batch.set(doc_ref, product_doc)
            
            # Batch commit limit is 500
            if len(batch) >= 400:
                batch.commit()
                batch = db.batch()
        
        if len(batch) > 0:
            batch.commit()

        print("Catalogue processing complete.")
