from firebase_functions import https_fn, options
from firebase_admin import initialize_app
import os
import json

# Initialize app first
try:
    initialize_app()
except ValueError:
    pass

# Auth Triggers
try:
    from auth.user_triggers import create_user_document
except ImportError:
    print("Warning: Auth triggers not found.")

# AI Modules
try:
    from ai.catalogue import process_catalogue_upload
    from ai.agent import suggest_bundles
    AI_AVAILABLE = True
except ImportError as e:
    AI_AVAILABLE = False
    print(f"Warning: AI modules not found. AI features will be disabled. Error: {e}")

try:
    from ai.chat import chat_assistant
    CHAT_AVAILABLE = True
except ImportError:
    CHAT_AVAILABLE = False

# Payment Modules (REMOVED)
# User opted for Shopify Native Checkout + AADE Webhook

# --- Health Check ---
@https_fn.on_call(
    region="europe-west1",
    memory=options.MemoryOption.MB_256,
)
def health_check(req: https_fn.CallableRequest) -> dict:
    return {
        "status": "ok",
        "message": "Cloud Functions are operational",
        "version": "1.3.0",
        "features": {
            "ai": AI_AVAILABLE,
            "payments": False # Disabled
        }
    }

@https_fn.on_request(region="europe-west1")
def shopify_order_paid(req: https_fn.Request) -> https_fn.Response:
    """
    Webhook for Shopify 'orders/paid' event.
    Triggers AADE invoice transmission.
    """
    # 1. Verify HMAC (Security)
    # We should verify X-Shopify-Hmac-Sha256 header using SHOPIFY_WEBHOOK_SECRET
    # For MVP/Dev, we'll skip strict verification but print a warning if secret missing.
    
    import hmac
    import hashlib
    import base64
    
    secret = os.environ.get('SHOPIFY_WEBHOOK_SECRET')
    if not secret:
        print("Warning: SHOPIFY_WEBHOOK_SECRET not set. Skipping verification.")
    else:
        hmac_header = req.headers.get('X-Shopify-Hmac-Sha256')
        if not hmac_header:
            return https_fn.Response("Missing HMAC header", status=401)
            
        digest = hmac.new(
            secret.encode('utf-8'),
            req.get_data(),
            hashlib.sha256
        ).digest()
        computed_hmac = base64.b64encode(digest).decode('utf-8')
        
        if not hmac.compare_digest(computed_hmac, hmac_header):
            return https_fn.Response("Invalid HMAC signature", status=401)
    
    try:
        from webhooks.shopify import handle_order_paid
        data = req.get_json()
        
        # Run logic (sync for now, or use background task if supported)
        handle_order_paid(data)
        
        return https_fn.Response("OK", status=200)
    except Exception as e:
        print(f"Error in shopify_order_paid: {e}")
        return https_fn.Response("Internal Error", status=500)
