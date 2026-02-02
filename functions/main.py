from firebase_functions import https_fn, options
from firebase_admin import initialize_app
import os
import json

# Initialize app first
initialize_app()

# --- Optional Imports & Configuration ---
# We wrap imports in try-except to allow the functions to load even if dependencies (like AI modules) are missing.

# AI Modules
try:
    from ai.catalogue import process_catalogue_upload
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("Warning: AI modules not found. AI features will be disabled.")

try:
    from ai.chat import chat_assistant
    CHAT_AVAILABLE = True
except ImportError:
    CHAT_AVAILABLE = False

# Payment Modules
try:
    from payments.payment_service import PaymentService, PaymentProvider
    from webhooks.handlers import handle_stripe_event, handle_viva_webhook_logic, handle_everypay_webhook_logic
    import stripe
    PAYMENTS_AVAILABLE = True
except ImportError:
    PAYMENTS_AVAILABLE = False
    print("Warning: Payment modules or dependencies missing.")

# --- Health Check ---
@https_fn.on_call(
    region="europe-west1",
    memory=options.MemoryOption.MB_256,
)
def health_check(req: https_fn.CallableRequest) -> dict:
    return {
        "status": "ok",
        "message": "Cloud Functions are operational",
        "version": "1.2.0",
        "features": {
            "ai": AI_AVAILABLE,
            "payments": PAYMENTS_AVAILABLE
        }
    }

# --- Payment Creation ---
# Defines the secrets required. If a secret is missing in Firebase, the deployment might succeed 
# but accessing it will fail or return None. We handle that inside.
@https_fn.on_call(
    region="europe-west1",
    secrets=["VIVA_CLIENT_ID", "VIVA_CLIENT_SECRET", "STRIPE_SECRET_KEY", "EVERYPAY_SECRET_KEY"]
)
def create_payment_order(req: https_fn.CallableRequest) -> dict:
    """Creates a payment intent/order with the selected provider."""
    if not PAYMENTS_AVAILABLE:
         return {"success": False, "error": "Payment modules not loaded on server."}

    data = req.data
    provider_str = data.get("provider")
    amount = data.get("amount") # in cents
    order_id = data.get("orderId")
    email = data.get("email")
    description = data.get("description", f"Order {order_id}")
    success_url = data.get("successUrl")
    failure_url = data.get("failureUrl")
    
    try:
        service = PaymentService()
        provider = PaymentProvider(provider_str)

        # Check if the specific provider's secrets are actually available before attempting
        # This prevents obscure errors if someone only set up Stripe but tries Viva.
        # (The PaymentService usually does this, but we can double check here or just let it fail gracefully)
        
        # Async run in sync context (Firebase Functions are sync by default in Python unless async def)
        # However, our clients use httpx async. We need to run them.
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            service.create_payment(
                provider=provider,
                amount_cents=amount,
                order_id=order_id,
                customer_email=email,
                description=description,
                success_url=success_url,
                failure_url=failure_url
            )
        )
        
        if result.success:
            return {
                "success": True,
                "checkoutUrl": result.checkout_url,
                "paymentId": result.payment_id,
                "clientSecret": result.client_secret
            }
        else:
             return {"success": False, "error": result.error}
             
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Webhooks ---

@https_fn.on_request(
    region="europe-west1",
    secrets=["STRIPE_WEBHOOK_SECRET"]
)
def stripe_webhook(req: https_fn.Request) -> https_fn.Response:
    if not PAYMENTS_AVAILABLE:
        return https_fn.Response("Payments disabled", status=503)

    sig_header = req.headers.get('stripe-signature')
    payload = req.get_data(as_text=True)
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

    if not webhook_secret:
         return https_fn.Response("Stripe Webhook Secret not configured", status=500)

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        handle_stripe_event(event)
        return https_fn.Response("Success", status=200)
    except ValueError as e:
        return https_fn.Response("Invalid payload", status=400)
    except stripe.error.SignatureVerificationError as e:
        return https_fn.Response("Invalid signature", status=400)

@https_fn.on_request(region="europe-west1")
def viva_webhook(req: https_fn.Request) -> https_fn.Response:
    if not PAYMENTS_AVAILABLE:
        return https_fn.Response("Payments disabled", status=503)

    # Viva sends a GET for verification sometimes, but mainly POST for notifications
    if req.method == 'GET':
        verification_token = req.args.get('t')
        return https_fn.Response(json.dumps({"Key": verification_token}), mimetype='application/json')
        
    data = req.get_json()
    handle_viva_webhook_logic(data)
    return https_fn.Response("OK", status=200)

@https_fn.on_request(region="europe-west1")
def everypay_webhook(req: https_fn.Request) -> https_fn.Response:
    if not PAYMENTS_AVAILABLE:
        return https_fn.Response("Payments disabled", status=503)

    data = req.get_json()
    handle_everypay_webhook_logic(data)
    return https_fn.Response("OK", status=200)
